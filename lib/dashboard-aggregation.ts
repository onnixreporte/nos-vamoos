import { format, parseISO, startOfDay, startOfHour } from "date-fns";
import { es } from "date-fns/locale";
import type { AgentMetricsItem, ChatWithMessagesResponse } from "@/types/botmaker";
import { toPYTime } from "@/lib/date-filters";
import { countryFromPhone } from "@/lib/phone-country";

export interface OverviewKpis {
  totalConversations: number;
  totalSalesAmount: number;
  /** Monto de ventas de chats con variables.origen = pauta. */
  adsSalesAmount: number;
  /** Monto de ventas del resto (origen distinto de pauta o sin cargar). */
  organicSalesAmount: number;
  closedConversations: number;
  avgFirstResponseMs: number;
  avgAttendingMs: number;
  avgBotAttendingMs: number;
  totalSessions?: number;
  totalContacts: number;
  attendedConversations: number;
}

function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Quita acentos, espacios y mayúsculas para comparar valores de `origen`. */
export function normalizeOrigin(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const ADS_ORIGINS = new Set(["pauta", "pautas"]);

/** Chat proveniente de un anuncio según la variable `origen` cargada en Botmaker. */
export function isAdsOrigin(chat: ChatWithMessagesResponse): boolean {
  const origin = chat.variables?.origen;
  return origin != null && ADS_ORIGINS.has(normalizeOrigin(origin));
}

/**
 * Compute KPI values for the overview dashboard.
 */
export function computeOverviewKpis(
  chats: ChatWithMessagesResponse[],
  agentItems: AgentMetricsItem[],
  agentItemsForUserCount?: AgentMetricsItem[]
): OverviewKpis {
  const uniqueUserIds = new Set<string>();
  for (const item of agentItemsForUserCount ?? agentItems) {
    if (item.chatId) uniqueUserIds.add(item.chatId);
  }
  const totalConversations = uniqueUserIds.size;

  let totalSalesAmount = 0;
  let adsSalesAmount = 0;
  for (const chat of chats) {
    const val = chat.variables?.monto_venta;
    if (val != null && val !== "") {
      const amount = parseNum(val);
      totalSalesAmount += amount;
      if (isAdsOrigin(chat)) adsSalesAmount += amount;
    }
  }
  const organicSalesAmount = totalSalesAmount - adsSalesAmount;

  const closedConversationIds = new Set<string>();
  let firstResponseSumMs = 0;
  let firstResponseCount = 0;
  for (const item of agentItems) {
    if (item.chatId && parseNum(item.closedSessions) > 0) {
      closedConversationIds.add(item.chatId);
    }
    const ms = parseNum(item.fromOpAssignedToOpFirstResponse) * 1000;
    if (ms > 0) {
      firstResponseSumMs += ms;
      firstResponseCount += 1;
    }
  }
  const avgFirstResponseMs =
    firstResponseCount > 0 ? firstResponseSumMs / firstResponseCount : 0;

  const uniqueContactIds = new Set<string>();
  for (const chat of chats) {
    const id = chat.chat?.contactId;
    if (id) uniqueContactIds.add(id);
  }

  let attendedConversations = 0;
  for (const item of agentItems) {
    attendedConversations +=
      parseNum(item.openSessions) + parseNum(item.closedSessions);
  }

  return {
    totalConversations,
    totalSalesAmount,
    adsSalesAmount,
    organicSalesAmount,
    closedConversations: closedConversationIds.size,
    avgFirstResponseMs,
    avgAttendingMs: 0,
    avgBotAttendingMs: 0,
    totalContacts: uniqueContactIds.size,
    attendedConversations,
  };
}

export interface TimeBucket {
  label: string;
  count: number;
  fullLabel?: string;
}

/**
 * Group conversations by hour (for "today") or by day (for "week"/"month").
 * When `isToday` is true and granularity is "hour", buckets after the current
 * hour in Paraguay time are excluded so the chart doesn't show future hours.
 */
export function groupConversationsByTime(
  chats: ChatWithMessagesResponse[],
  granularity: "hour" | "day",
  isToday = false,
  rangeFromIso?: string,
  rangeToIso?: string,
): TimeBucket[] {
  const buckets = new Map<string, number>();

  // When showing today's hourly view, determine the current hour in PY time
  // so we can cap the x-axis at the present.
  const nowPY = toPYTime(new Date());
  const currentHourKey = format(startOfHour(nowPY), "HH:mm", { locale: es });

  const rangeFromMs = rangeFromIso ? new Date(rangeFromIso).getTime() : null;
  const rangeToMs = rangeToIso ? new Date(rangeToIso).getTime() : null;

  for (const chat of chats) {
    const raw = chat.lastUserMessageDatetime ?? chat.creationTime;
    if (!raw) continue;
    let date: Date;
    let parsedMs: number;
    try {
      const parsed = parseISO(raw);
      parsedMs = parsed.getTime();
      date = toPYTime(parsed);
    } catch {
      continue;
    }

    if (rangeFromMs !== null && parsedMs < rangeFromMs) continue;
    if (rangeToMs !== null && parsedMs > rangeToMs) continue;

    const key =
      granularity === "hour"
        ? format(startOfHour(date), "HH:mm", { locale: es })
        : format(startOfDay(date), "yyyy-MM-dd", { locale: es });

    // Skip future hours when viewing today
    if (isToday && granularity === "hour" && key > currentHourKey) continue;

    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((label) => ({
    label,
    count: buckets.get(label) ?? 0,
  }));
}

export interface DestinationCount {
  destination: string;
  count: number;
}

/**
 * Count chats by destino_viaje, return top N.
 */
export function countByDestination(
  chats: ChatWithMessagesResponse[],
  limit: number
): DestinationCount[] {
  const counts = new Map<string, number>();
  for (const chat of chats) {
    const dest = chat.variables?.destino_viaje?.trim();
    if (!dest) continue;
    counts.set(dest, (counts.get(dest) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface ChannelCount {
  channel: string;
  count: number;
}

export function normalizeChannelId(channelId: string): string {
  const raw = channelId.trim();
  const normalized = raw.toLowerCase();

  const platformMatch = normalized.match(/^[^-]+-(.+?)-[^-]+$/);
  const platform = platformMatch?.[1] ?? normalized;

  if (platform === "instagram_chat" || platform === "instagram_media") {
    return "Instagram";
  }
  if (platform === "whatsapp") return "WhatsApp";
  if (platform === "messenger") return "Messenger";
  if (platform === "webchat") return "Webchat";
  if (normalized.includes("facebook-page")) return "Facebook";

  return raw;
}

/**
 * Count chats by channelId.
 */
export function countByChannel(chats: ChatWithMessagesResponse[]): ChannelCount[] {
  const counts = new Map<string, number>();
  for (const chat of chats) {
    const ch = normalizeChannelId(chat.chat?.channelId ?? "unknown");
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count);
}

export interface HourDayBucket {
  dayOfWeek: number;
  hour: number;
  count: number;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function getDayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? "";
}

/**
 * Group chats by hour (0-23) and day of week (0=Sunday) using creationTime as "Primer Mensaje".
 */
export function groupByHourAndDay(
  chats: ChatWithMessagesResponse[]
): HourDayBucket[] {
  const grid = new Map<string, number>();
  for (const chat of chats) {
    const raw = chat.creationTime ?? chat.lastUserMessageDatetime;
    if (!raw) continue;
    let date: Date;
    try {
      date = toPYTime(parseISO(raw));
    } catch {
      continue;
    }
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const key = `${dayOfWeek}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }
  const result: HourDayBucket[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const key = `${d}-${h}`;
      result.push({
        dayOfWeek: d,
        hour: h,
        count: grid.get(key) ?? 0,
      });
    }
  }
  return result;
}

export interface DayOfMonthBucket {
  date: string;
  day: number;
  month: number;
  year: number;
  count: number;
}

/**
 * Group chats by day of month for calendar heat map.
 * Returns buckets for the given month (year-month).
 */
export function groupChatsByDayOfMonth(
  chats: ChatWithMessagesResponse[],
  year: number,
  month: number,
  filterFrom?: string,
  filterTo?: string,
): DayOfMonthBucket[] {
  const counts = new Map<number, number>();
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    counts.set(d, 0);
  }

  let minDay = 1;
  let maxDay = daysInMonth;
  if (filterFrom) {
    try {
      const f = toPYTime(parseISO(filterFrom));
      if (f.getFullYear() === year && f.getMonth() === month - 1) {
        minDay = f.getDate();
      }
    } catch {}
  }
  if (filterTo) {
    try {
      const t = toPYTime(parseISO(filterTo));
      if (t.getFullYear() === year && t.getMonth() === month - 1) {
        maxDay = t.getDate();
      }
    } catch {}
  }

  for (const chat of chats) {
    const raw = chat.lastUserMessageDatetime ?? chat.creationTime;
    let day = minDay;
    if (raw) {
      try {
        const date = toPYTime(parseISO(raw));
        const d = date.getDate();
        day = Math.min(Math.max(d, minDay), maxDay);
      } catch {
        day = minDay;
      }
    }
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      month,
      year,
      count: counts.get(day) ?? 0,
    };
  });
}

/**
 * Count sales (chats with monto_venta > 0) per day of month.
 * Returns a Map<day, count>.
 */
export function countSalesByDayOfMonth(
  chats: ChatWithMessagesResponse[],
  year: number,
  month: number,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const chat of chats) {
    const amt = parseNum(chat.variables?.monto_venta);
    if (amt <= 0) continue;
    const raw = chat.lastUserMessageDatetime ?? chat.creationTime;
    if (!raw) continue;
    try {
      const date = toPYTime(parseISO(raw));
      if (date.getFullYear() !== year || date.getMonth() !== month - 1) continue;
      const day = date.getDate();
      counts.set(day, (counts.get(day) ?? 0) + 1);
    } catch {}
  }
  return counts;
}

export interface CountryCount {
  code: string;
  code3: string;
  name: string;
  count: number;
}

const ISO2_TO_ISO3: Record<string, string> = {
  PY: "PRY", AR: "ARG", BR: "BRA", CL: "CHL", CO: "COL", PE: "PER",
  UY: "URY", BO: "BOL", EC: "ECU", VE: "VEN", MX: "MEX", ES: "ESP",
  US: "USA", GB: "GBR", FR: "FRA", DE: "DEU", IT: "ITA",
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  paraguay: "PY",
  argentina: "AR",
  brazil: "BR",
  brasil: "BR",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  perú: "PE",
  uruguay: "UY",
  bolivia: "BO",
  ecuador: "EC",
  venezuela: "VE",
  mexico: "MX",
  méxico: "MX",
  españa: "ES",
  spain: "ES",
  "united states": "US",
  "united states of america": "US",
  "estados unidos": "US",
  usa: "US",
  py: "PY",
  ar: "AR",
  br: "BR",
  cl: "CL",
  co: "CO",
  pe: "PE",
  uy: "UY",
  bo: "BO",
  ec: "EC",
  ve: "VE",
  mx: "MX",
  es: "ES",
  us: "US",
};

export const TOPOJSON_NAME_TO_CODE: Record<string, string> = {
  paraguay: "PY",
  argentina: "AR",
  brazil: "BR",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  uruguay: "UY",
  bolivia: "BO",
  ecuador: "EC",
  venezuela: "VE",
  mexico: "MX",
  spain: "ES",
  "united states of america": "US",
  "united kingdom": "GB",
  france: "FR",
  germany: "DE",
  italy: "IT",
  canada: "CA",
  china: "CN",
  japan: "JP",
  australia: "AU",
  india: "IN",
  russia: "RU",
  "south africa": "ZA",
  "south korea": "KR",
  portugal: "PT",
  netherlands: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  ireland: "IE",
  poland: "PL",
  "czech republic": "CZ",
  czechia: "CZ",
  hungary: "HU",
  romania: "RO",
  greece: "GR",
  turkey: "TR",
  israel: "IL",
  "saudi arabia": "SA",
  "united arab emirates": "AE",
  egypt: "EG",
  nigeria: "NG",
  kenya: "KE",
  morocco: "MA",
  cuba: "CU",
  "dominican republic": "DO",
  "dominican rep.": "DO",
  "costa rica": "CR",
  panama: "PA",
  guatemala: "GT",
  honduras: "HN",
  "el salvador": "SV",
  nicaragua: "NI",
  "puerto rico": "PR",
  "trinidad and tobago": "TT",
  jamaica: "JM",
  guyana: "GY",
  suriname: "SR",
  haiti: "HT",
  "new zealand": "NZ",
  philippines: "PH",
  indonesia: "ID",
  thailand: "TH",
  vietnam: "VN",
  malaysia: "MY",
  singapore: "SG",
  taiwan: "TW",
};

const CODE_TO_NAME: Record<string, string> = {
  PY: "Paraguay",
  AR: "Argentina",
  BR: "Brasil",
  CL: "Chile",
  CO: "Colombia",
  PE: "Perú",
  UY: "Uruguay",
  BO: "Bolivia",
  EC: "Ecuador",
  VE: "Venezuela",
  MX: "México",
  ES: "España",
  US: "Estados Unidos",
};

function normalizeToCode(country: string): string {
  const trimmed = country.trim().toLowerCase();
  if (COUNTRY_NAME_TO_CODE[trimmed]) return COUNTRY_NAME_TO_CODE[trimmed];
  const firstPart = trimmed.split("/")[0]?.trim();
  if (firstPart && COUNTRY_NAME_TO_CODE[firstPart]) return COUNTRY_NAME_TO_CODE[firstPart];
  return trimmed.toUpperCase().slice(0, 2);
}

function codeToDisplayName(code: string, original: string): string {
  return CODE_TO_NAME[code] ?? (original.length > 2 ? original : code);
}

function toCode3(code2: string): string {
  return ISO2_TO_ISO3[code2] ?? code2;
}

/**
 * Count chats by country (País). Returns ISO 3166-1 alpha-2 and alpha-3 for map.
 */
export function countByCountry(chats: ChatWithMessagesResponse[]): CountryCount[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const chat of chats) {
    if (normalizeChannelId(chat.chat?.channelId ?? "") !== "WhatsApp") continue;
    const fromPhone = countryFromPhone(chat.chat?.contactId);
    const raw = (fromPhone ?? chat.country)?.trim();
    if (!raw) continue;
    const code = raw.length === 2 ? raw.toUpperCase() : normalizeToCode(raw);
    const key = code || "XX";
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        name: codeToDisplayName(key, raw),
        count: 1,
      });
    }
  }
  return Array.from(counts.entries())
    .map(([code, { name, count }]) => ({
      code,
      code3: toCode3(code),
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
