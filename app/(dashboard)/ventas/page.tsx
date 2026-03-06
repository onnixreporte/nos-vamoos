"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  buildAdditionalFilterOptions,
  buildChatMetadataMaps,
  buildTestTypificationChatIds,
  chatMatchesAdditionalFilters,
  DEFAULT_ADDITIONAL_FILTERS,
} from "@/lib/dashboard-filters";
import { isTestChat } from "@/lib/test-contacts";
import type {
  AgentMetricsItem,
  AgentMetricsPage,
  ChatWithMessagesResponse,
  ChatsPage,
} from "@/types/botmaker";

function isSameDay(from: string, to: string): boolean {
  return new Date(from).toDateString() === new Date(to).toDateString();
}

export default function VentasPage() {
  const [chats, setChats] = useState<ChatWithMessagesResponse[]>([]);
  const [agentItems, setAgentItems] = useState<AgentMetricsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<DateFilter | null>(() =>
    buildPresetRange("week"),
  );
  const [additionalFilters, setAdditionalFilters] = useState(
    DEFAULT_ADDITIONAL_FILTERS,
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { registerRefresh, unregisterRefresh } = useRefreshContext();
  useEffect(() => {
    registerRefresh(() => setRefreshTrigger((t) => t + 1));
    return unregisterRefresh;
  }, [registerRefresh, unregisterRefresh]);

  useEffect(() => {
    if (!appliedFilter?.from || !appliedFilter?.to) {
      setChats([]);
      setAgentItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchAllChats = async (): Promise<ChatWithMessagesResponse[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("from", appliedFilter.from);
      searchParams.set("to", appliedFilter.to);
      if (appliedFilter.longTerm) searchParams.set("long-term-search", "true");
      let url: string | null = `/api/chats?${searchParams.toString()}`;
      const acc: ChatWithMessagesResponse[] = [];
      while (url) {
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Error ${res.status}`);
        }
        const page = (await res.json()) as ChatsPage;
        if (cancelled) return acc;
        acc.push(...(page.items ?? []));
        url = page.nextPage
          ? `/api/chats?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    const fetchAllAgentMetrics = async (
      status: string,
    ): Promise<AgentMetricsItem[]> => {
      const params = new URLSearchParams({
        from: appliedFilter.from,
        to: appliedFilter.to,
        "session-status": status,
      });
      let url: string | null = `/api/agent-metrics?${params.toString()}`;
      const acc: AgentMetricsItem[] = [];
      while (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const page = (await res.json()) as AgentMetricsPage;
        if (cancelled) return acc;
        acc.push(...(page.items ?? []));
        url = page.nextPage
          ? `/api/agent-metrics?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    (async () => {
      try {
        const [chatList, openItems, closedItems] = await Promise.all([
          fetchAllChats(),
          fetchAllAgentMetrics("open"),
          fetchAllAgentMetrics("closed"),
        ]);
        if (cancelled) return;
        const allAgentItems = [...closedItems, ...openItems];
        const testChatIds = buildTestTypificationChatIds(allAgentItems);
        const nonTestChats = chatList.filter(
          (chat) => !isTestChat(chat) && !testChatIds.has(chat.chat.chatId),
        );
        const cleanItems = allAgentItems.filter(
          (item) => !item.chatId || !testChatIds.has(item.chatId),
        );
        setChats(nonTestChats);
        setAgentItems(cleanItems);
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
    };
  }, [appliedFilter?.from, appliedFilter?.to, appliedFilter?.longTerm, refreshTrigger]);

  const metadataMaps = useMemo(
    () => buildChatMetadataMaps(agentItems),
    [agentItems],
  );

  const filterOptions = useMemo(
    () => buildAdditionalFilterOptions(chats, agentItems),
    [chats, agentItems],
  );

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        chatMatchesAdditionalFilters(chat, additionalFilters, metadataMaps),
      ),
    [chats, additionalFilters, metadataMaps],
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

  const kpis = useMemo(() => computeSalesKpis(filteredChats), [filteredChats]);

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
