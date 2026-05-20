"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { SalesKpiCards } from "@/components/ventas/sales-kpi-cards";
import { SalesTable } from "@/components/ventas/sales-table";
import { LabelCountTable } from "@/components/ventas/label-count-table";
import { TopSalesAgentsBarChart } from "@/components/charts/top-sales-agents-bar-chart";
import { TopSoldDestinationsBarChart } from "@/components/charts/top-sold-destinations-bar-chart";
import { SalesAreaChart } from "@/components/charts/sales-area-chart";
import { DateFilterBar } from "@/components/filters/date-filter-bar";
import { useRefreshContext } from "@/store/refresh-context";
import {
  computeSalesKpis,
  countByTypification,
  countByTag,
  topAgentsBySales,
  topSoldDestinations,
  groupSalesByTime,
  countSalesByPackageType,
} from "@/lib/sales-aggregation";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";
import { usePersistedFilter } from "@/hooks/use-persisted-filter";
import { getCachedPageData, setCachedPageData, invalidatePageData } from "@/lib/page-data-cache";
import {
  buildAdditionalFilterOptions,
  buildChatMetadataMaps,
  buildTestTypificationChatIds,
  chatMatchesAdditionalFilters,
  DEFAULT_ADDITIONAL_FILTERS,
  EXCLUDED_AGENT_NAMES,
} from "@/lib/dashboard-filters";
import { aggregateByAgent } from "@/lib/agent-aggregation";
import { isTestChat } from "@/lib/test-contacts";
import type {
  AgentMetricsItem,
  AgentMetricsPage,
  ChatWithMessagesResponse,
  ChatsPage,
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

function isSameDay(from: string, to: string): boolean {
  return new Date(from).toDateString() === new Date(to).toDateString();
}

export default function VentasPage() {
  const [chats, setChats] = useState<ChatWithMessagesResponse[]>([]);
  const [agentItems, setAgentItems] = useState<AgentMetricsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = usePersistedFilter("filter:ventas", "week");
  const [debouncedFilter, setDebouncedFilter] = useState<DateFilter | null>(appliedFilter);
  const [additionalFilters, setAdditionalFilters] = useState(
    DEFAULT_ADDITIONAL_FILTERS,
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const lastRefreshRef = useRef(0);

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
      setAgentItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const MAX_PAGES = 200;

    const fetchAllChats = async (): Promise<ChatWithMessagesResponse[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("from", debouncedFilter.from);
      searchParams.set("to", debouncedFilter.to);
      if (debouncedFilter.longTerm) searchParams.set("long-term-search", "true");
      let url: string | null = `/api/chats?${searchParams.toString()}`;
      const acc: ChatWithMessagesResponse[] = [];
      let pageCount = 0;
      while (url && pageCount < MAX_PAGES) {
        pageCount++;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Error ${res.status}`);
        }
        const page = (await res.json()) as ChatsPage;
        if (cancelled) return acc;
        if (page.items?.length) {
          acc.push(...page.items);
          console.log(`[ventas] page ${pageCount}: +${page.items.length} chats (total: ${acc.length})`);
        }
        url = page.nextPage
          ? `/api/chats?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      console.log(`[ventas] fetch complete: ${acc.length} chats in ${pageCount} pages`);
      return acc;
    };

    const fetchAllAgentMetrics = async (
      status: string,
    ): Promise<AgentMetricsItem[]> => {
      const params = new URLSearchParams({
        from: debouncedFilter.from,
        to: debouncedFilter.to,
        "session-status": status,
      });
      let url: string | null = `/api/agent-metrics?${params.toString()}`;
      const acc: AgentMetricsItem[] = [];
      let pageCount = 0;
      while (url && pageCount < MAX_PAGES) {
        pageCount++;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const page = (await res.json()) as AgentMetricsPage;
        if (cancelled) return acc;
        if (page.items?.length) acc.push(...page.items);
        url = page.nextPage
          ? `/api/agent-metrics?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    (async () => {
      try {
        // Check cache first (skip on manual refresh)
        const isRefresh = lastRefreshRef.current !== refreshTrigger && refreshTrigger > 0;
        lastRefreshRef.current = refreshTrigger;

        if (!isRefresh) {
          const cached = getCachedPageData<{ chats: ChatWithMessagesResponse[]; agentItems: AgentMetricsItem[] }>(
            "ventas",
            debouncedFilter.from,
            debouncedFilter.to,
            debouncedFilter.longTerm,
          );
          if (cached) {
            setChats(cached.chats);
            setAgentItems(cached.agentItems);
            setLoading(false);
            return;
          }
        }

        const chatList = await fetchAllChats();
        if (cancelled) return;
        const openItems = await fetchAllAgentMetrics("open");
        if (cancelled) return;
        const closedItems = await fetchAllAgentMetrics("closed");
        if (cancelled) return;
        const allAgentItems = [...closedItems, ...openItems];

        // Gap-fill: buscar chatIds en agent-metrics que no estén en chatList
        const existingIds = new Set(chatList.map((c) => c.chat.chatId));
        const missingIds = [
          ...new Set(allAgentItems.map((i) => i.chatId).filter((id): id is string => !!id)),
        ].filter((id) => !existingIds.has(id));

        let finalChats = chatList.filter((c) => !isTestChat(c));
        if (missingIds.length > 0) {
          const extra = await fetchMissingChats(missingIds, controller.signal);
          if (!cancelled) finalChats = [...finalChats, ...extra.filter((c) => !isTestChat(c))];
        }
        if (cancelled) return;

        setCachedPageData("ventas", debouncedFilter.from, debouncedFilter.to, debouncedFilter.longTerm, {
          chats: finalChats,
          agentItems: allAgentItems,
        });

        setChats(finalChats);
        setAgentItems(allAgentItems);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar datos",
          );
          setChats([]);
          setAgentItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedFilter?.from, debouncedFilter?.to, debouncedFilter?.longTerm, refreshTrigger]);

  const metadataMaps = useMemo(
    () => buildChatMetadataMaps(agentItems),
    [agentItems],
  );

  const filterOptions = useMemo(
    () => buildAdditionalFilterOptions(chats, agentItems),
    [chats, agentItems],
  );

  const testTypificationChatIds = useMemo(
    () => buildTestTypificationChatIds(agentItems),
    [agentItems],
  );

  const filteredChats = useMemo(
    () =>
      chats.filter(
        (chat) =>
          !testTypificationChatIds.has(chat.chat.chatId) &&
          chatMatchesAdditionalFilters(chat, additionalFilters, metadataMaps),
      ),
    [chats, additionalFilters, metadataMaps, testTypificationChatIds],
  );

  const filteredChatIds = useMemo(
    () => new Set(filteredChats.map((chat) => chat.chat.chatId)),
    [filteredChats],
  );

  const filteredAgentItems = useMemo(
    () =>
      agentItems.filter(
        (item) => !!item.chatId && filteredChatIds.has(item.chatId),
      ),
    [agentItems, filteredChatIds],
  );

  const attendedConversations = useMemo(() => {
    const agentsAll = aggregateByAgent(agentItems).filter(
      (a) => !EXCLUDED_AGENT_NAMES.has(a.agentName.trim()),
    );
    return agentsAll.reduce(
      (s, a) => s + a.closedConversations + a.openConversations,
      0,
    );
  }, [agentItems]);

  const kpis = useMemo(
    () => computeSalesKpis(filteredChats, attendedConversations),
    [filteredChats, attendedConversations],
  );

  const timeGranularity = useMemo(() => {
    if (!appliedFilter?.from || !appliedFilter?.to) return "hour" as const;
    return isSameDay(appliedFilter.from, appliedFilter.to) ? "hour" as const : "day" as const;
  }, [appliedFilter?.from, appliedFilter?.to]);

  const typificationData = useMemo(
    () => countByTypification(filteredAgentItems),
    [filteredAgentItems],
  );
  const tagsData = useMemo(() => countByTag(filteredChats), [filteredChats]);
  const packageTypesSalesData = useMemo(
    () => countSalesByPackageType(filteredChats),
    [filteredChats],
  );
  const topAgents = useMemo(
    () => topAgentsBySales(filteredChats, filteredAgentItems, 8),
    [filteredChats, filteredAgentItems],
  );
  const topDestinations = useMemo(
    () => topSoldDestinations(filteredChats, 8),
    [filteredChats],
  );
  const salesTimeline = useMemo(
    () => groupSalesByTime(filteredChats, timeGranularity),
    [filteredChats, timeGranularity],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-pretty">Ventas</h1>
        <p className="text-sm text-muted-foreground">
          Analisis de ventas, conversion y rendimiento comercial.
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
          <span>Cargando datos...</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          <SalesKpiCards kpis={kpis} />

          <div className="grid gap-4 lg:grid-cols-3">
            <LabelCountTable
              title="Tipificaciones"
              subtitle="Distribución de tipificaciones de cierre"
              data={typificationData}
            />
            <LabelCountTable
              title="Etiquetas"
              subtitle="Etiquetas más frecuentes en conversaciones"
              data={tagsData}
            />
            <LabelCountTable
              title="Tipo de paquete"
              subtitle="Participación por tipo de paquete"
              data={packageTypesSalesData}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TopSalesAgentsBarChart data={topAgents} />
            <TopSoldDestinationsBarChart data={topDestinations} />
          </div>

          <SalesAreaChart data={salesTimeline} />

          <SalesTable chats={filteredChats} agentItems={filteredAgentItems} />
        </>
      )}
    </div>
  );
}
