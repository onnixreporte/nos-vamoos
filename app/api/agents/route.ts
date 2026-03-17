import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { NextRequest, NextResponse } from "next/server";

const BOTMAKER_AGENTS_URL = "https://api.botmaker.com/v2.0/agents";

export async function GET(request: NextRequest) {
  const token = process.env.BOTMAKER_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BOTMAKER_ACCESS_TOKEN is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const nextPageEncoded = searchParams.get("nextPage");

  const url = nextPageEncoded
    ? decodeURIComponent(nextPageEncoded)
    : BOTMAKER_AGENTS_URL;

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
      console.error("[agents] Error", res.status, text);
      return NextResponse.json(
        { error: `Botmaker API error: ${res.status}`, details: text },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch agents", details: message },
      { status: 502 }
    );
  }
}
