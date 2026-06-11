/**
 * Datos para el reporte diario en PDF.
 *
 * Replica los cómputos de KPIs de /dashboard y /ventas (ver memoria de
 * KPI alignment): métricas de agentes desde agentItems crudos excluyendo
 * EXCLUDED_AGENT_NAMES; chats filtrados por test contacts y tipificaciones
 * de prueba.
 */
import {
  BOTMAKER_AGENT_METRICS_URL,
  BOTMAKER_CHATS_URL,
  dedupeAgentMetrics,
  dedupeChats,
  fetchAllBotmakerItems,
} from "@/lib/botmaker-server";
import { TZDate } from "@date-fns/tz";
import { PY_TZ, buildPresetRange, formatForApi, type DateFilter } from "@/lib/date-filters";
import {
  EXCLUDED_AGENT_NAMES,
  buildTestTypificationChatIds,
} from "@/lib/dashboard-filters";
import { isTestChat } from "@/lib/test-contacts";
import { isChatInRange } from "@/lib/chats-client";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { aggregateByAgent } from "@/lib/agent-aggregation";
import {
  computeSalesKpis,
  topAgentsBySales,
  type AgentSalesCount,
} from "@/lib/sales-aggregation";
import {
  buildInsightsUrl,
  fetchAllInsights,
  readMetaEnv,
} from "@/lib/meta-server";
import { sumInsights, type MetaTotals } from "@/lib/meta-aggregation";
import type {
  AgentMetricsItem,
  ChatWithMessagesResponse,
} from "@/types/botmaker";

const BOTMAKER_SESSIONS_URL = "https://api.botmaker.com/v2.0/sessions";
const META_FIELDS =
  "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type";

export interface DailyReportData {
  /** Fecha del reporte (día anterior) en formato DD/MM/YYYY. */
  dateLabel: string;
  fromIso: string;
  toIso: string;
  totalContacts: number;
  totalSessions: number;
  attendedConversations: number;
  closedConversations: number;
  avgFirstResponseMs: number;
  totalSales: number;
  totalSalesAmount: number;
  conversionRateAttended: number;
  topAgents: AgentSalesCount[];
  /** null si Meta no está configurado o falló: el reporte sale igual. */
  meta: MetaTotals | null;
}

function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Gap-fill server-side: trae chats por id directo de Botmaker (lotes de 5). */
async function fetchChatsByIds(
  chatIds: string[],
  token: string,
): Promise<ChatWithMessagesResponse[]> {
  const CONCURRENCY = 5;
  const results: ChatWithMessagesResponse[] = [];
  for (let i = 0; i < chatIds.length; i += CONCURRENCY) {
    const batch = chatIds.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (chatId) => {
        const res = await fetchWithRetry(
          `https://api.botmaker.com/v2.0/chats/${chatId}`,
          {
            method: "GET",
            headers: { Accept: "application/json", "access-token": token },
            timeoutMs: 30_000,
          },
        );
        if (!res.ok) return null;
        return (await res.json()) as ChatWithMessagesResponse;
      }),
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }
  return results;
}

/** Día completo (00:00–23:59 Paraguay) para una fecha YYYY-MM-DD. */
function buildDayRange(dateKey: string): DateFilter {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) throw new Error(`Invalid date: ${dateKey} (expected YYYY-MM-DD)`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return {
    from: formatForApi(new TZDate(y, mo - 1, d, 0, 0, 0, 0, PY_TZ)),
    to: formatForApi(new TZDate(y, mo - 1, d, 23, 59, 59, 999, PY_TZ)),
    longTerm: true,
  };
}

/**
 * @param dateKey día a reportar (YYYY-MM-DD en hora Paraguay); default: ayer.
 */
export async function buildDailyReportData(
  dateKey?: string,
): Promise<DailyReportData> {
  const token = process.env.BOTMAKER_ACCESS_TOKEN;
  if (!token) throw new Error("BOTMAKER_ACCESS_TOKEN is not configured");

  const range = dateKey ? buildDayRange(dateKey) : buildPresetRange("yesterday");

  const chatsUrl = new URL(BOTMAKER_CHATS_URL);
  chatsUrl.searchParams.set("long-term-search", "true");

  const buildMetricsUrl = (status: "open" | "closed") => {
    const url = new URL(BOTMAKER_AGENT_METRICS_URL);
    url.searchParams.set("session-status", status);
    return url;
  };

  const sessionsUrl = new URL(BOTMAKER_SESSIONS_URL);
  sessionsUrl.searchParams.set("include-ai-analysis", "false");
  sessionsUrl.searchParams.set("include-events", "false");
  sessionsUrl.searchParams.set("include-messages", "false");
  sessionsUrl.searchParams.set("include-variables", "false");
  sessionsUrl.searchParams.set("include-open-sessions", "true");
  sessionsUrl.searchParams.set("timestamp-precision", "seconds");
  sessionsUrl.searchParams.set("long-term-search", "true");

  const fetchMeta = async (): Promise<MetaTotals | null> => {
    const env = readMetaEnv();
    if ("error" in env) return null;
    const url = buildInsightsUrl(env, range.from, range.to, {
      fields: META_FIELDS,
      level: "account",
    });
    const result = await fetchAllInsights(url);
    if (!result.ok) {
      console.error("[daily-report] Meta error:", result.status, result.details);
      return null;
    }
    return sumInsights(result.rows);
  };

  const [rawChats, openItems, closedItems, rawSessions, meta] =
    await Promise.all([
      fetchAllBotmakerItems({
        baseUrl: chatsUrl,
        token,
        from: range.from,
        to: range.to,
        label: "daily-report/chats",
      }),
      fetchAllBotmakerItems({
        baseUrl: buildMetricsUrl("open"),
        token,
        from: range.from,
        to: range.to,
        label: "daily-report/metrics-open",
      }),
      fetchAllBotmakerItems({
        baseUrl: buildMetricsUrl("closed"),
        token,
        from: range.from,
        to: range.to,
        label: "daily-report/metrics-closed",
      }),
      fetchAllBotmakerItems({
        baseUrl: sessionsUrl,
        token,
        from: range.from,
        to: range.to,
        label: "daily-report/sessions",
      }),
      fetchMeta(),
    ]);

  const chats = dedupeChats(rawChats) as ChatWithMessagesResponse[];
  const agentItems = dedupeAgentMetrics([
    ...closedItems,
    ...openItems,
  ]) as AgentMetricsItem[];

  const seenSessions = new Set<string>();
  const totalSessions = rawSessions.filter((it) => {
    const id = (it as { id?: string }).id;
    if (!id) return true;
    if (seenSessions.has(id)) return false;
    seenSessions.add(id);
    return true;
  }).length;

  // Mismo pipeline que fetchAllChatsWithGapFill + filteredChats de /dashboard:
  // gap-fill de chats presentes en agent-metrics pero ausentes del listado,
  // exclusión de test contacts/tipificaciones y recorte estricto por rango
  // (long-term-search devuelve chats con actividad fuera del rango pedido)
  const existingIds = new Set(chats.map((c) => c.chat.chatId));
  const missingIds = [
    ...new Set(
      agentItems.map((i) => i.chatId).filter((id): id is string => !!id),
    ),
  ].filter((id) => !existingIds.has(id));

  let finalChats = chats.filter((c) => !isTestChat(c));
  if (missingIds.length > 0) {
    const extra = await fetchChatsByIds(missingIds, token);
    finalChats = [...finalChats, ...extra.filter((c) => !isTestChat(c))];
  }

  const testTypificationChatIds = buildTestTypificationChatIds(agentItems);
  const filteredChats = finalChats.filter(
    (c) =>
      !testTypificationChatIds.has(c.chat.chatId) &&
      isChatInRange(c, range.from, range.to),
  );

  // Atendidas/cerradas desde agentItems crudos excluyendo agentes de sistema
  const agentsAll = aggregateByAgent(agentItems).filter(
    (a) => !EXCLUDED_AGENT_NAMES.has(a.agentName.trim()),
  );
  const attendedConversations = agentsAll.reduce(
    (s, a) => s + a.closedConversations + a.openConversations,
    0,
  );
  const closedConversations = agentsAll.reduce(
    (s, a) => s + a.closedConversations,
    0,
  );

  let firstResponseSumMs = 0;
  let firstResponseCount = 0;
  for (const item of agentItems) {
    if (EXCLUDED_AGENT_NAMES.has((item.agentName ?? "").trim())) continue;
    const ms = parseNum(item.fromOpAssignedToOpFirstResponse) * 1000;
    if (ms > 0) {
      firstResponseSumMs += ms;
      firstResponseCount += 1;
    }
  }
  const avgFirstResponseMs =
    firstResponseCount > 0 ? firstResponseSumMs / firstResponseCount : 0;

  const salesKpis = computeSalesKpis(filteredChats, attendedConversations);
  const topAgents = topAgentsBySales(filteredChats, agentItems, 5);

  const fromDate = new Date(range.from);
  const dateLabel = fromDate.toLocaleDateString("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    dateLabel,
    fromIso: range.from,
    toIso: range.to,
    totalContacts: filteredChats.length,
    totalSessions,
    attendedConversations,
    closedConversations,
    avgFirstResponseMs,
    totalSales: salesKpis.totalSales,
    totalSalesAmount: salesKpis.totalAmount,
    conversionRateAttended: salesKpis.conversionRateAttended,
    topAgents,
    meta,
  };
}
