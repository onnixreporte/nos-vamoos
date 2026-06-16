"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SalesKpis } from "@/lib/sales-aggregation";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  ShoppingCart,
} from "lucide-react";

interface SalesKpiCardsProps {
  kpis: SalesKpis;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("es-PY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SalesKpiCards({ kpis }: SalesKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Tasa de conversión contactos únicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.conversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {kpis.totalSales} ventas de {kpis.totalChats} chats
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Tasa de conversión (Derivadas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.conversionRateAttended.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {kpis.totalSales} ventas de {kpis.attendedConversations} atendidas
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Tasa conversión orgánica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.organicConversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            Contactos orgánicos con venta
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Tasa conversión Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.adsConversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            Contactos Ads con venta
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="size-3.5" />
            Monto total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(kpis.totalAmount)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Receipt className="size-3.5" />
            Ticket promedio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(kpis.avgTicket)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ShoppingCart className="size-3.5" />
            Ventas cerradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.totalSales}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
