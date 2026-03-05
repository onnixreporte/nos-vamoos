import { endOfDay, startOfDay, startOfMonth, subDays } from "date-fns";
import { TZDate } from "@date-fns/tz";

export const PY_TZ = "America/Asuncion";

export function toPYTime(date: Date): TZDate {
  return new TZDate(date, PY_TZ);
}

export type FilterPreset = "today" | "yesterday" | "week" | "month" | "custom";

export interface DateFilter {
  from: string;
  to: string;
  longTerm?: boolean;
}

export function formatForApi(date: Date): string {
  return new Date(date.getTime()).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildPresetRange(
  preset: "today" | "yesterday" | "week" | "month"
): DateFilter {
  const now = new TZDate(new Date(), PY_TZ);
  let start: Date;
  let end: Date = endOfDay(now);
  let longTerm = false;

  switch (preset) {
    case "today":
      start = startOfDay(now);
      break;
    case "yesterday":
      start = startOfDay(subDays(now, 1));
      end = endOfDay(subDays(now, 1));
      break;
    case "week":
      start = startOfDay(subDays(now, 6));
      longTerm = true;
      break;
    case "month":
      start = startOfMonth(now);
      longTerm = true;
      break;
  }

  return {
    from: formatForApi(start),
    to: formatForApi(end),
    longTerm,
  };
}

export function toIsoWithTime(date: Date, time: string, asEnd = false): string {
  const parts = time.split(":");
  const hours = Number(parts[0] ?? 0);
  const minutes = Number(parts[1] ?? 0);
  const composed = new TZDate(date, PY_TZ);
  composed.setHours(hours, minutes, asEnd ? 59 : 0, asEnd ? 999 : 0);
  return formatForApi(composed);
}

export const PRESETS: { key: FilterPreset; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "custom", label: "Personalizado" },
];
