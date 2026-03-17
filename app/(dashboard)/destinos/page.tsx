"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DestinationKpiCards } from "@/components/destinos/destination-kpi-cards";
import { DestinationsTable } from "@/components/destinos/destinations-table";
import { TopConsultedDestinationsChart } from "@/components/charts/top-consulted-destinations-chart";
import { PackageTypesPieChart } from "@/components/charts/package-types-pie-chart";
import { TravelerOriginBarChart } from "@/components/charts/traveler-origin-bar-chart";
import { FamilyCompositionChart } from "@/components/charts/family-composition-chart";
import { TripDurationChart } from "@/components/charts/trip-duration-chart";
import { DateFilterBar } from "@/components/filters/date-filter-bar";
import { useRefreshContext } from "@/store/refresh-context";
import {
  computeDestinationKpis,
  topDestinationsConsulted,
  countByPackageType,
  countByOrigin,
  familyComposition,
  tripDurationDistribution,
} from "@/lib/destinations-aggregation";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";
import {
  buildAdditionalFilterOptions,
  chatMatchesAdditionalFilters,
  DEFAULT_ADDITIONAL_FILTERS,
} from "@/lib/dashboard-filters";
import { isTestChat } from "@/lib/test-contacts";
import type {
  ChatWithMessagesResponse,
  ChatsPage,
} from "@/types/botmaker";

export default function DestinosPage() {
  const [chats, setChats] = useState<ChatWithMessagesResponse[]>([]);
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
      searchParams.set("from", appliedFilter.from);
      searchParams.set("to", appliedFilter.to);
      if (appliedFilter.longTerm) searchParams.set("long-term-search", "true");
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

    (async () => {
      try {
        const chatList = await fetchAllChats();
        if (cancelled) return;
        // TODO: re-enable test filtering once all chats are confirmed to load
        // const nonTestChats = chatList.filter((chat) => !isTestChat(chat));
        setChats(chatList);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar datos",
          );
          setChats([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [appliedFilter?.from, appliedFilter?.to, appliedFilter?.longTerm, refreshTrigger]);

  const filterOptions = useMemo(
    () => buildAdditionalFilterOptions(chats),
    [chats],
  );
  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        chatMatchesAdditionalFilters(chat, additionalFilters),
      ),
    [chats, additionalFilters],
  );

  const kpis = useMemo(() => computeDestinationKpis(filteredChats), [filteredChats]);
  const topDestinations = useMemo(
    () => topDestinationsConsulted(filteredChats, 10),
    [filteredChats],
  );
  const packageTypes = useMemo(
    () => countByPackageType(filteredChats),
    [filteredChats],
  );
  const origins = useMemo(() => countByOrigin(filteredChats, 8), [filteredChats]);
  const familyData = useMemo(() => familyComposition(filteredChats), [filteredChats]);
  const durationData = useMemo(
    () => tripDurationDistribution(filteredChats),
    [filteredChats],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-pretty">Destinos</h1>
        <p className="text-sm text-muted-foreground">
          Analisis de destinos, paquetes y composicion de viajeros.
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
          <DestinationKpiCards kpis={kpis} />

          <div className="grid gap-4 md:grid-cols-2">
            <TopConsultedDestinationsChart data={topDestinations} />
            <PackageTypesPieChart data={packageTypes} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TravelerOriginBarChart data={origins} />
            <FamilyCompositionChart data={familyData} />
            <TripDurationChart data={durationData} />
          </div>

          <DestinationsTable chats={filteredChats} />
        </>
      )}
    </div>
  );
}
