"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { OriginCount } from "@/lib/destinations-aggregation";

interface TravelerOriginBarChartProps {
  data: OriginCount[];
}

const chartConfig = {
  origin: { label: "Origen", color: "var(--chart-3)" },
  count: { label: "Consultas", color: "var(--chart-3)" },
} satisfies ChartConfig;

const ALLOWED_ORIGINS = new Set(["organico", "organica", "organic", "pauta", "pautas"]);

function normalizeOrigin(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function TravelerOriginBarChart({ data }: TravelerOriginBarChartProps) {
  const chartData = data
    .filter((d) => ALLOWED_ORIGINS.has(normalizeOrigin(d.origin)))
    .map((d) => ({
      origin:
        d.origin.length > 20 ? d.origin.slice(0, 20) + "…" : d.origin,
      count: d.count,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Origen de viajeros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="origin"
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
