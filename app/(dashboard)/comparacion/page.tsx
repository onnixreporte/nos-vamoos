"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Clock, Loader2, MessageSquare, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ComparisonAreaChart, type ComparisonAreaPoint } from "@/components/charts/comparison-area-chart";
import { ComparisonHourChart, type ComparisonHourPoint } from "@/components/charts/comparison-hour-chart";
import { ComparisonRangePicker } from "@/components/filters/comparison-range-picker";
import { useRefreshContext } from "@/store/refresh-context";
import { buildPresetRange, formatForApi, PY_TZ, type DateFilter } from "@/lib/date-filters";
import { isTestChat } from "@/lib/test-contacts";
import { buildTestTypificationChatIds } from "@/lib/dashboard-filters";
import { TZDate } from "@date-fns/tz";
import type { AgentMetricsItem, AgentMetricsPage, ChatWithMessagesResponse, ChatsPage } from "@/types/botmaker";

const MAX_PAGES = 200;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function buildDefaultRanges(): { rangeA: DateFilter; rangeB: DateFilter } {
  const rangeA = buildPresetRange("month");
  const durationMs = new Date(rangeA.to).getTime() - new Date(rangeA.from).getTime();
  const bFrom = new Date(new Date(rangeA.from).getTime() - durationMs - 1);
  const bTo = new Date(new Date(rangeA.from).getTime() - 1);
  const rangeB: DateFilter = {
    from: formatForApi(bFrom),
    to: formatForApi(bTo),
    longTerm: true,
  };
  return { rangeA, rangeB };
}

function daySpan(r: DateFilter): number {
  const ms = new Date(r.to).getTime() - new Date(r.from).getTime();
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

function toPY(d: Date): TZDate {
  return new TZDate(d, PY_TZ);
}

function groupByDayIndex(
  chats: ChatWithMessagesResponse[],
  range: DateFilter,
): number[] {
  const days = daySpan(range);
  const counts = new Array<number>(days).fill(0);
  const fromMs = new Date(range.from).getTime();
  for (const chat of chats) {
    const raw = chat.lastUserMessageDatetime ?? chat.creationTime;
    if (!raw) continue;
    let t: number;
    try {
      t = parseISO(raw).getTime();
    } catch {
      continue;
    }
    const idx = Math.floor((t - fromMs) / MS_PER_DAY);
    if (idx >= 0 && idx < days) counts[idx] += 1;
  }
  return counts;
}

function groupByHour(chats: ChatWithMessagesResponse[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const chat of chats) {
    const raw = chat.creationTime ?? chat.lastUserMessageDatetime;
    if (!raw) continue;
    try {
      const py = toPY(parseISO(raw));
      buckets[py.getHours()] += 1;
    } catch {
      // ignore
    }
  }
  return buckets;
}

function peakHour(buckets: number[]): { hour: number; count: number } {
  let max = -1;
  let hour = 0;
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i] > max) {
      max = buckets[i];
      hour = i;
    }
  }
  return { hour, count: Math.max(0, max) };
}

function formatPct(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function rangeLabel(r: DateFilter): string {
  try {
    return `${format(new Date(r.from), "dd/MM/yy", { locale: es })} – ${format(new Date(r.to), "dd/MM/yy", { locale: es })}`;
  } catch {
    return "";
  }
}

function dateForDayIdx(range: DateFilter, idx: number): string {
  try {
    const d = new Date(new Date(range.from).getTime() + idx * MS_PER_DAY);
    return format(d, "dd/MM/yy", { locale: es });
  } catch {
    return "";
  }
}

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

async function fetchAllChatsWithGapFill(
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
  return finalChats;
}

interface KpiCompareCardProps {
  icon: React.ReactNode;
  title: string;
  valueA: string;
  valueB: string;
  delta?: { value: number; positiveIsGood?: boolean };
}

function KpiCompareCard({ icon, title, valueA, valueB, delta }: KpiCompareCardProps) {
  const showDelta = delta && Number.isFinite(delta.value);
  const isUp = showDelta && delta!.value > 0;
  const positive = delta?.positiveIsGood ?? true;
  const goodColor = (isUp && positive) || (!isUp && !positive)
    ? "text-emerald-500"
    : "text-rose-500";

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline gap-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">A</p>
            <p className="text-xl font-semibold tabular-nums">{valueA}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">B</p>
            <p className="text-xl font-semibold tabular-nums text-muted-foreground">{valueB}</p>
          </div>
        </div>
        {showDelta && (
          <div className={`flex items-center gap-1 text-xs font-medium ${goodColor}`}>
            {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            <span>{formatPct(delta!.value)}</span>
            <span className="text-muted-foreground font-normal">vs B</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ComparacionPage() {
  const initial = useMemo(() => buildDefaultRanges(), []);
  const [rangeA, setRangeA] = useState<DateFilter>(initial.rangeA);
  const [rangeB, setRangeB] = useState<DateFilter>(initial.rangeB);
  const [chatsA, setChatsA] = useState<ChatWithMessagesResponse[]>([]);
  const [chatsB, setChatsB] = useState<ChatWithMessagesResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { registerRefresh, unregisterRefresh } = useRefreshContext();
  useEffect(() => {
    registerRefresh(() => setRefreshTrigger((t) => t + 1));
    return unregisterRefresh;
  }, [registerRefresh, unregisterRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetchAllChatsWithGapFill(rangeA, controller.signal),
          fetchAllChatsWithGapFill(rangeB, controller.signal),
        ]);
        if (cancelled) return;
        setChatsA(a);
        setChatsB(b);
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error al cargar datos");
        setChatsA([]);
        setChatsB([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rangeA.from, rangeA.to, rangeB.from, rangeB.to, refreshTrigger]);

  const handleRangeChange = (newA: DateFilter, newB: DateFilter) => {
    setRangeA(newA);
    setRangeB(newB);
  };

  const dayCountsA = useMemo(() => groupByDayIndex(chatsA, rangeA), [chatsA, rangeA]);
  const dayCountsB = useMemo(() => groupByDayIndex(chatsB, rangeB), [chatsB, rangeB]);
  const hourCountsA = useMemo(() => groupByHour(chatsA), [chatsA]);
  const hourCountsB = useMemo(() => groupByHour(chatsB), [chatsB]);

  const areaData: ComparisonAreaPoint[] = useMemo(() => {
    const days = Math.max(dayCountsA.length, dayCountsB.length);
    const out: ComparisonAreaPoint[] = [];
    for (let i = 0; i < days; i++) {
      out.push({
        label: `Día ${i + 1}`,
        countA: i < dayCountsA.length ? dayCountsA[i] : 0,
        countB: i < dayCountsB.length ? dayCountsB[i] : 0,
        dateA: i < dayCountsA.length ? dateForDayIdx(rangeA, i) : undefined,
        dateB: i < dayCountsB.length ? dateForDayIdx(rangeB, i) : undefined,
      });
    }
    return out;
  }, [dayCountsA, dayCountsB, rangeA, rangeB]);

  const hourData: ComparisonHourPoint[] = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: String(h).padStart(2, "0"),
      countA: hourCountsA[h] ?? 0,
      countB: hourCountsB[h] ?? 0,
    }));
  }, [hourCountsA, hourCountsB]);

  const totalA = chatsA.length;
  const totalB = chatsB.length;
  const deltaTotal = totalB > 0 ? ((totalA - totalB) / totalB) * 100 : totalA > 0 ? 100 : 0;

  const daysA = daySpan(rangeA);
  const daysB = daySpan(rangeB);
  const avgA = totalA / daysA;
  const avgB = totalB / daysB;
  const deltaAvg = avgB > 0 ? ((avgA - avgB) / avgB) * 100 : avgA > 0 ? 100 : 0;

  const peakA = peakHour(hourCountsA);
  const peakB = peakHour(hourCountsB);

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-pretty">Comparación de rangos</h1>
        <p className="text-sm text-muted-foreground">
          Compara dos períodos lado a lado. Selecciona el rango A y B de forma independiente.
        </p>
      </div>

      <ComparisonRangePicker rangeA={rangeA} rangeB={rangeB} onChange={handleRangeChange} />

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
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCompareCard
              icon={<MessageSquare className="size-3.5" />}
              title="Total conversaciones"
              valueA={totalA.toLocaleString("es")}
              valueB={totalB.toLocaleString("es")}
              delta={{ value: deltaTotal }}
            />
            <KpiCompareCard
              icon={<TrendingUp className="size-3.5" />}
              title="Promedio diario"
              valueA={avgA.toFixed(1)}
              valueB={avgB.toFixed(1)}
              delta={{ value: deltaAvg }}
            />
            <KpiCompareCard
              icon={<Clock className="size-3.5" />}
              title="Hora pico contacto"
              valueA={`${String(peakA.hour).padStart(2, "0")}:00`}
              valueB={`${String(peakB.hour).padStart(2, "0")}:00`}
            />
          </div>

          <ComparisonAreaChart
            data={areaData}
            labelA={rangeLabel(rangeA)}
            labelB={rangeLabel(rangeB)}
          />

          <ComparisonHourChart data={hourData} />
        </>
      )}
    </div>
  );
}
