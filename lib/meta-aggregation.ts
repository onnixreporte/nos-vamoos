import type { MetaInsightsRow, MetaAction } from "@/lib/meta-types";

export const WHATSAPP_CONVO_ACTION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.total_messaging_connection",
];

export function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export interface MetaTotals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversations: number;
  costPerConversation: number;
}

export function getActionValue(
  actions: MetaAction[] | undefined,
  types: string[] | string,
): number {
  if (!actions || actions.length === 0) return 0;
  const wanted = Array.isArray(types) ? types : [types];
  let total = 0;
  for (const a of actions) {
    if (wanted.includes(a.action_type)) {
      total += parseNum(a.value);
    }
  }
  return total;
}

export function sumInsights(rows: MetaInsightsRow[]): MetaTotals {
  let spend = 0;
  let impressions = 0;
  let reach = 0;
  let clicks = 0;
  let conversations = 0;
  for (const r of rows) {
    spend += parseNum(r.spend);
    impressions += parseNum(r.impressions);
    reach += parseNum(r.reach);
    clicks += parseNum(r.clicks);
    conversations += getActionValue(r.actions, WHATSAPP_CONVO_ACTION_TYPES);
  }
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const costPerConversation = conversations > 0 ? spend / conversations : 0;
  return { spend, impressions, reach, clicks, ctr, cpc, cpm, conversations, costPerConversation };
}

export interface SpendByDayBucket {
  date: string;
  label: string;
  spend: number;
}

export function groupSpendByDay(rows: MetaInsightsRow[]): SpendByDayBucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.date_start ?? r.date_stop;
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + parseNum(r.spend));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({
      date,
      label: date.slice(5),
      spend: Math.round(spend * 100) / 100,
    }));
}

export interface ConversationsByDayBucket {
  label: string;
  count: number;
}

export function groupConversationsByDayFromInsights(
  rows: MetaInsightsRow[],
): ConversationsByDayBucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.date_start ?? r.date_stop;
    if (!key) continue;
    const conv = getActionValue(r.actions, WHATSAPP_CONVO_ACTION_TYPES);
    map.set(key, (map.get(key) ?? 0) + conv);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      label: date.slice(5),
      count: Math.round(count),
    }));
}

export interface CampaignBucket {
  campaignId: string;
  name: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number;
}

export function aggregateCampaigns(rows: MetaInsightsRow[]): CampaignBucket[] {
  const map = new Map<string, CampaignBucket>();
  for (const r of rows) {
    const id = r.campaign_id ?? r.campaign_name ?? "—";
    const existing = map.get(id) ?? {
      campaignId: id,
      name: r.campaign_name ?? id,
      objective: r.objective ?? "—",
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversations: 0,
    };
    existing.spend += parseNum(r.spend);
    existing.impressions += parseNum(r.impressions);
    existing.clicks += parseNum(r.clicks);
    existing.conversations += getActionValue(r.actions, WHATSAPP_CONVO_ACTION_TYPES);
    map.set(id, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
}

export interface PlacementBucket {
  placement: string;
  spend: number;
}

export function groupByPlacement(rows: MetaInsightsRow[]): PlacementBucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const platform = r.publisher_platform ?? "unknown";
    const position = r.platform_position ?? "";
    const key = position ? `${platform} · ${position}` : platform;
    map.set(key, (map.get(key) ?? 0) + parseNum(r.spend));
  }
  return Array.from(map.entries())
    .map(([placement, spend]) => ({ placement, spend }))
    .sort((a, b) => b.spend - a.spend);
}

export interface ObjectiveBucket {
  objective: string;
  spend: number;
  count: number;
}

export function groupByObjective(campaigns: CampaignBucket[]): ObjectiveBucket[] {
  const map = new Map<string, { spend: number; count: number }>();
  for (const c of campaigns) {
    const existing = map.get(c.objective) ?? { spend: 0, count: 0 };
    existing.spend += c.spend;
    existing.count += 1;
    map.set(c.objective, existing);
  }
  return Array.from(map.entries())
    .map(([objective, { spend, count }]) => ({ objective, spend, count }))
    .sort((a, b) => b.spend - a.spend);
}
