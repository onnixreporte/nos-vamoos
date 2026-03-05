import { format, parseISO, startOfDay, startOfHour } from "date-fns";
import { es } from "date-fns/locale";
import type { AgentMetricsItem, ChatWithMessagesResponse } from "@/types/botmaker";
import { toPYTime } from "@/lib/date-filters";
import {
  normalizeTypification,
  isTestTypification,
} from "@/lib/dashboard-filters";

function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isSale(chat: ChatWithMessagesResponse): boolean {
  return parseNum(chat.variables?.monto_venta) > 0;
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export interface SalesKpis {
  totalChats: number;
  totalSales: number;
  conversionRate: number;
  totalAmount: number;
  avgTicket: number;
  avgPassengers: number;
  avgTripDays: number;
}

export function computeSalesKpis(chats: ChatWithMessagesResponse[]): SalesKpis {
  const totalChats = chats.length;
  let totalSales = 0;
  let totalAmount = 0;
  let passengersSum = 0;
  let passengersCount = 0;
  let daysSum = 0;
  let daysCount = 0;

  for (const chat of chats) {
    const amount = parseNum(chat.variables?.monto_venta);
    if (amount <= 0) continue;
    totalSales++;
    totalAmount += amount;

    const pax = parseNum(chat.variables?.cantidad_pasajeros);
    if (pax > 0) {
      passengersSum += pax;
      passengersCount++;
    }
    const days = parseNum(chat.variables?.cantidad_dias);
    if (days > 0) {
      daysSum += days;
      daysCount++;
    }
  }

  return {
    totalChats,
    totalSales,
    conversionRate: totalChats > 0 ? (totalSales / totalChats) * 100 : 0,
    totalAmount,
    avgTicket: totalSales > 0 ? totalAmount / totalSales : 0,
    avgPassengers: passengersCount > 0 ? passengersSum / passengersCount : 0,
    avgTripDays: daysCount > 0 ? daysSum / daysCount : 0,
  };
}

// ---------------------------------------------------------------------------
// Typification
// ---------------------------------------------------------------------------

export interface LabelCount {
  label: string;
  count: number;
}

export function countByTypification(
  agentItems: AgentMetricsItem[],
): LabelCount[] {
  const counts = new Map<string, number>();
  for (const item of agentItems) {
    const raw = item.typification?.trim();
    if (!raw) continue;
    const normalized = normalizeTypification(raw);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Tags (raw values from chat.tags column)
// ---------------------------------------------------------------------------

export function countByTag(chats: ChatWithMessagesResponse[]): LabelCount[] {
  const counts = new Map<string, number>();
  for (const chat of chats) {
    if (!chat.tags?.length) continue;
    for (const tag of chat.tags) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Agents by sales
// ---------------------------------------------------------------------------

export interface AgentSalesCount {
  agentName: string;
  salesCount: number;
  totalAmount: number;
}

export function topAgentsBySales(
  chats: ChatWithMessagesResponse[],
  agentItems: AgentMetricsItem[],
  limit: number = 8,
): AgentSalesCount[] {
  const agentNameById = new Map<string, string>();
  const agentNameByChatId = new Map<string, string>();
  for (const item of agentItems) {
    if (item.agentId && item.agentName) {
      agentNameById.set(item.agentId, item.agentName);
    }
    if (item.chatId && item.agentName) {
      agentNameByChatId.set(item.chatId, item.agentName);
    }
  }

  const byAgent = new Map<string, { salesCount: number; totalAmount: number }>();

  for (const chat of chats) {
    if (!isSale(chat)) continue;
    const name =
      agentNameByChatId.get(chat.chat.chatId) ??
      (chat.agentId ? agentNameById.get(chat.agentId) : undefined) ??
      "Sin agente";
    const acc = byAgent.get(name) ?? { salesCount: 0, totalAmount: 0 };
    acc.salesCount++;
    acc.totalAmount += parseNum(chat.variables?.monto_venta);
    byAgent.set(name, acc);
  }

  return Array.from(byAgent.entries())
    .map(([agentName, v]) => ({ agentName, ...v }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Top sold destinations
// ---------------------------------------------------------------------------

export interface SoldDestination {
  destination: string;
  count: number;
  totalAmount: number;
}

export function topSoldDestinations(
  chats: ChatWithMessagesResponse[],
  limit: number = 8,
): SoldDestination[] {
  const byDest = new Map<string, { count: number; totalAmount: number }>();

  for (const chat of chats) {
    if (!isSale(chat)) continue;
    const dest = chat.variables?.destino_viaje?.trim() || "Sin destino";
    const acc = byDest.get(dest) ?? { count: 0, totalAmount: 0 };
    acc.count++;
    acc.totalAmount += parseNum(chat.variables?.monto_venta);
    byDest.set(dest, acc);
  }

  return Array.from(byDest.entries())
    .map(([destination, v]) => ({ destination, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function countSalesByPackageType(
  chats: ChatWithMessagesResponse[],
): LabelCount[] {
  const counts = new Map<string, number>();
  for (const chat of chats) {
    if (!isSale(chat)) continue;
    const raw = chat.variables?.tipo_paquete?.trim() || "Sin tipo";
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Sales over time
// ---------------------------------------------------------------------------

export interface SalesTimeBucket {
  label: string;
  amount: number;
  count: number;
}

export function groupSalesByTime(
  chats: ChatWithMessagesResponse[],
  granularity: "hour" | "day",
): SalesTimeBucket[] {
  const buckets = new Map<string, { amount: number; count: number }>();

  for (const chat of chats) {
    if (!isSale(chat)) continue;
    const raw = chat.lastUserMessageDatetime ?? chat.creationTime;
    if (!raw) continue;
    let date: Date;
    try {
      date = toPYTime(parseISO(raw));
    } catch {
      continue;
    }
    const key =
      granularity === "hour"
        ? format(startOfHour(date), "HH:mm", { locale: es })
        : format(startOfDay(date), "dd MMM", { locale: es });
    const acc = buckets.get(key) ?? { amount: 0, count: 0 };
    acc.amount += parseNum(chat.variables?.monto_venta);
    acc.count++;
    buckets.set(key, acc);
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((label) => {
    const b = buckets.get(label)!;
    return { label, amount: b.amount, count: b.count };
  });
}
