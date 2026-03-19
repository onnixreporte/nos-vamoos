"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DestinationCount } from "@/lib/destinations-aggregation";

interface TopConsultedDestinationsChartProps {
  data: DestinationCount[];
}

const chartConfig = {
  destination: { label: "Destino", color: "var(--chart-2)" },
  count: { label: "Consultas", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TopConsultedDestinationsChart({
  data,
}: TopConsultedDestinationsChartProps) {
  const chartData = data.map((d) => ({
    destination:
      d.destination.length > 20
        ? d.destination.slice(0, 20) + "…"
        : d.destination,
    count: d.count,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Top destinos consultados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} style={{ height: Math.max(250, chartData.length * 36) }} className="w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="destination"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
