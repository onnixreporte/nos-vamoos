"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlyBucket } from "@/lib/dashboard-aggregation";

interface AnnualContactsLineChartProps {
  data: MonthlyBucket[];
  loading?: boolean;
}

const chartConfig = {
  count: {
    label: "Chats",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

const monthFromLabel = (label: string) => MONTH_LABELS[label.slice(5, 7)] ?? label;

export function AnnualContactsLineChart({
  data,
  loading = false,
}: AnnualContactsLineChartProps) {
  const total = data.reduce((s, d) => s + (d.count ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Chats por mes (anual)
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Cantidad de chats por mes desde marzo. Independiente del filtro de
                fecha; se completa mes a mes.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {loading ? "Cargando…" : `Total: ${total}`}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] w-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Cargando datos anuales…</span>
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickFormatter={monthFromLabel}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(v) => String(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(l) => monthFromLabel(String(l))} />
              }
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
