"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AgentSessionsBarChart } from "@/components/charts/agent-sessions-bar-chart";
import { ChannelsPieChart } from "@/components/charts/channels-pie-chart";
import { ContactScheduleHeatmap } from "@/components/charts/contact-schedule-heatmap";
import { ConversationsAreaChart } from "@/components/charts/conversations-area-chart";
import { CountryMapChart } from "@/components/charts/country-map-chart";
import { MonthlyCalendarHeatmap } from "@/components/charts/monthly-calendar-heatmap";
import { TopDestinationsBarChart } from "@/components/charts/top-destinations-bar-chart";
import { OverviewKpiCards } from "@/components/dashboard/overview-kpi-cards";
import { DateFilterBar } from "@/components/filters/date-filter-bar";
import { useRefreshContext } from "@/store/refresh-context";
import { aggregateByAgent } from "@/lib/agent-aggregation";
import {
  computeOverviewKpis,
  countByChannel,
  countByCountry,
  countByDestination,
  groupByHourAndDay,
  groupChatsByDayOfMonth,
  groupConversationsByTime,
} from "@/lib/dashboard-aggregation";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";
import {
  buildAdditionalFilterOptions,
  buildChatMetadataMaps,
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
  const a = new Date(from).toDateString();
  const b = new Date(to).toDateString();
  return a === b;
}

export default function DashboardPage() {
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
      status: string
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
        const nonTestChats = chatList.filter((chat) => !isTestChat(chat));
        setChats(nonTestChats);
        setAgentItems([...closedItems, ...openItems]);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar datos"
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

  const kpis = useMemo(
    () => computeOverviewKpis(filteredChats, filteredAgentItems),
    [filteredChats, filteredAgentItems],
  );

  const timeGranularity = useMemo(() => {
    if (!appliedFilter?.from || !appliedFilter?.to) return "hour";
    return isSameDay(appliedFilter.from, appliedFilter.to) ? "hour" : "day";
  }, [appliedFilter?.from, appliedFilter?.to]);

  const timeBuckets = useMemo(
    () => groupConversationsByTime(filteredChats, timeGranularity),
    [filteredChats, timeGranularity],
  );

  const topDestinations = useMemo(
    () => countByDestination(filteredChats, 8),
    [filteredChats],
  );

  const channelCounts = useMemo(
    () => countByChannel(filteredChats),
    [filteredChats],
  );

  const agents = useMemo(
    () => aggregateByAgent(filteredAgentItems),
    [filteredAgentItems],
  );

  const contactScheduleData = useMemo(
    () => groupByHourAndDay(filteredChats),
    [filteredChats],
  );

  const calendarYearMonth = useMemo(() => {
    if (!appliedFilter?.from) return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    const d = new Date(appliedFilter.from);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [appliedFilter?.from]);

  const monthlyCalendarData = useMemo(
    () =>
      groupChatsByDayOfMonth(
        filteredChats,
        calendarYearMonth.year,
        calendarYearMonth.month,
      ),
    [filteredChats, calendarYearMonth.year, calendarYearMonth.month],
  );

  const countryCounts = useMemo(
    () => countByCountry(filteredChats),
    [filteredChats],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-pretty">Vista General</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de conversaciones, ventas y métricas de agentes.
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
          <span>Cargando datos…</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          <OverviewKpiCards kpis={kpis} />
          <div className="grid gap-4 md:grid-cols-2">
            <ConversationsAreaChart data={timeBuckets} />
            <TopDestinationsBarChart data={topDestinations} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ChannelsPieChart data={channelCounts} />
            <AgentSessionsBarChart agents={agents} limit={8} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ContactScheduleHeatmap
              data={contactScheduleData}
              filterFrom={appliedFilter?.from}
              filterTo={appliedFilter?.to}
            />
            <MonthlyCalendarHeatmap
              data={monthlyCalendarData}
              year={calendarYearMonth.year}
              month={calendarYearMonth.month}
              filterFrom={appliedFilter?.from}
              filterTo={appliedFilter?.to}
            />
          </div>
          <CountryMapChart data={countryCounts} />
        </>
      )}
    </div>
  );
}
