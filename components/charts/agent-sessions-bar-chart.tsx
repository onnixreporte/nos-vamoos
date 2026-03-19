"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AgentSummary } from "@/types/botmaker";

interface AgentSessionsBarChartProps {
  agents: AgentSummary[];
  limit?: number;
}

const chartConfig = {
  closed: {
    label: "Cerradas",
    color: "var(--chart-1)",
  },
  open: {
    label: "Abiertas",
    color: "var(--chart-2)",
  },
  agent: {
    label: "Agente",
  },
} satisfies ChartConfig;

export function AgentSessionsBarChart({
  agents,
  limit = 8,
}: AgentSessionsBarChartProps) {
  const chartData = agents
    .slice(0, limit)
    .map((a) => ({
      agent: a.agentName || a.agentId || "Sin nombre",
      closed: a.closedConversations,
      open: a.openConversations,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Conversaciones por agente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="agent"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, textAnchor: "end" }}
              angle={-35}
              interval={0}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
            />
            <Bar
              dataKey="closed"
              stackId="a"
              fill="var(--color-closed)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="open"
              stackId="a"
              fill="var(--color-open)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
