"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DestinationKpis } from "@/lib/destinations-aggregation";
import { MapPin, CalendarDays, Users } from "lucide-react";

interface DestinationKpiCardsProps {
  kpis: DestinationKpis;
}

export function DestinationKpiCards({ kpis }: DestinationKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            Destinos consultados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.uniqueDestinations}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Prom. dias de viaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.avgTripDays.toFixed(1)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5" />
            Prom. pasajeros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {kpis.avgPassengers.toFixed(1)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
