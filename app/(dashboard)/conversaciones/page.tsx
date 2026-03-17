"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ChatsTable } from "@/components/chats/chats-table";
import { DateFilterBar } from "@/components/filters/date-filter-bar";
import { useRefreshContext } from "@/store/refresh-context";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";
import { usePersistedFilter } from "@/hooks/use-persisted-filter";
import {
  buildAdditionalFilterOptions,
  chatMatchesAdditionalFilters,
  DEFAULT_ADDITIONAL_FILTERS,
  isTestTypification,
  normalizeTypification,
} from "@/lib/dashboard-filters";
import type {
  AgentMetricsItem,
  AgentMetricsPage,
  ChatWithMessagesResponse,
  ChatsPage,
  MessagesPage,
} from "@/types/botmaker";

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

interface ConversationMetrics {
  agentName: string;
  typification: string;
  conversationCount: number;
  agentMessageCount: number;
  botMessageCount: number;
  avgAgentResponseMs: number;
  conversationLink?: string;
}

function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const MAX_PAGES = 200;

async function fetchAllChats(
  filter: DateFilter,
  signal: AbortSignal,
): Promise<ChatWithMessagesResponse[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("from", filter.from);
  searchParams.set("to", filter.to);
  if (filter.longTerm) searchParams.set("long-term-search", "true");

  let url: string | null = `/api/chats?${searchParams.toString()}`;
  const acc: ChatWithMessagesResponse[] = [];
  let pageCount = 0;

  while (url && pageCount < MAX_PAGES) {
    pageCount++;
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

export default function ConversacionesPage() {
  const [chats, setChats] = useState<ChatWithMessagesResponse[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const chatsRef = useRef<ChatWithMessagesResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appliedFilter, setAppliedFilter] = usePersistedFilter("filter:conversaciones", "week");
  const [debouncedFilter, setDebouncedFilter] = useState<DateFilter | null>(appliedFilter);
  const [additionalFilters, setAdditionalFilters] = useState(
    DEFAULT_ADDITIONAL_FILTERS,
  );
  const [chatMetricsByChatId, setChatMetricsByChatId] = useState<
    Record<string, ConversationMetrics> | null
  >(null);
  const [botMessagesByChatId, setBotMessagesByChatId] = useState<
    Record<string, number>
  >({});
  // Ref so the fetch effect can read the latest value without re-running on every update
  const botMessagesRef = useRef<Record<string, number>>({});
  useEffect(() => {
    botMessagesRef.current = botMessagesByChatId;
  }, [botMessagesByChatId]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { registerRefresh, unregisterRefresh } = useRefreshContext();
  useEffect(() => {
    registerRefresh(() => setRefreshTrigger((t) => t + 1));
    return unregisterRefresh;
  }, [registerRefresh, unregisterRefresh]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(appliedFilter), 400);
    return () => clearTimeout(t);
  }, [appliedFilter]);

  useEffect(() => {
    if (!debouncedFilter?.from || !debouncedFilter?.to) {
      setChats([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChatsLoaded(false);
    setBotMessagesByChatId({});

    (async () => {
      try {
        const all = await fetchAllChats(debouncedFilter, controller.signal);
        if (!cancelled) {
          chatsRef.current = all;
          setChats(all);
          setChatsLoaded(true);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Error al cargar chats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [debouncedFilter?.from, debouncedFilter?.to, debouncedFilter?.longTerm, refreshTrigger]);

  useEffect(() => {
    if (!debouncedFilter?.from || !debouncedFilter?.to) {
      setChatMetricsByChatId(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    type MetricsAccumulator = Record<
      string,
      {
        agentName: string;
        typification: string;
        conversationCount: number;
        agentMessageCount: number;
        responseSumMs: number;
        responseCount: number;
        conversationLink?: string;
      }
    >;

    const MAX_PAGES = 200;

    const fetchAllPages = async (
      status: string,
      acc: MetricsAccumulator,
    ): Promise<MetricsAccumulator> => {
      const params = new URLSearchParams({
        from: debouncedFilter.from,
        to: debouncedFilter.to,
        "session-status": status,
      });
      let url: string | null = `/api/agent-metrics?${params.toString()}`;
      let pageCount = 0;
      while (url && pageCount < MAX_PAGES) {
        pageCount++;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) break;
        const page = (await res.json()) as AgentMetricsPage;
        if (cancelled) return acc;
        if (page.items?.length) {
          for (const item of page.items) {
            if (item.chatId) {
              const prev = acc[item.chatId] ?? {
                agentName: "",
                typification: "",
                conversationCount: 1,
                agentMessageCount: 0,
                responseSumMs: 0,
                responseCount: 0,
                conversationLink: "",
              };
              const responseMs =
                parseNum(item.fromOpAssignedToOpFirstResponse) ||
                parseNum(item.avgResponseTime);

              acc[item.chatId] = {
                agentName: item.agentName?.trim() || prev.agentName,
                typification: item.typification?.trim()
                  ? normalizeTypification(item.typification.trim())
                  : prev.typification,
                conversationCount: 1,
                agentMessageCount:
                  prev.agentMessageCount + parseNum(item.operatorResponses),
                responseSumMs: prev.responseSumMs + (responseMs > 0 ? responseMs : 0),
                responseCount: prev.responseCount + (responseMs > 0 ? 1 : 0),
                conversationLink:
                  (typeof item.conversationLink === "string"
                    ? item.conversationLink.trim()
                    : "") || prev.conversationLink,
              };
            }
          }
        }
        url = page.nextPage
          ? `/api/agent-metrics?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    (async () => {
      try {
        const map: MetricsAccumulator = {};
        await fetchAllPages("open", map);
        if (cancelled) return;
        await fetchAllPages("closed", map);
        if (!cancelled) {
          const normalized: Record<string, ConversationMetrics> = {};
          for (const [chatId, metrics] of Object.entries(map)) {
            normalized[chatId] = {
              agentName: metrics.agentName,
              typification: metrics.typification,
              conversationCount: metrics.conversationCount,
              agentMessageCount: metrics.agentMessageCount,
              botMessageCount: 0,
              avgAgentResponseMs:
                metrics.responseCount > 0
                  ? metrics.responseSumMs / metrics.responseCount
                  : 0,
              conversationLink: metrics.conversationLink,
            };
          }
          setChatMetricsByChatId(normalized);
        }
      } catch {
        if (!cancelled) setChatMetricsByChatId(null);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedFilter?.from, debouncedFilter?.to, refreshTrigger]);

  // Gap-fill: fetch individual chats that are in agent-metrics but missing from /chats
  useEffect(() => {
    if (!chatsLoaded || !chatMetricsByChatId) return;

    const existingIds = new Set(chatsRef.current.map((c) => c.chat.chatId));
    const missingIds = Object.keys(chatMetricsByChatId).filter(
      (id) => !existingIds.has(id),
    );
    if (missingIds.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const extra = await fetchMissingChats(missingIds, controller.signal);
        if (!cancelled && extra.length > 0) {
          const merged = [...chatsRef.current, ...extra];
          chatsRef.current = merged;
          setChats(merged);
        }
      } catch {
        // silencioso — los chats del /chats endpoint ya se muestran
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [chatsLoaded, chatMetricsByChatId]);

  const fetchBotMessagesCount = useCallback(
    async (chatId: string, signal?: AbortSignal): Promise<number> => {
      if (!debouncedFilter?.from || !debouncedFilter?.to) return 0;

      const MAX_PAGES = 200;
      const params = new URLSearchParams({
        from: debouncedFilter.from,
        to: debouncedFilter.to,
        "chat-id": chatId,
      });
      if (debouncedFilter.longTerm) {
        params.set("long-term-search", "true");
      }

      let url: string | null = `/api/messages?${params.toString()}`;
      let botCount = 0;
      let pageCount = 0;

      while (url && pageCount < MAX_PAGES) {
        pageCount++;
        const res = await fetch(url, { signal });
        if (!res.ok) {
          return botCount;
        }
        const page = (await res.json()) as MessagesPage;
        if (page.items?.length) {
          for (const item of page.items) {
            if (item.from === "bot") botCount += 1;
          }
        }
        url = page.nextPage
          ? `/api/messages?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }

      return botCount;
    },
    [debouncedFilter?.from, debouncedFilter?.to, debouncedFilter?.longTerm],
  );

  useEffect(() => {
    if (!chats.length) return;
    const controller = new AbortController();
    let cancelled = false;
    const chatIds = Array.from(new Set(chats.map((item) => item.chat.chatId)));
    // Read via ref so this effect doesn't re-run every time a count is stored
    const missingChatIds = chatIds.filter(
      (chatId) => botMessagesRef.current[chatId] == null,
    );
    if (missingChatIds.length === 0) return;

    (async () => {
      try {
        for (const chatId of missingChatIds) {
          if (cancelled) return;
          const count = await fetchBotMessagesCount(chatId, controller.signal);
          if (cancelled) return;
          setBotMessagesByChatId((prev) => ({ ...prev, [chatId]: count }));
        }
      } catch (err) {
        // AbortError is expected when the filter changes or component unmounts
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[conversaciones] fetchBotMessages error:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [chats, fetchBotMessagesCount]);

  const combinedMetricsByChatId = useMemo(() => {
    const combined: Record<string, ConversationMetrics> = {
      ...(chatMetricsByChatId ?? {}),
    };

    for (const [chatId, botCount] of Object.entries(botMessagesByChatId)) {
      const prev = combined[chatId] ?? {
        agentName: "",
        typification: "",
        conversationCount: 1,
        agentMessageCount: 0,
        botMessageCount: 0,
        avgAgentResponseMs: 0,
        conversationLink: "",
      };
      combined[chatId] = {
        ...prev,
        botMessageCount: botCount,
      };
    }

    return combined;
  }, [chatMetricsByChatId, botMessagesByChatId]);

  const pseudoAgentItems = useMemo(
    () =>
      Object.entries(combinedMetricsByChatId).map(([chatId, metrics]) => {
        return {
          chatId,
          agentName: metrics.agentName,
          typification: metrics.typification,
        } as AgentMetricsItem;
      }),
    [combinedMetricsByChatId],
  );

  const filterOptions = useMemo(
    () => buildAdditionalFilterOptions(chats, pseudoAgentItems),
    [chats, pseudoAgentItems],
  );

  const metadataMaps = useMemo(() => {
    const agentNameByChatId = new Map<string, string>();
    const typificationByChatId = new Map<string, string>();
    for (const [chatId, metrics] of Object.entries(combinedMetricsByChatId)) {
      if (metrics.agentName) agentNameByChatId.set(chatId, metrics.agentName);
      if (metrics.typification) typificationByChatId.set(chatId, metrics.typification);
    }
    return { agentNameByChatId, typificationByChatId };
  }, [combinedMetricsByChatId]);

  const filteredItems = useMemo(() => {
    return chats.filter((chat) => {
      const typ = combinedMetricsByChatId[chat.chat.chatId]?.typification;
      if (typ && isTestTypification(typ)) return false;
      return chatMatchesAdditionalFilters(chat, additionalFilters, metadataMaps);
    });
  }, [chats, additionalFilters, metadataMaps, combinedMetricsByChatId]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-pretty">Conversaciones</h1>
        <p className="text-sm text-muted-foreground">
          Consulta y filtra las conversaciones de tus clientes.
        </p>
      </div>

      <DateFilterBar
        appliedFilter={appliedFilter}
        onFilterChange={setAppliedFilter}
        defaultPreset="week"
        additionalFilters={additionalFilters}
        onAdditionalFiltersChange={setAdditionalFilters}
        additionalFilterOptions={filterOptions}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Cargando chats…</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <ChatsTable
          items={filteredItems}
          chatMetricsByChatId={combinedMetricsByChatId}
        />
      )}
    </div>
  );
}
