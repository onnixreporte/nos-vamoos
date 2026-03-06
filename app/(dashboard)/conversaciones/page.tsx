"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ChatsTable } from "@/components/chats/chats-table";
import { DateFilterBar } from "@/components/filters/date-filter-bar";
import { useRefreshContext } from "@/store/refresh-context";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";
import {
  buildAdditionalFilterOptions,
  chatMatchesAdditionalFilters,
  DEFAULT_ADDITIONAL_FILTERS,
  isTestTypification,
  normalizeTypification,
} from "@/lib/dashboard-filters";
import { isTestChat } from "@/lib/test-contacts";
import type {
  AgentMetricsItem,
  AgentMetricsPage,
  ChatWithMessagesResponse,
  ChatsPage,
  MessagesPage,
} from "@/types/botmaker";

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

export default function ConversacionesPage() {
  const [data, setData] = useState<{
    items: ChatWithMessagesResponse[];
    nextPage: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [appliedFilter, setAppliedFilter] = useState<DateFilter | null>(() =>
    buildPresetRange("week"),
  );
  const [additionalFilters, setAdditionalFilters] = useState(
    DEFAULT_ADDITIONAL_FILTERS,
  );
  const [chatMetricsByChatId, setChatMetricsByChatId] = useState<
    Record<string, ConversationMetrics> | null
  >(null);
  const [botMessagesByChatId, setBotMessagesByChatId] = useState<
    Record<string, number>
  >({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { registerRefresh, unregisterRefresh } = useRefreshContext();
  useEffect(() => {
    registerRefresh(() => setRefreshTrigger((t) => t + 1));
    return unregisterRefresh;
  }, [registerRefresh, unregisterRefresh]);

  const fetchChats = useCallback(
    async (url?: string, filter?: DateFilter | null) => {
      const apiUrl = url
        ? `/api/chats?nextPage=${encodeURIComponent(url)}`
        : (() => {
            const searchParams = new URLSearchParams();
            if (filter?.from) searchParams.set("from", filter.from);
            if (filter?.to) searchParams.set("to", filter.to);
            if (filter?.longTerm)
              searchParams.set("long-term-search", "true");
            const qs = searchParams.toString();
            return qs ? `/api/chats?${qs}` : "/api/chats";
          })();

      const res = await fetch(apiUrl);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      return res.json() as Promise<ChatsPage>;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChats(undefined, appliedFilter)
      .then((page) => {
        if (!cancelled) {
          const nonTestItems = (page.items ?? []).filter((chat) => !isTestChat(chat));
          setData({
            items: nonTestItems,
            nextPage: page.nextPage ?? null,
          });
          setBotMessagesByChatId({});
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar chats"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchChats, appliedFilter, refreshTrigger]);

  useEffect(() => {
    if (!appliedFilter?.from || !appliedFilter?.to) {
      setChatMetricsByChatId(null);
      return;
    }
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

    const fetchAllPages = async (
      status: string,
      acc: MetricsAccumulator,
    ): Promise<MetricsAccumulator> => {
      const params = new URLSearchParams({
        from: appliedFilter.from,
        to: appliedFilter.to,
        "session-status": status,
      });
      let url: string | null = `/api/agent-metrics?${params.toString()}`;
      while (url) {
        const res = await fetch(url);
        if (!res.ok) break;
        const page = (await res.json()) as AgentMetricsPage;
        if (cancelled) return acc;
        for (const item of page.items ?? []) {
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
        url = page.nextPage
          ? `/api/agent-metrics?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    (async () => {
      try {
        const map: MetricsAccumulator = {};
        await Promise.all([
          fetchAllPages("open", map),
          fetchAllPages("closed", map),
        ]);
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
    };
  }, [appliedFilter?.from, appliedFilter?.to, refreshTrigger]);

  const fetchBotMessagesCount = useCallback(
    async (chatId: string): Promise<number> => {
      if (!appliedFilter?.from || !appliedFilter?.to) return 0;

      const params = new URLSearchParams({
        from: appliedFilter.from,
        to: appliedFilter.to,
        "chat-id": chatId,
      });
      if (appliedFilter.longTerm) {
        params.set("long-term-search", "true");
      }

      let url: string | null = `/api/messages?${params.toString()}`;
      let botCount = 0;

      while (url) {
        const res = await fetch(url);
        if (!res.ok) {
          return botCount;
        }
        const page = (await res.json()) as MessagesPage;
        for (const item of page.items ?? []) {
          if (item.from === "bot") botCount += 1;
        }
        url = page.nextPage
          ? `/api/messages?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }

      return botCount;
    },
    [appliedFilter?.from, appliedFilter?.to, appliedFilter?.longTerm],
  );

  useEffect(() => {
    if (!data?.items?.length) return;
    let cancelled = false;
    const chatIds = Array.from(new Set(data.items.map((item) => item.chat.chatId)));
    const missingChatIds = chatIds.filter(
      (chatId) => botMessagesByChatId[chatId] == null,
    );
    if (missingChatIds.length === 0) return;

    (async () => {
      for (const chatId of missingChatIds) {
        if (cancelled) return;
        const count = await fetchBotMessagesCount(chatId);
        if (cancelled) return;
        setBotMessagesByChatId((prev) => ({ ...prev, [chatId]: count }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.items, botMessagesByChatId, fetchBotMessagesCount]);

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
    () => buildAdditionalFilterOptions(data?.items ?? [], pseudoAgentItems),
    [data?.items, pseudoAgentItems],
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
    const items = data?.items ?? [];
    return items.filter((chat) => {
      const typ = combinedMetricsByChatId[chat.chat.chatId]?.typification;
      if (typ && isTestTypification(typ)) return false;
      return chatMatchesAdditionalFilters(chat, additionalFilters, metadataMaps);
    });
  }, [data?.items, additionalFilters, metadataMaps, combinedMetricsByChatId]);

  const handleLoadMore = useCallback(
    async (nextPageUrl: string) => {
      setLoadingMore(true);
      try {
        const page = await fetchChats(nextPageUrl);
        const nonTestItems = (page.items ?? []).filter((chat) => !isTestChat(chat));
        setData((prev) => ({
          items: prev
            ? [...prev.items, ...nonTestItems]
            : nonTestItems,
          nextPage: page.nextPage ?? null,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar más chats"
        );
      } finally {
        setLoadingMore(false);
      }
    },
    [fetchChats]
  );

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
      ) : data ? (
        <ChatsTable
          items={filteredItems}
          nextPage={data.nextPage}
          onLoadMore={handleLoadMore}
          isLoadingMore={loadingMore}
          chatMetricsByChatId={combinedMetricsByChatId}
        />
      ) : null}
    </div>
  );
}
