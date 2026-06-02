import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { splitDateRange } from "@/lib/date-windows";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BOTMAKER_AGENT_METRICS_URL =
  "https://api.botmaker.com/v2.0/dashboards/agent-metrics";

const ALLOWED_PARAMS = [
  "from",
  "to",
  "session-status",
  "agent-ids",
  "channel-ids",
  "queues",
  "online-status",
] as const;

const MAX_PAGES_PER_WINDOW = 200;

function normalizeDate(value: string): string {
  if (/\.\d{3}Z$/.test(value)) {
    return value.replace(/\.000\.000Z$/, ".000Z");
  }
  if (value.endsWith("Z")) {
    return value.replace(/Z$/, ".000Z");
  }
  return value;
}

async function fetchPage(url: string, token: string): Promise<{
  ok: boolean;
  status: number;
  body: unknown;
  text?: string;
}> {
  const res = await fetchWithRetry(url, {
    method: "GET",
    headers: { Accept: "application/json", "access-token": token },
    timeoutMs: 120_000,
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, body: null, text };
  }
  return { ok: true, status: res.status, body: await res.json() };
}

export async function GET(request: NextRequest) {
  const token = process.env.BOTMAKER_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BOTMAKER_ACCESS_TOKEN is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const nextPageRaw = searchParams.get("nextPage");

  if (nextPageRaw) {
    const result = await fetchPage(nextPageRaw, token);
    if (!result.ok) {
      console.error("[agent-metrics] Error", result.status, result.text);
      return NextResponse.json(
        { error: `Botmaker API error: ${result.status}`, details: result.text },
        { status: result.status >= 500 ? 502 : result.status }
      );
    }
    return NextResponse.json(result.body);
  }

  const baseUrl = new URL(BOTMAKER_AGENT_METRICS_URL);
  for (const key of ALLOWED_PARAMS) {
    if (key === "from" || key === "to") continue;
    const value = searchParams.get(key);
    if (value == null || value === "") continue;
    baseUrl.searchParams.set(key, value);
  }
  if (!baseUrl.searchParams.has("session-status")) {
    baseUrl.searchParams.set("session-status", "closed");
  }

  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const hasRange = fromRaw && toRaw;

  const windows = hasRange
    ? splitDateRange(normalizeDate(fromRaw), normalizeDate(toRaw))
    : [null];

  try {
    const allItems: unknown[] = [];

    for (const window of windows) {
      const windowUrl = new URL(baseUrl.toString());
      if (window) {
        windowUrl.searchParams.set("from", window.from);
        windowUrl.searchParams.set("to", window.to);
      }

      let pageUrl: string | null = windowUrl.toString();
      let pageCount = 0;

      while (pageUrl && pageCount < MAX_PAGES_PER_WINDOW) {
        pageCount++;
        console.log("[agent-metrics] Fetching:", pageUrl);
        const result = await fetchPage(pageUrl, token);
        if (!result.ok) {
          console.error("[agent-metrics] Error", result.status, result.text);
          return NextResponse.json(
            { error: `Botmaker API error: ${result.status}`, details: result.text },
            { status: result.status >= 500 ? 502 : result.status }
          );
        }
        const data = result.body as { items?: unknown[]; nextPage?: string | null };
        if (data.items?.length) allItems.push(...data.items);
        pageUrl = data.nextPage ?? null;
      }
    }

    const seen = new Set<string>();
    const deduped = allItems.filter((it) => {
      const x = it as { chatId?: string; sessionCreationTime?: string; agentId?: string };
      if (!x.chatId || !x.sessionCreationTime) return true;
      const key = `${x.chatId}|${x.sessionCreationTime}|${x.agentId ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(
      `[agent-metrics] Returned ${deduped.length} items (deduped from ${allItems.length}) across ${windows.length} window(s)`
    );

    return NextResponse.json({ items: deduped, nextPage: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch agent metrics", details: message },
      { status: 502 }
    );
  }
}
