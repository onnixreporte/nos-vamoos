import { NextRequest, NextResponse } from "next/server";
import { buildInsightsUrl, fetchAllInsights, readMetaEnv } from "@/lib/meta-server";

const FIELDS =
  "campaign_id,campaign_name,objective,spend,impressions,clicks,ctr,cpc,actions";

export async function GET(request: NextRequest) {
  const env = readMetaEnv();
  if ("error" in env) {
    return NextResponse.json({ error: env.error }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const url = buildInsightsUrl(env, from, to, {
    fields: FIELDS,
    level: "campaign",
    limit: "200",
  });
  const result = await fetchAllInsights(url);
  if (!result.ok) {
    console.error("[meta/campaigns] error:", result.status, result.details);
    return NextResponse.json(
      { error: `Meta API error: ${result.status}`, details: result.details },
      { status: result.status >= 500 ? 502 : result.status },
    );
  }
  return NextResponse.json({ data: result.rows });
}
