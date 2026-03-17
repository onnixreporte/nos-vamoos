import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const token = process.env.BOTMAKER_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BOTMAKER_ACCESS_TOKEN is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  // searchParams.get() already decodes the value — do NOT decodeURIComponent
  // again, as that double-decodes %3A→: and breaks Botmaker's nextPage token.
  const nextPageRaw = searchParams.get("nextPage");

  const url = nextPageRaw
    ? nextPageRaw
    : (() => {
        const url = new URL(BOTMAKER_CHATS_URL);
        for (const key of ALLOWED_PARAMS) {
          let value = searchParams.get(key);
          if (value == null || value === "") continue;
          if (key === "from" || key === "to") {
            if (/\.\d{3}Z$/.test(value)) {
              value = value.replace(/\.000\.000Z$/, ".000Z");
            } else if (value.endsWith("Z")) {
              value = value.replace(/Z$/, ".000Z");
            }
          }
          url.searchParams.set(key, value);
        }
        if (url.searchParams.has("from") || url.searchParams.has("to")) {
          url.searchParams.set("long-term-search", "true");
        }
        return url.toString();
      })();

  try {
    console.log("[chats] Fetching:", url);
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "access-token": token,
      },
      timeoutMs: 120_000,
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 400) {
        console.error("[chats] Botmaker 400 - URL:", url);
        console.error("[chats] Botmaker 400 - Response:", text);
      }
      return NextResponse.json(
        { error: `Botmaker API error: ${res.status}`, details: text },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const data = await res.json();

    // DEBUG: log page size and check for a specific chat
    const items = data?.items ?? [];
    const TARGET_CHAT = "236DFAMBFI4UZBUCDDUG";
    const found = items.find((c: { chat?: { chatId?: string } }) => c.chat?.chatId === TARGET_CHAT);
    console.log(
      `[chats] Got ${items.length} items, nextPage=${data?.nextPage ? "YES" : "null"}` +
      (found ? ` ★ FOUND TARGET CHAT ${TARGET_CHAT}` : "")
    );

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch chats", details: message },
      { status: 502 }
    );
  }
}
