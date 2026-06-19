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
import { MessageSquare, DollarSign, CheckCircle, Clock, Info, Users, Timer, Megaphone, Percent } from "lucide-react";

const fmtInt = (n: number) => (n ?? 0).toLocaleString("es");
const fmtPct = (n: number) =>
  `${(n ?? 0).toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

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
            <InfoTip text="Contactos únicos en el rango filtrado (orgánicos + Ads)." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtInt(kpis.totalContacts)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <MessageSquare className="size-3.5" />
            Contactos orgánicos
            <InfoTip text="Contactos únicos sin referido de anuncio de Meta." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtInt(kpis.organicContacts)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Megaphone className="size-3.5" />
            Contactos Ads
            <InfoTip text="Contactos únicos iniciados desde un anuncio de Meta." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtInt(kpis.adsContacts)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <DollarSign className="size-3.5" />
            Ventas orgánicas
            <InfoTip text="Monto de ventas de chats sin referido de anuncio de Meta." />
          </CardTitle>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {fmtInt(kpis.organicSalesCount)} ventas
          </p>
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
            <InfoTip text="Monto de ventas de chats iniciados desde un anuncio de Meta (referralSourceType = 'ad')." />
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
            <Percent className="size-3.5" />
            Tasa conversión orgánica
            <InfoTip text="% de contactos orgánicos que registraron una venta (monto_venta)." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtPct(kpis.organicConversionRate)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Percent className="size-3.5" />
            Tasa conversión Ads
            <InfoTip text="% de contactos Ads que registraron una venta (monto_venta)." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtPct(kpis.adsConversionRate)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 leading-tight">
            <Percent className="size-3.5" />
            Tasa de conversión (atendidas por agente)
            <InfoTip text="% de ventas sobre conversaciones atendidas por agente (ventas / atendidas)." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold tabular-nums">
            {fmtPct(kpis.conversionRateAttended)}
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
            {(kpis.attendedContacts ?? kpis.attendedConversations).toLocaleString("es")}
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
            {kpis.avgFirstResponseMs > 0 ? formatDuration(kpis.avgFirstResponseMs) : "—"}
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
            {kpis.avgAttendingMs > 0 ? formatDuration(kpis.avgAttendingMs) : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
