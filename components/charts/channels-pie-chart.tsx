"use client";

import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChannelCount } from "@/lib/dashboard-aggregation";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface ChannelsPieChartProps {
  data: ChannelCount[];
}

function buildChartConfig(data: ChannelCount[]): ChartConfig {
  const config: ChartConfig = {};
  data.forEach((d, i) => {
    config[d.channel] = {
      label: d.channel,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return config;
}

export function ChannelsPieChart({ data }: ChannelsPieChartProps) {
  const chartData = data.map((d) => ({
    name: d.channel,
    value: d.count,
  }));

  const chartConfig = buildChartConfig(data);
  if (Object.keys(chartConfig).length === 0) {
    (chartConfig as Record<string, { label: string; color: string }>).empty = {
      label: "Sin datos",
      color: "var(--muted)",
    };
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Canales
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Distribución de chats por canal (WhatsApp, Instagram, web, etc.).</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer
            config={chartConfig}
            className="h-[200px] w-[200px] shrink-0"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={1}
                stroke="var(--border)"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <ul className="flex flex-col gap-1.5 text-xs">
            {data.map((d, i) => (
              <li key={d.channel} className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="truncate">{d.channel}</span>
                <span className="ml-auto tabular-nums font-medium">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
