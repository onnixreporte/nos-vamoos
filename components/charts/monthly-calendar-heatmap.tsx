"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Star } from "lucide-react";
import type { DayOfMonthBucket } from "@/lib/dashboard-aggregation";
import { toPYTime } from "@/lib/date-filters";

interface MonthlyCalendarHeatmapProps {
  data: DayOfMonthBucket[];
  year: number;
  month: number;
  filterFrom?: string;
  filterTo?: string;
  salesByDay?: Map<number, number>;
}

function getIntensityColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "hsl(var(--muted))";
  const intensity = count / max;
  if (intensity >= 0.75) return "hsl(12 76% 61% / 0.9)";
  if (intensity >= 0.5) return "hsl(12 76% 61% / 0.65)";
  if (intensity >= 0.25) return "hsl(12 76% 61% / 0.4)";
  return "hsl(12 76% 61% / 0.2)";
}

function getActiveRange(
  year: number,
  month: number,
  filterFrom?: string,
  filterTo?: string,
): { startDay: number; endDay: number } | null {
  if (!filterFrom || !filterTo) return null;

  try {
    const from = toPYTime(parseISO(filterFrom));
    const to = toPYTime(parseISO(filterTo));
    const daysInMonth = new Date(year, month, 0).getDate();

    const fromInMonth =
      from.getFullYear() === year && from.getMonth() === month - 1;
    const toInMonth =
      to.getFullYear() === year && to.getMonth() === month - 1;

    if (!fromInMonth && !toInMonth) {
      if (from < new Date(year, month - 1, 1) && to >= new Date(year, month, 0)) {
        return { startDay: 1, endDay: daysInMonth };
      }
      return null;
    }

    const startDay = fromInMonth ? from.getDate() : 1;
    const endDay = toInMonth ? to.getDate() : daysInMonth;

    return { startDay, endDay };
  } catch {
    return null;
  }
}

export function MonthlyCalendarHeatmap({
  data,
  year,
  month,
  filterFrom,
  filterTo,
  salesByDay,
}: MonthlyCalendarHeatmapProps) {
  const { byDay, maxCount, firstDayOffset, total } = useMemo(() => {
    const byDay = new Map<number, number>();
    let max = 0;
    let sum = 0;
    for (const d of data) {
      byDay.set(d.day, d.count);
      sum += d.count;
      if (d.count > max) max = d.count;
    }
    const firstDate = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDate.getDay();
    return {
      byDay,
      maxCount: Math.max(1, max),
      firstDayOffset: firstDayOfWeek,
      total: sum,
    };
  }, [data, year, month]);

  const activeRange = useMemo(
    () => getActiveRange(year, month, filterFrom, filterTo),
    [year, month, filterFrom, filterTo],
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy", {
    locale: es,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium capitalize flex items-center gap-1.5">
          Calendario del mes — {monthName}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Chats por día del mes seleccionado.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Chats por día · Total: {total}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOffset }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const count = byDay.get(day) ?? 0;
            const sales = salesByDay?.get(day) ?? 0;
            const inRange =
              activeRange != null &&
              day >= activeRange.startDay &&
              day <= activeRange.endDay;

            return (
              <div
                key={day}
                className={`relative aspect-square rounded-sm p-1 text-center text-[10px] transition-colors ${
                  inRange ? "ring-1 ring-primary/50" : ""
                } ${!inRange && activeRange != null ? "opacity-40" : ""}`}
                style={{
                  backgroundColor: getIntensityColor(count, maxCount),
                }}
                title={`${day} ${monthName} - ${count} chats${sales > 0 ? ` · ${sales} venta${sales > 1 ? "s" : ""}` : ""}`}
              >
                {sales > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex items-center gap-0.5">
                    <Star className="size-2.5 fill-amber-400 text-amber-400" />
                    {sales > 1 && (
                      <span className="text-[8px] font-semibold text-amber-600 leading-none">
                        {sales}
                      </span>
                    )}
                  </span>
                )}
                <span className={count > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {day}
                </span>
                {count > 0 && (
                  <span className="block text-[9px] opacity-80">{count}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div
                key={i}
                className="h-3 w-4 rounded-sm"
                style={{
                  backgroundColor: getIntensityColor(i * maxCount, maxCount),
                }}
              />
            ))}
          </div>
          <span>Más</span>
        </div>
      </CardContent>
    </Card>
  );
}
