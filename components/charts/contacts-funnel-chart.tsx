"use client";

import { Funnel, FunnelChart, LabelList, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ContactsFunnelChartProps {
  /** Conversaciones iniciadas desde anuncios de Meta (messaging_conversation_started). */
  conversationsStarted: number;
  /** Total de contactos únicos (orgánicos + ads). */
  totalContacts: number;
  /** Conversaciones atendidas por un agente. */
  attendedConversations: number;
  /** Ventas cerradas (cantidad de chats con monto_venta > 0). */
  salesCount: number;
}

const STAGE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

const chartConfig = {
  value: { label: "Cantidad" },
} satisfies ChartConfig;

const fmtInt = (n: number) => (n ?? 0).toLocaleString("es");

export function ContactsFunnelChart({
  conversationsStarted,
  totalContacts,
  attendedConversations,
  salesCount,
}: ContactsFunnelChartProps) {
  const chartData = [
    { stage: "Conversaciones iniciadas", value: conversationsStarted, fill: STAGE_COLORS[0] },
    { stage: "Total contactos", value: totalContacts, fill: STAGE_COLORS[1] },
    { stage: "Conversaciones atendidas", value: attendedConversations, fill: STAGE_COLORS[2] },
    { stage: "Ventas cerradas", value: salesCount, fill: STAGE_COLORS[3] },
  ];

  const top = chartData[0].value;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Funnel de captación
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Conversaciones iniciadas desde anuncios de Meta → total de contactos →
                conversaciones atendidas por un agente → ventas cerradas.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <FunnelChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="stage" hideLabel />}
            />
            <Funnel
              dataKey="value"
              data={chartData}
              nameKey="stage"
              isAnimationActive
              stroke="var(--background)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.stage} fill={entry.fill} />
              ))}
              <LabelList
                position="center"
                dataKey="value"
                stroke="none"
                className="fill-white text-sm font-semibold tabular-nums"
                formatter={(v: number) => fmtInt(v)}
              />
            </Funnel>
          </FunnelChart>
        </ChartContainer>

        <ul className="mt-3 flex flex-col gap-1.5 text-xs">
          {chartData.map((d) => {
            const pct = top > 0 ? Math.round((d.value / top) * 100) : 0;
            return (
              <li key={d.stage} className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="truncate">{d.stage}</span>
                <span className="ml-auto tabular-nums font-medium">
                  {fmtInt(d.value)}
                </span>
                <span className="w-10 text-right tabular-nums text-muted-foreground">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
