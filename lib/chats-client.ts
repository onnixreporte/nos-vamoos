import type { DateFilter } from "@/lib/date-filters";
import { buildTestTypificationChatIds } from "@/lib/dashboard-filters";
import { isTestChat } from "@/lib/test-contacts";
import type {
  AgentMetricsItem,
  AgentMetricsPage,
  ChatWithMessagesResponse,
  ChatsPage,
} from "@/types/botmaker";

const MAX_PAGES = 200;

async function fetchChatsList(
  range: DateFilter,
  signal: AbortSignal,
): Promise<ChatWithMessagesResponse[]> {
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  if (range.longTerm) params.set("long-term-search", "true");
  let url: string | null = `/api/chats?${params.toString()}`;
  const acc: ChatWithMessagesResponse[] = [];
  let pages = 0;
  while (url && pages < MAX_PAGES) {
    pages++;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `Error ${res.status}`);
    }
    const page = (await res.json()) as ChatsPage;
    if (page.items?.length) acc.push(...page.items);
    url = page.nextPage
      ? `/api/chats?nextPage=${encodeURIComponent(page.nextPage)}`
      : null;
  }
  return acc;
}

async function fetchAgentMetrics(
  range: DateFilter,
  status: "open" | "closed",
  signal: AbortSignal,
): Promise<AgentMetricsItem[]> {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    "session-status": status,
  });
  let url: string | null = `/api/agent-metrics?${params.toString()}`;
  const acc: AgentMetricsItem[] = [];
  let pages = 0;
  while (url && pages < MAX_PAGES) {
    pages++;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const page = (await res.json()) as AgentMetricsPage;
    if (page.items?.length) acc.push(...page.items);
    url = page.nextPage
      ? `/api/agent-metrics?nextPage=${encodeURIComponent(page.nextPage)}`
      : null;
  }
  return acc;
}

async function fetchMissingChats(
  missingChatIds: string[],
  signal: AbortSignal,
): Promise<ChatWithMessagesResponse[]> {
  const CONCURRENCY = 5;
  const results: ChatWithMessagesResponse[] = [];
  for (let i = 0; i < missingChatIds.length; i += CONCURRENCY) {
    if (signal.aborted) break;
    const batch = missingChatIds.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (chatId) => {
        const res = await fetch(`/api/chats/${chatId}`, { signal });
        if (!res.ok) return null;
        return res.json() as Promise<ChatWithMessagesResponse>;
      }),
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }
  return results;
}

/**
 * Keep chat only if its user-activity timestamp falls within the range.
 * Uses lastUserMessageDatetime as primary signal (last message from client),
 * falls back to creationTime for brand-new chats without user messages yet.
 * Drops chats whose timestamp is missing or outside the range so KPIs and
 * charts stay coherent across the dashboard.
 */
export function isChatInRange(
  chat: ChatWithMessagesResponse,
  fromIso: string,
  toIso: string,
): boolean {
  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  const raw = chat.lastUserMessageDatetime ?? chat.creationTime;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= fromMs && t <= toMs;
}

/**
 * Fetch chats matching what /dashboard's "Total Contactos" KPI counts:
 * - chats listados por /api/chats
 * - gap-fill: chats faltantes presentes en agent-metrics
 * - excluye test contacts y test typifications
 * - excluye chats cuyo último mensaje del cliente cae fuera del rango filtrado
 *   (coherencia con chart "Conversaciones en el tiempo")
 */
export async function fetchAllChatsWithGapFill(
  range: DateFilter,
  signal: AbortSignal,
): Promise<ChatWithMessagesResponse[]> {
  const [chatList, openItems, closedItems] = await Promise.all([
    fetchChatsList(range, signal),
    fetchAgentMetrics(range, "open", signal),
    fetchAgentMetrics(range, "closed", signal),
  ]);
  const allAgentItems = [...closedItems, ...openItems];
  const existingIds = new Set(chatList.map((c) => c.chat.chatId));
  const missingIds = [
    ...new Set(
      allAgentItems.map((i) => i.chatId).filter((id): id is string => !!id),
    ),
  ].filter((id) => !existingIds.has(id));
  let finalChats = chatList.filter((c) => !isTestChat(c));
  if (missingIds.length > 0) {
    const extra = await fetchMissingChats(missingIds, signal);
    finalChats = [...finalChats, ...extra.filter((c) => !isTestChat(c))];
  }
  const testTypIds = buildTestTypificationChatIds(allAgentItems);
  if (testTypIds.size > 0) {
    finalChats = finalChats.filter((c) => !testTypIds.has(c.chat.chatId));
  }
  finalChats = finalChats.filter((c) => isChatInRange(c, range.from, range.to));
  return finalChats;
}
