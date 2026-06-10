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
import { MessageSquare, DollarSign, CheckCircle, Clock, Info, Users, Timer, Activity, Megaphone } from "lucide-react";

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

const fmtAmount = (n: number) =>
  n.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export function OverviewKpiCards({ kpis }: OverviewKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <MessageSquare className="size-3.5" />
            Total Contactos
            <InfoTip text="Chats únicos en el rango filtrado." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {kpis.totalContacts}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Activity className="size-3.5" />
            Sesiones
            <InfoTip text="Total de sesiones (aperturas de conversación) en el rango filtrado." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {(kpis.totalSessions ?? 0).toLocaleString("es")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Users className="size-3.5" />
            Conversaciones atendidas por agente
            <InfoTip text="Conversaciones atendidas por agentes en el rango filtrado." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {kpis.attendedConversations.toLocaleString("es")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <DollarSign className="size-3.5" />
            Ventas orgánicas
            <InfoTip text="Monto de ventas de chats sin origen de pauta (variable origen distinta de 'pauta' o sin cargar)." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtAmount(kpis.organicSalesAmount)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Megaphone className="size-3.5" />
            Ventas por Ads
            <InfoTip text="Monto de ventas de chats que llegaron desde anuncios (variable origen = 'pauta')." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtAmount(kpis.adsSalesAmount)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <CheckCircle className="size-3.5" />
            Conversaciones cerradas
            <InfoTip text="Chats cerrados." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {kpis.closedConversations}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Clock className="size-3.5" />
            T. prom. 1ª respuesta
            <InfoTip text="Tiempo promedio entre asignación de operador y primera respuesta." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {formatDuration(kpis.avgFirstResponseMs)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Timer className="size-3.5" />
            T. prom. atención
            <InfoTip text="Tiempo promedio de atención por conversación cerrada, ponderado por cantidad de cierres por agente." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {formatDuration(kpis.avgAttendingMs)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
