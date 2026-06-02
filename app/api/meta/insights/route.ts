import { NextRequest, NextResponse } from "next/server";
import { buildInsightsUrl, fetchAllInsights, readMetaEnv } from "@/lib/meta-server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FIELDS = "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type";

export async function GET(request: NextRequest) {
  const env = readMetaEnv();
  if ("error" in env) {
    return NextResponse.json({ error: env.error }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const timeIncrement = searchParams.get("time_increment");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const extra: Record<string, string> = { fields: FIELDS, level: "account" };
  if (timeIncrement) extra.time_increment = timeIncrement;

  const url = buildInsightsUrl(env, from, to, extra);
  const result = await fetchAllInsights(url);
  if (!result.ok) {
    console.error("[meta/insights] error:", result.status, result.details);
    return NextResponse.json(
      { error: `Meta API error: ${result.status}`, details: result.details },
      { status: result.status >= 500 ? 502 : result.status },
    );
  }
  return NextResponse.json({ data: result.rows });
}
