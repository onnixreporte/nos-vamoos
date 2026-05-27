"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface ComparisonHourPoint {
  hour: string;
  countA: number;
  countB: number;
}

interface ComparisonHourChartProps {
  data: ComparisonHourPoint[];
}

const chartConfig = {
  countA: { label: "Rango A", color: "var(--chart-1)" },
  countB: { label: "Rango B", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ComparisonHourChart({ data }: ComparisonHourChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Horario de contacto (primer mensaje)
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Distribución por hora del día (0-23) del primer mensaje de cada chat,
                usando hora de Paraguay.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={1} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="countA" name="Rango A" fill="var(--color-countA)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="countB" name="Rango B" fill="var(--color-countB)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
