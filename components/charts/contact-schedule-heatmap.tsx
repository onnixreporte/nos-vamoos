"use client";

import { useMemo } from "react";
import { parseISO, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  getDayLabel,
  type HourDayBucket,
} from "@/lib/dashboard-aggregation";
import { toPYTime } from "@/lib/date-filters";

interface ContactScheduleHeatmapProps {
  data: HourDayBucket[];
  filterFrom?: string;
  filterTo?: string;
}

function getIntensityColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "hsl(var(--muted))";
  const intensity = count / max;
  if (intensity >= 0.75) return "hsl(12 76% 61% / 0.9)";
  if (intensity >= 0.5) return "hsl(12 76% 61% / 0.65)";
  if (intensity >= 0.25) return "hsl(12 76% 61% / 0.4)";
  return "hsl(12 76% 61% / 0.2)";
}

function getVisibleDays(filterFrom?: string, filterTo?: string): number[] {
  if (!filterFrom || !filterTo) return [0, 1, 2, 3, 4, 5, 6];

  try {
    const from = toPYTime(parseISO(filterFrom));
    const to = toPYTime(parseISO(filterTo));
    const days = eachDayOfInterval({ start: from, end: to });
    const daySet = new Set(days.map((d) => d.getDay()));
    if (daySet.size >= 7) return [0, 1, 2, 3, 4, 5, 6];
    const ordered = [1, 2, 3, 4, 5, 6, 0];
    return ordered.filter((d) => daySet.has(d));
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

export function ContactScheduleHeatmap({
  data,
  filterFrom,
  filterTo,
}: ContactScheduleHeatmapProps) {
  const { grid, maxCount, total } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.count));
    const g: Record<string, number> = {};
    let sum = 0;
    for (const d of data) {
      g[`${d.dayOfWeek}-${d.hour}`] = d.count;
      sum += d.count;
    }
    return { grid: g, maxCount: max, total: sum };
  }, [data]);

  const visibleDays = useMemo(
    () => getVisibleDays(filterFrom, filterTo),
    [filterFrom, filterTo],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Horario de contacto (Primer mensaje)
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Heatmap: día de la semana vs. hora del primer mensaje del cliente.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Días vs. horas del día · Total: {total}
        </p>
      </CardHeader>
      <CardContent>
        <div>
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-8 shrink-0" />
              <div className="flex flex-1 gap-0.5">
                {Array.from({ length: 24 }, (_, h) => (
                  <span
                    key={h}
                    className="min-w-0 flex-1 text-center"
                    title={`${h}:00`}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-0.5">
              {visibleDays.map((dayOfWeek) => (
                <div key={dayOfWeek} className="flex items-center gap-1">
                  <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
                    {getDayLabel(dayOfWeek)}
                  </span>
                  <div className="flex flex-1 gap-0.5">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const count = grid[`${dayOfWeek}-${hour}`] ?? 0;
                      return (
                        <div
                          key={hour}
                          className="min-w-0 flex-1 aspect-square rounded-sm transition-colors"
                          style={{
                            backgroundColor: getIntensityColor(count, maxCount),
                          }}
                          title={`${getDayLabel(dayOfWeek)} ${hour}:00 - ${count} chats`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-0.5">
                {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                  <div
                    key={i}
                    className="h-3 w-4 rounded-sm"
                    style={{
                      backgroundColor: getIntensityColor(
                        i * maxCount,
                        maxCount
                      ),
                    }}
                  />
                ))}
              </div>
              <span>Más</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
