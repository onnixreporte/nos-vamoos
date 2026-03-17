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
  return new Date(date.getTime()).toISOString();
}

/**
 * Build a date range for a given preset, anchored to Paraguay time (PY_TZ).
 *
 * We construct TZDate instances explicitly with the PY_TZ argument so that
 * year/month/day values always refer to Paraguay local time, regardless of the
 * browser's own timezone. Relying on date-fns helpers (startOfMonth, endOfDay,
 * subDays …) was unsafe because date-fns creates clones via `new TZDate(ms)`
 * (single-arg, no timezone), causing setters to fall back to the browser
 * timezone and producing wrong UTC boundaries for non-PY clients.
 */
export function buildPresetRange(
  preset: "today" | "yesterday" | "week" | "month"
): DateFilter {
  const now = new TZDate(new Date(), PY_TZ);
  const y = now.getFullYear();
  const mo = now.getMonth();
  const d = now.getDate();

  let start: TZDate;
  // Default end: 23:59:59.999 today in Paraguay
  let end: TZDate = new TZDate(y, mo, d, 23, 59, 59, 999, PY_TZ);

  switch (preset) {
    case "today":
      start = new TZDate(y, mo, d, 0, 0, 0, 0, PY_TZ);
      break;
    case "yesterday": {
      // Go back 24 h then read Paraguay date components to handle DST correctly
      const prev = new TZDate(now.getTime() - 24 * 60 * 60 * 1000, PY_TZ);
      const py = prev.getFullYear(), pm = prev.getMonth(), pd = prev.getDate();
      start = new TZDate(py, pm, pd, 0, 0, 0, 0, PY_TZ);
      end   = new TZDate(py, pm, pd, 23, 59, 59, 999, PY_TZ);
      break;
    }
    case "week": {
      // Start of day, 6 days ago in Paraguay
      const prev = new TZDate(now.getTime() - 6 * 24 * 60 * 60 * 1000, PY_TZ);
      start = new TZDate(prev.getFullYear(), prev.getMonth(), prev.getDate(), 0, 0, 0, 0, PY_TZ);
      break;
    }
    case "month":
      start = new TZDate(y, mo, 1, 0, 0, 0, 0, PY_TZ);
      break;
    default:
      start = new TZDate(y, mo, d, 0, 0, 0, 0, PY_TZ);
  }

  return {
    from: formatForApi(start),
    to: formatForApi(end),
    longTerm: true,
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
