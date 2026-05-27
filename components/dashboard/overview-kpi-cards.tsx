"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/agent-aggregation";
import type { OverviewKpis } from "@/lib/dashboard-aggregation";
import { MessageSquare, DollarSign, CheckCircle, Clock, Info, Users, Timer, Activity } from "lucide-react";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="size-3 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface OverviewKpiCardsProps {
  kpis: OverviewKpis;
}

export function OverviewKpiCards({ kpis }: OverviewKpiCardsProps) {
  const formattedAmount = kpis.totalSalesAmount.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            Total Contactos
            <InfoTip text="Chats únicos en el rango filtrado." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.totalContacts}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Sesiones
            <InfoTip text="Total de sesiones (aperturas de conversación) en el rango filtrado." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {(kpis.totalSessions ?? 0).toLocaleString("es")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5" />
            Conversaciones atendidas por agente
            <InfoTip text="Conversaciones atendidas por agentes en el rango filtrado." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.attendedConversations.toLocaleString("es")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="size-3.5" />
            Monto total ventas
            <InfoTip text="Suma de monto_venta de chats con venta cargada." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formattedAmount}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="size-3.5" />
            Conversaciones cerradas
            <InfoTip text="Chats cerrados." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.closedConversations}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5" />
            T. prom. 1ª respuesta
            <InfoTip text="Tiempo promedio entre asignación de operador y primera respuesta." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatDuration(kpis.avgFirstResponseMs)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Timer className="size-3.5" />
            T. prom. atención
            <InfoTip text="Tiempo promedio de atención por conversación cerrada, ponderado por cantidad de cierres por agente." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatDuration(kpis.avgAttendingMs)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
