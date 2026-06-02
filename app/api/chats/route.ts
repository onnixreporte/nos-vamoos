import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { splitDateRange } from "@/lib/date-windows";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BOTMAKER_CHATS_URL = "https://api.botmaker.com/v2.0/chats";
const ALLOWED_PARAMS = [
  "from",
  "to",
  "name",
  "emails",
  "channel-id",
  "contact-id",
  "long-term-search",
  "only-users-never-talked",
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

  // Passthrough for explicit nextPage requests (paginated continuation)
  if (nextPageRaw) {
    const result = await fetchPage(nextPageRaw, token);
    if (!result.ok) {
      return NextResponse.json(
        { error: `Botmaker API error: ${result.status}`, details: result.text },
        { status: result.status >= 500 ? 502 : result.status }
      );
    }
    return NextResponse.json(result.body);
  }

  // Build base params (everything except from/to)
  const baseUrl = new URL(BOTMAKER_CHATS_URL);
  for (const key of ALLOWED_PARAMS) {
    if (key === "from" || key === "to") continue;
    const value = searchParams.get(key);
    if (value == null || value === "") continue;
    baseUrl.searchParams.set(key, value);
  }

  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const hasRange = fromRaw && toRaw;

  if (hasRange) {
    baseUrl.searchParams.set("long-term-search", "true");
  }

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
        console.log("[chats] Fetching:", pageUrl);
        const result = await fetchPage(pageUrl, token);
        if (!result.ok) {
          if (result.status === 400) {
            console.error("[chats] Botmaker 400 - URL:", pageUrl);
            console.error("[chats] Botmaker 400 - Response:", result.text);
          }
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
      const id = (it as { chat?: { chatId?: string } }).chat?.chatId;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    console.log(
      `[chats] Returned ${deduped.length} items (deduped from ${allItems.length}) across ${windows.length} window(s)`
    );

    return NextResponse.json({ items: deduped, nextPage: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch chats", details: message },
      { status: 502 }
    );
  }
}
