"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  countSalesByDayOfMonth,
  groupByHourAndDay,
  groupChatsByDayOfMonth,
  groupConversationsByTime,
} from "@/lib/dashboard-aggregation";
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
import { isTestChat } from "@/lib/test-contacts";
import { isChatInRange } from "@/lib/chats-client";
import type {
  AgentMetricsItem,
  AgentMetricsPage,
  ChatWithMessagesResponse,
  ChatsPage,
  SessionItem,
  SessionsPage,
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
  const a = new Date(from).toDateString();
  const b = new Date(to).toDateString();
  return a === b;
}

export default function DashboardPage() {
  const [chats, setChats] = useState<ChatWithMessagesResponse[]>([]);
  const [agentItems, setAgentItems] = useState<AgentMetricsItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = usePersistedFilter("filter:dashboard", "week");
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
      setSessions([]);
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
        if (page.items?.length) acc.push(...page.items);
        url = page.nextPage
          ? `/api/chats?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    const fetchAllSessions = async (): Promise<SessionItem[]> => {
      const params = new URLSearchParams({
        from: debouncedFilter.from,
        to: debouncedFilter.to,
      });
      let url: string | null = `/api/sessions?${params.toString()}`;
      const acc: SessionItem[] = [];
      let pageCount = 0;
      while (url && pageCount < MAX_PAGES) {
        pageCount++;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const page = (await res.json()) as SessionsPage;
        if (cancelled) return acc;
        if (page.items?.length) acc.push(...page.items);
        url = page.nextPage
          ? `/api/sessions?nextPage=${encodeURIComponent(page.nextPage)}`
          : null;
      }
      return acc;
    };

    const fetchAllAgentMetrics = async (
      status: string
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
          const cached = getCachedPageData<{ chats: ChatWithMessagesResponse[]; agentItems: AgentMetricsItem[]; sessions: SessionItem[] }>(
            "dashboard",
            debouncedFilter.from,
            debouncedFilter.to,
            debouncedFilter.longTerm,
          );
          if (cached) {
            setChats(cached.chats);
            setAgentItems(cached.agentItems);
            setSessions(cached.sessions ?? []);
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
        const sessionItems = await fetchAllSessions();
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

        setCachedPageData("dashboard", debouncedFilter.from, debouncedFilter.to, debouncedFilter.longTerm, {
          chats: finalChats,
          agentItems: allAgentItems,
          sessions: sessionItems,
        });

        setChats(finalChats);
        setAgentItems(allAgentItems);
        setSessions(sessionItems);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar datos"
          );
          setChats([]);
          setAgentItems([]);
          setSessions([]);
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
          chatMatchesAdditionalFilters(chat, additionalFilters, metadataMaps) &&
          (!appliedFilter?.from || !appliedFilter?.to ||
            isChatInRange(chat, appliedFilter.from, appliedFilter.to)),
      ),
    [chats, additionalFilters, metadataMaps, testTypificationChatIds, appliedFilter?.from, appliedFilter?.to],
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

  const totalSessionsCount = sessions.length;

  const agents = useMemo(
    () =>
      aggregateByAgent(filteredAgentItems).filter(
        (a) => !EXCLUDED_AGENT_NAMES.has(a.agentName.trim()),
      ),
    [filteredAgentItems],
  );

  const agentsAll = useMemo(
    () =>
      aggregateByAgent(agentItems).filter(
        (a) => !EXCLUDED_AGENT_NAMES.has(a.agentName.trim()),
      ),
    [agentItems],
  );

  const avgFirstResponseMsAll = useMemo(() => {
    let sumMs = 0;
    let count = 0;
    for (const item of agentItems) {
      if (EXCLUDED_AGENT_NAMES.has((item.agentName ?? "").trim())) continue;
      const n = Number(
        String(item.fromOpAssignedToOpFirstResponse ?? "").replace(/[^0-9.-]/g, ""),
      );
      const ms = Number.isFinite(n) ? n * 1000 : 0;
      if (ms > 0) {
        sumMs += ms;
        count += 1;
      }
    }
    return count > 0 ? sumMs / count : 0;
  }, [agentItems]);

  const kpis = useMemo(() => {
    const base = computeOverviewKpis(filteredChats, filteredAgentItems, agentItems);
    const attendedConversations = agentsAll.reduce(
      (s, a) => s + a.closedConversations + a.openConversations,
      0,
    );
    const closedConversations = agentsAll.reduce(
      (s, a) => s + a.closedConversations,
      0,
    );
    let attendingSum = 0;
    let attendingWeight = 0;
    for (const a of agentsAll) {
      const w = a.closedConversations;
      if (w > 0 && a.avgAttendingTimeMs > 0) {
        attendingSum += a.avgAttendingTimeMs * w;
        attendingWeight += w;
      }
    }
    const avgAttendingMs =
      attendingWeight > 0 ? attendingSum / attendingWeight : 0;

    const chatCreationMap = new Map<string, string>();
    for (const c of chats) {
      const id = c.chat?.chatId;
      if (!id) continue;
      if (c.creationTime) chatCreationMap.set(id, c.creationTime);
    }
    const firstAgentTakeByChat = new Map<string, number>();
    for (const item of agentItems) {
      if (EXCLUDED_AGENT_NAMES.has((item.agentName ?? "").trim())) continue;
      if (!item.chatId || !item.sessionCreationTime) continue;
      const t = new Date(item.sessionCreationTime).getTime();
      const prev = firstAgentTakeByChat.get(item.chatId);
      if (prev === undefined || t < prev) firstAgentTakeByChat.set(item.chatId, t);
    }
    const MAX_BOT_MS = 24 * 60 * 60 * 1000;
    let botSumMs = 0;
    let botCount = 0;
    for (const [chatId, agentTakeTime] of firstAgentTakeByChat) {
      const startStr = chatCreationMap.get(chatId);
      if (!startStr) continue;
      const diff = agentTakeTime - new Date(startStr).getTime();
      if (diff > 0 && diff < MAX_BOT_MS) {
        botSumMs += diff;
        botCount += 1;
      }
    }
    const avgBotAttendingMs = botCount > 0 ? botSumMs / botCount : 0;
    return {
      ...base,
      totalSessions: totalSessionsCount,
      totalContacts: filteredChats.length,
      attendedConversations,
      closedConversations,
      avgFirstResponseMs: avgFirstResponseMsAll,
      avgAttendingMs,
      avgBotAttendingMs,
    };
  }, [
    filteredChats,
    filteredAgentItems,
    agentItems,
    chats,
    totalSessionsCount,
    agents,
    agentsAll,
    avgFirstResponseMsAll,
  ]);

  const timeGranularity = useMemo(() => {
    if (!appliedFilter?.from || !appliedFilter?.to) return "hour";
    return isSameDay(appliedFilter.from, appliedFilter.to) ? "hour" : "day";
  }, [appliedFilter?.from, appliedFilter?.to]);

  const isFilterToday = useMemo(() => {
    if (!appliedFilter?.from) return false;
    return isSameDay(appliedFilter.from, new Date().toISOString());
  }, [appliedFilter?.from]);

  const timeBuckets = useMemo(
    () =>
      groupConversationsByTime(
        filteredChats,
        timeGranularity,
        isFilterToday,
        appliedFilter?.from,
        appliedFilter?.to,
      ),
    [filteredChats, timeGranularity, isFilterToday, appliedFilter?.from, appliedFilter?.to],
  );

  const topDestinations = useMemo(
    () => countByDestination(filteredChats, 8),
    [filteredChats],
  );

  const channelCounts = useMemo(
    () => countByChannel(filteredChats),
    [filteredChats],
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
        appliedFilter?.from,
        appliedFilter?.to,
      ),
    [filteredChats, calendarYearMonth.year, calendarYearMonth.month, appliedFilter?.from, appliedFilter?.to],
  );

  const salesByDay = useMemo(
    () =>
      countSalesByDayOfMonth(
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
    <div className="min-w-0 space-y-6" suppressHydrationWarning>
      <div className="space-y-1" suppressHydrationWarning>
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
            <AgentSessionsBarChart agents={agentsAll} limit={8} />
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
              salesByDay={salesByDay}
            />
          </div>
          <CountryMapChart data={countryCounts} />
        </>
      )}
    </div>
  );
}
