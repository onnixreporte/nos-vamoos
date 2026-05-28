import { TZDate } from "@date-fns/tz";
import { PY_TZ } from "@/lib/date-filters";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import type { MetaInsightsResponse, MetaInsightsRow } from "@/lib/meta-types";

const DEFAULT_VERSION = "v25.0";
const MAX_PAGES = 50;

export interface MetaEnv {
  token: string;
  accountId: string;
  version: string;
}

export function readMetaEnv(): MetaEnv | { error: string } {
  const token = process.env.META_ACCESS_TOKEN_PRIVATE;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  if (!token) return { error: "META_ACCESS_TOKEN_PRIVATE is not configured" };
  if (!accountId) return { error: "META_AD_ACCOUNT_ID is not configured" };
  const version = process.env.META_API_VERSION || DEFAULT_VERSION;
  return { token, accountId: accountId.replace(/^act_/, ""), version };
}

export function isoToPYDate(iso: string): string {
  const py = new TZDate(new Date(iso), PY_TZ);
  const y = py.getFullYear();
  const m = String(py.getMonth() + 1).padStart(2, "0");
  const d = String(py.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildInsightsUrl(
  env: MetaEnv,
  fromIso: string,
  toIso: string,
  extraParams: Record<string, string> = {},
): string {
  const url = new URL(
    `https://graph.facebook.com/${env.version}/act_${env.accountId}/insights`,
  );
  url.searchParams.set(
    "time_range",
    JSON.stringify({ since: isoToPYDate(fromIso), until: isoToPYDate(toIso) }),
  );
  url.searchParams.set("access_token", env.token);
  for (const [k, v] of Object.entries(extraParams)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function fetchAllInsights(
  firstUrl: string,
): Promise<{ ok: true; rows: MetaInsightsRow[] } | { ok: false; status: number; details: string }> {
  let url: string | null = firstUrl;
  const acc: MetaInsightsRow[] = [];
  let pages = 0;
  while (url && pages < MAX_PAGES) {
    pages++;
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: 60_000,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[meta] HTTP", res.status, "url:", url, "body:", text.slice(0, 500));
      return { ok: false, status: res.status, details: text };
    }
    const body = (await res.json()) as MetaInsightsResponse;
    if (body.error) {
      return { ok: false, status: 502, details: body.error.message };
    }
    if (body.data?.length) acc.push(...body.data);
    url = body.paging?.next ?? null;
  }
  return { ok: true, rows: acc };
}
