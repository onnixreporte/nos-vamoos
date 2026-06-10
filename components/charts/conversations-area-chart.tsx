"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
import type { TimeBucket } from "@/lib/dashboard-aggregation";

interface ConversationsAreaChartProps {
  data: TimeBucket[];
  title?: string;
  tooltip?: string;
}

const chartConfig = {
  count: {
    label: "Conversaciones",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ConversationsAreaChart({
  data,
  title = "Conversaciones en el tiempo",
  tooltip = "Volumen de chats agrupados por día u hora dentro del rango filtrado.",
}: ConversationsAreaChartProps) {
  const chartData = data.map((d) => ({ label: d.label, count: d.count }));
  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          {title}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="fillCount"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="var(--color-count)" stopOpacity={0.4} />
                <stop offset="1" stopColor="var(--color-count)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => String(v)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              fill="url(#fillCount)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
