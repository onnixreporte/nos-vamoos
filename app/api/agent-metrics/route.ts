import {
  BOTMAKER_AGENT_METRICS_URL,
  BotmakerApiError,
  dedupeAgentMetrics,
  fetchAllBotmakerItems,
  fetchBotmakerPage,
} from "@/lib/botmaker-server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_PARAMS = [
  "from",
  "to",
  "session-status",
  "agent-ids",
  "channel-ids",
  "queues",
  "online-status",
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

  if (nextPageRaw) {
    const result = await fetchBotmakerPage(nextPageRaw, token);
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

  try {
    const allItems = await fetchAllBotmakerItems({
      baseUrl,
      token,
      from: fromRaw,
      to: toRaw,
      label: "agent-metrics",
    });

    const deduped = dedupeAgentMetrics(allItems);

    console.log(
      `[agent-metrics] Returned ${deduped.length} items (deduped from ${allItems.length})`
    );

    return NextResponse.json({ items: deduped, nextPage: null });
  } catch (err) {
    if (err instanceof BotmakerApiError) {
      console.error("[agent-metrics] Error", err.status, err.details);
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status >= 500 ? 502 : err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch agent metrics", details: message },
      { status: 502 }
    );
  }
}
