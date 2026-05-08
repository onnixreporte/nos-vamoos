// Botmaker rejects from-to ranges greater than 1 calendar month with
// INVALID_DATETIME_INTERVAL. We split into 28-day windows for safety margin.
export const MAX_WINDOW_DAYS = 28;
const MAX_WINDOW_MS = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface DateWindow {
  from: string;
  to: string;
}

function toBotmakerIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

export function needsSplit(fromIso: string, toIso: string): boolean {
  return Date.parse(toIso) - Date.parse(fromIso) > MAX_WINDOW_MS;
}

export function splitDateRange(fromIso: string, toIso: string): DateWindow[] {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
    return [{ from: fromIso, to: toIso }];
  }
  const windows: DateWindow[] = [];
  let cursor = fromMs;
  while (cursor < toMs) {
    const end = Math.min(cursor + MAX_WINDOW_MS - 1, toMs);
    windows.push({ from: toBotmakerIso(cursor), to: toBotmakerIso(end) });
    cursor = end + 1;
  }
  return windows;
}
