"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { TOPOJSON_NAME_TO_CODE, type CountryCount } from "@/lib/dashboard-aggregation";

const ComposableMap = dynamic(
  () => import("react-simple-maps").then((m) => m.ComposableMap),
  { ssr: false }
);
const Geographies = dynamic(
  () => import("react-simple-maps").then((m) => m.Geographies),
  { ssr: false }
);
const Geography = dynamic(
  () => import("react-simple-maps").then((m) => m.Geography),
  { ssr: false }
);

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryMapChartProps {
  data: CountryCount[];
}

function getFillColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "#e5e7eb";
  const intensity = count / max;
  if (intensity >= 0.75) return "hsl(12 76% 61% / 0.9)";
  if (intensity >= 0.5) return "hsl(12 76% 61% / 0.65)";
  if (intensity >= 0.25) return "hsl(12 76% 61% / 0.4)";
  return "hsl(12 76% 61% / 0.2)";
}

export function CountryMapChart({ data }: CountryMapChartProps) {
  const countryByKey = useMemo(() => {
    const m = new Map<string, CountryCount>();
    for (const c of data) {
      m.set(c.name.toLowerCase().trim(), c);
      m.set(c.code, c);
      m.set(c.code3, c);
    }
    return m;
  }, [data]);

  const resolveCountry = (geoName: string, geoId: string): CountryCount | undefined => {
    const nameLower = geoName.trim().toLowerCase();
    const direct = countryByKey.get(nameLower) ?? countryByKey.get(geoId);
    if (direct) return direct;
    const code = TOPOJSON_NAME_TO_CODE[nameLower];
    if (code) return countryByKey.get(code);
    return undefined;
  };

  const maxCount = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          Contactos por país
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Distribución geográfica de chats WhatsApp según prefijo telefónico.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cantidad de conversaciones según país de origen · Total: {data.reduce((s, d) => s + d.count, 0)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="aspect-[2/1] w-full overflow-hidden rounded-md">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 120,
              center: [-55, -25],
            }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                (geographies as Array<{ properties?: { name?: string }; id?: string; rsmKey?: string }>).map((geo) => {
                  const props = geo.properties;
                  const name = props?.name ?? "";
                  const geoId = geo.id ?? "";
                  const country = resolveCountry(name, geoId);
                  const count = country?.count ?? 0;
                  const label = country?.name ?? props?.name ?? geoId;
                  return (
                    <Geography
                      key={geo.rsmKey ?? geoId}
                      geography={geo}
                      fill={getFillColor(count, maxCount)}
                      stroke="var(--border)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", opacity: 0.8 },
                        pressed: { outline: "none" },
                      }}
                    >
                      <title>
                        {label}: {count} chats
                      </title>
                    </Geography>
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {data.slice(0, 8).map((c) => (
            <span key={c.code}>
              {c.name}: {c.count}
            </span>
          ))}
          {data.length > 8 && (
            <span>+{data.length - 8} más</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
