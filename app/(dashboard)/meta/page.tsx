"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DateFilterBar } from "@/components/filters/date-filter-bar";
import { MetaKpiCards } from "@/components/dashboard/meta-kpi-cards";
import { MetaSpendAreaChart } from "@/components/charts/meta-spend-area-chart";
import { MetaTopCampaignsBarChart } from "@/components/charts/meta-top-campaigns-bar-chart";
import { ConversationsAreaChart } from "@/components/charts/conversations-area-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRefreshContext } from "@/store/refresh-context";
import { usePersistedFilter } from "@/hooks/use-persisted-filter";
import type { DateFilter } from "@/lib/date-filters";
import {
  aggregateCampaigns,
  groupConversationsByDayFromInsights,
  groupSpendByDay,
  sumInsights,
} from "@/lib/meta-aggregation";
import { groupConversationsByTime } from "@/lib/dashboard-aggregation";
import { fetchAllChatsWithGapFill } from "@/lib/chats-client";
import type { MetaInsightsRow } from "@/lib/meta-types";
import type { ChatWithMessagesResponse } from "@/types/botmaker";

interface MetaPayload {
  data: MetaInsightsRow[];
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    const base = body?.error ?? `Error ${res.status}`;
    const details = body?.details ? ` — ${body.details.slice(0, 300)}` : "";
    throw new Error(`${base}${details}`);
  }
  return (await res.json()) as T;
}


export default function MetaPage() {
  const [appliedFilter, setAppliedFilter] = usePersistedFilter("filter:meta", "month");
  const [debouncedFilter, setDebouncedFilter] = useState<DateFilter | null>(appliedFilter);

  const [accountRows, setAccountRows] = useState<MetaInsightsRow[]>([]);
  const [dailyRows, setDailyRows] = useState<MetaInsightsRow[]>([]);
  const [campaignRows, setCampaignRows] = useState<MetaInsightsRow[]>([]);
  const [campaignDailyRows, setCampaignDailyRows] = useState<MetaInsightsRow[]>([]);
  const [chats, setChats] = useState<ChatWithMessagesResponse[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("__all__");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setAccountRows([]);
      setDailyRows([]);
      setCampaignRows([]);
      setChats([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    qs.set("from", debouncedFilter.from);
    qs.set("to", debouncedFilter.to);
    const base = `?${qs.toString()}`;
    const dailyQs = new URLSearchParams(qs);
    dailyQs.set("time_increment", "1");
    const campaignDailyQs = new URLSearchParams(qs);
    campaignDailyQs.set("time_increment", "1");

    (async () => {
      try {
        const [account, daily, campaigns, campaignDaily, chatList] = await Promise.all([
          fetchJson<MetaPayload>(`/api/meta/insights${base}`, controller.signal),
          fetchJson<MetaPayload>(`/api/meta/insights?${dailyQs.toString()}`, controller.signal),
          fetchJson<MetaPayload>(`/api/meta/campaigns${base}`, controller.signal),
          fetchJson<MetaPayload>(`/api/meta/campaigns?${campaignDailyQs.toString()}`, controller.signal),
          fetchAllChatsWithGapFill(debouncedFilter, controller.signal),
        ]);
        if (cancelled) return;
        setAccountRows(account.data ?? []);
        setDailyRows(daily.data ?? []);
        setCampaignRows(campaigns.data ?? []);
        setCampaignDailyRows(campaignDaily.data ?? []);
        setChats(chatList);
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedFilter?.from, debouncedFilter?.to, debouncedFilter?.longTerm, refreshTrigger]);

  const isCampaignFiltered = selectedCampaignId !== "__all__";
  const filteredCampaignDaily = useMemo(
    () =>
      isCampaignFiltered
        ? campaignDailyRows.filter((r) => r.campaign_id === selectedCampaignId)
        : campaignDailyRows,
    [campaignDailyRows, selectedCampaignId, isCampaignFiltered],
  );
  const filteredCampaignRows = useMemo(
    () =>
      isCampaignFiltered
        ? campaignRows.filter((r) => r.campaign_id === selectedCampaignId)
        : campaignRows,
    [campaignRows, selectedCampaignId, isCampaignFiltered],
  );

  const totals = useMemo(
    () => (isCampaignFiltered ? sumInsights(filteredCampaignRows) : sumInsights(accountRows)),
    [isCampaignFiltered, filteredCampaignRows, accountRows],
  );
  const spendByDay = useMemo(
    () => (isCampaignFiltered ? groupSpendByDay(filteredCampaignDaily) : groupSpendByDay(dailyRows)),
    [isCampaignFiltered, filteredCampaignDaily, dailyRows],
  );
  const campaigns = useMemo(
    () => aggregateCampaigns(filteredCampaignRows),
    [filteredCampaignRows],
  );
  const allCampaigns = useMemo(() => aggregateCampaigns(campaignRows), [campaignRows]);
  const conversationsByDay = useMemo(
    () =>
      groupConversationsByTime(
        chats,
        "day",
        false,
        debouncedFilter?.from,
        debouncedFilter?.to,
      ),
    [chats, debouncedFilter?.from, debouncedFilter?.to],
  );
  const metaConversationsByDay = useMemo(
    () => groupConversationsByDayFromInsights(filteredCampaignDaily),
    [filteredCampaignDaily],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-pretty">Meta Ads</h1>
        <p className="text-sm text-muted-foreground">
          KPIs y rendimiento de campañas Meta.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DateFilterBar
          appliedFilter={appliedFilter}
          onFilterChange={setAppliedFilter}
          defaultPreset="month"
          hideTimeInputs
        />
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="h-9 w-[260px]">
            <SelectValue placeholder="Campaña" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las campañas</SelectItem>
            {allCampaigns.map((c) => (
              <SelectItem key={c.campaignId} value={c.campaignId}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          <MetaKpiCards totals={totals} />
          <div className="grid gap-4 md:grid-cols-2">
            <MetaSpendAreaChart data={spendByDay} />
            <ConversationsAreaChart
              data={isCampaignFiltered ? metaConversationsByDay : conversationsByDay}
            />
          </div>
          <MetaTopCampaignsBarChart data={campaigns} />
        </>
      )}
    </div>
  );
}
