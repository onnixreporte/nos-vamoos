"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  sessions: {
    label: "Sesiones cerradas",
    color: "var(--chart-1)",
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
      sessions: a.closedSessions,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Sesiones por agente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="agent"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="sessions"
              fill="var(--color-sessions)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
