"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DollarSign,
  Eye,
  Info,
  MousePointerClick,
  TrendingUp,
  Users,
} from "lucide-react";
import type { MetaTotals } from "@/lib/meta-aggregation";

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

interface MetaKpiCardsProps {
  totals: MetaTotals;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es");
}

function fmtMoney(n: number): string {
  return n.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtMoney2(n: number): string {
  return n.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Kpi({
  icon,
  title,
  tip,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  tip: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon}
          {title}
          <InfoTip text={tip} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function MetaKpiCards({ totals }: MetaKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <Kpi
        icon={<DollarSign className="size-3.5" />}
        title="Gasto total"
        tip="Inversión total en anuncios Meta durante el rango filtrado."
        value={fmtMoney(totals.spend)}
      />
      <Kpi
        icon={<Eye className="size-3.5" />}
        title="Impresiones"
        tip="Veces que los anuncios fueron mostrados."
        value={fmtInt(totals.impressions)}
      />
      <Kpi
        icon={<Users className="size-3.5" />}
        title="Alcance"
        tip="Personas únicas que vieron los anuncios."
        value={fmtInt(totals.reach)}
      />
      <Kpi
        icon={<MousePointerClick className="size-3.5" />}
        title="Clicks"
        tip="Total de clicks en los anuncios."
        value={fmtInt(totals.clicks)}
      />
      <Kpi
        icon={<TrendingUp className="size-3.5" />}
        title="CPC"
        tip="Costo promedio por click."
        value={fmtMoney2(totals.cpc)}
      />
    </div>
  );
}
