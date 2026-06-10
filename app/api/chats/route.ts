import {
  BOTMAKER_CHATS_URL,
  BotmakerApiError,
  dedupeChats,
  fetchAllBotmakerItems,
  fetchBotmakerPage,
} from "@/lib/botmaker-server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
    const result = await fetchBotmakerPage(nextPageRaw, token);
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

  try {
    const allItems = await fetchAllBotmakerItems({
      baseUrl,
      token,
      from: fromRaw,
      to: toRaw,
      label: "chats",
    });

    const deduped = dedupeChats(allItems);

    console.log(
      `[chats] Returned ${deduped.length} items (deduped from ${allItems.length})`
    );

    return NextResponse.json({ items: deduped, nextPage: null });
  } catch (err) {
    if (err instanceof BotmakerApiError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status >= 500 ? 502 : err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch chats", details: message },
      { status: 502 }
    );
  }
}
