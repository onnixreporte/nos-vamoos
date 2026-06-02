import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BOTMAKER_MESSAGES_URL = "https://api.botmaker.com/v2.0/messages";
const ALLOWED_PARAMS = [
  "from",
  "to",
  "chat-id",
  "channel-id",
  "contact-id",
  "long-term-search",
  "limit",
] as const;

export async function GET(request: NextRequest) {
  const token = process.env.BOTMAKER_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BOTMAKER_ACCESS_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  // searchParams.get() already decodes the value — do NOT decodeURIComponent
  // again, as that double-decodes %3A→: and breaks Botmaker's nextPage token.
  const nextPageRaw = searchParams.get("nextPage");

  const url = nextPageRaw
    ? nextPageRaw
    : (() => {
        const upstreamUrl = new URL(BOTMAKER_MESSAGES_URL);
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
          upstreamUrl.searchParams.set(key, value);
        }
        return upstreamUrl.toString();
      })();

  try {
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
      return NextResponse.json(
        { error: `Botmaker API error: ${res.status}`, details: text },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch messages", details: message },
      { status: 502 },
    );
  }
}
