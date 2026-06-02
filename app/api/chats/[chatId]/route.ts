import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const token = process.env.BOTMAKER_ACCESS_TOKEN;
  if (!token)
    return NextResponse.json({ error: "No token" }, { status: 500 });

  const { chatId } = await params;
  console.log(`[chats/[chatId]] Fetching ${chatId}`);
  const url = `https://api.botmaker.com/v2.0/chats/${chatId}`;

  const res = await fetchWithRetry(url, {
    method: "GET",
    headers: { Accept: "application/json", "access-token": token },
    timeoutMs: 30_000,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Botmaker error: ${res.status}`, details: text },
      { status: res.status >= 500 ? 502 : res.status },
    );
  }

  return NextResponse.json(await res.json());
}
