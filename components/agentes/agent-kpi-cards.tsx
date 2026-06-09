"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration } from "@/lib/agent-aggregation";
import type { AgentSummary } from "@/types/botmaker";
import { MessageSquare, Clock, Timer } from "lucide-react";

interface AgentKpiCardsProps {
  agents: AgentSummary[];
  avgFirstResponseMsOverride?: number;
}

function weightedAvg(
  agents: AgentSummary[],
  value: (a: AgentSummary) => number,
  weight: (a: AgentSummary) => number
): number {
  let sumVal = 0;
  let sumWeight = 0;
  for (const a of agents) {
    const w = weight(a);
    if (w > 0) {
      sumVal += value(a) * w;
      sumWeight += w;
    }
  }
  return sumWeight > 0 ? sumVal / sumWeight : 0;
}

export function AgentKpiCards({ agents, avgFirstResponseMsOverride }: AgentKpiCardsProps) {
  const totalClosed = agents.reduce((s, a) => s + a.closedConversations, 0);
  const avgFirstResponseMs =
    avgFirstResponseMsOverride !== undefined
      ? avgFirstResponseMsOverride
      : weightedAvg(
          agents,
          (a) => a.avgFirstResponseMs,
          (a) => a.closedConversations
        );
  const avgAttendingMs = weightedAvg(
    agents,
    (a) => a.avgAttendingTimeMs,
    (a) => a.closedConversations
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            Conversaciones cerradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{totalClosed}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5" />
            T. prom. 1ª respuesta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatDuration(avgFirstResponseMs)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Timer className="size-3.5" />
            T. prom. atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatDuration(avgAttendingMs)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
