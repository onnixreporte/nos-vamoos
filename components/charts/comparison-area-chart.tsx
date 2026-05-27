"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface ComparisonAreaPoint {
  label: string;
  countA: number;
  countB: number;
  dateA?: string;
  dateB?: string;
}

interface ComparisonAreaChartProps {
  data: ComparisonAreaPoint[];
  labelA: string;
  labelB: string;
}

const chartConfig = {
  countA: { label: "Rango A", color: "var(--chart-1)" },
  countB: { label: "Rango B", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ComparisonAreaChart({ data, labelA, labelB }: ComparisonAreaChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Conversaciones en el tiempo
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Volumen diario alineado por día del rango (Día 1, Día 2, …).
                Ambos rangos comparten la misma duración.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          A: {labelA} · B: {labelB}
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-countA)" stopOpacity={0.4} />
                <stop offset="1" stopColor="var(--color-countA)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-countB)" stopOpacity={0.4} />
                <stop offset="1" stopColor="var(--color-countB)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => String(v)} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload as ComparisonAreaPoint | undefined;
                    if (!p) return label;
                    return (
                      <div className="space-y-0.5">
                        <div>{label}</div>
                        {p.dateA && (
                          <div className="text-[11px] text-muted-foreground">A: {p.dateA}</div>
                        )}
                        {p.dateB && (
                          <div className="text-[11px] text-muted-foreground">B: {p.dateB}</div>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="countA"
              name="Rango A"
              stroke="var(--color-countA)"
              fill="url(#fillA)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="countB"
              name="Rango B"
              stroke="var(--color-countB)"
              fill="url(#fillB)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
