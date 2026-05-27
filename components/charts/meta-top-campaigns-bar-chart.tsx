"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CampaignBucket } from "@/lib/meta-aggregation";

interface MetaTopCampaignsBarChartProps {
  data: CampaignBucket[];
  limit?: number;
}

const chartConfig = {
  spend: { label: "Gasto", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MetaTopCampaignsBarChart({ data, limit = 8 }: MetaTopCampaignsBarChartProps) {
  const chartData = data.slice(0, limit).map((d) => ({
    name: d.name.length > 28 ? d.name.slice(0, 28) + "…" : d.name,
    fullName: d.name,
    spend: Math.round(d.spend),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Top campañas por gasto
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Campañas con mayor inversión en el rango filtrado.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => {
                    const p = payload?.[0]?.payload as
                      | { fullName?: string }
                      | undefined;
                    return p?.fullName ?? _label;
                  }}
                />
              }
            />
            <Bar dataKey="spend" fill="var(--color-spend)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
