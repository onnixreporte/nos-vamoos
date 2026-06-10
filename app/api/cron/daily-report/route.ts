/**
 * Cron del reporte diario (Vercel Cron, 8:00 AM Paraguay = 11:00 UTC).
 *
 * Envía la plantilla de WhatsApp del reporte diario vía Botmaker. La plantilla
 * tiene un botón "Ver" que dispara un flujo del bot con el link fijo
 * /reporte?key=REPORT_PUBLIC_KEY (la página siempre muestra los datos de ayer),
 * así que acá no se genera ni adjunta nada.
 *
 * Env requeridas: CRON_SECRET, BOTMAKER_ACCESS_TOKEN, REPORT_CHANNEL_ID,
 * REPORT_TEMPLATE_NAME, REPORT_CONTACT_ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { buildPresetRange } from "@/lib/date-filters";
import { isoToPYDate } from "@/lib/meta-server";

// v1.0 intent: dispara plantillas/intenciones con params de variables
const BOTMAKER_INTENT_URL = "https://go.botmaker.com/api/v1.0/intent/v2";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botmakerToken = process.env.BOTMAKER_ACCESS_TOKEN;
  const channelId = process.env.REPORT_CHANNEL_ID;
  const templateName = process.env.REPORT_TEMPLATE_NAME;
  const contactId = process.env.REPORT_CONTACT_ID;
  const missing = [
    !botmakerToken && "BOTMAKER_ACCESS_TOKEN",
    !channelId && "REPORT_CHANNEL_ID",
    !templateName && "REPORT_TEMPLATE_NAME",
    !contactId && "REPORT_CONTACT_ID",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  // Fecha del día reportado (ayer, hora Paraguay) para la variable del body
  const range = buildPresetRange("yesterday");
  const dateKey = isoToPYDate(range.from); // YYYY-MM-DD
  const dateLabel = new Date(range.from).toLocaleDateString("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ?dry-run=1: valida envs y fechas sin enviar el mensaje (debug)
  if (new URL(request.url).searchParams.get("dry-run") === "1") {
    return NextResponse.json({ ok: true, dryRun: true, date: dateKey, dateLabel });
  }

  try {
    // REPORT_CHANNEL_ID puede ser el id completo (negocio-whatsapp-numero)
    // o directamente el número del canal
    const chatChannelNumber = (channelId as string).includes("-whatsapp-")
      ? (channelId as string).split("-whatsapp-")[1]
      : (channelId as string);

    const notificationRes = await fetchWithRetry(BOTMAKER_INTENT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "access-token": botmakerToken as string,
      },
      timeoutMs: 60_000,
      // 1 solo retry: un reintento sobre un POST ya procesado duplicaría el envío
      maxRetries: 1,
      body: JSON.stringify({
        chatPlatform: "whatsapp",
        chatChannelNumber,
        platformContactId: contactId,
        ruleNameOrId: templateName,
        clientPayload: `reporte-diario-${dateKey}`,
        params: {
          // Variable {{1}} del body si la plantilla la usa
          fecha: dateLabel,
        },
      }),
    });

    if (!notificationRes.ok) {
      const details = await notificationRes.text();
      console.error(
        "[daily-report] Botmaker notification error:",
        notificationRes.status,
        details,
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Botmaker API error: ${notificationRes.status}`,
          details,
        },
        { status: 502 },
      );
    }

    const notification = await notificationRes.json().catch(() => null);
    console.log("[daily-report] Notificación enviada:", notification);

    return NextResponse.json({ ok: true, date: dateKey, notification });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[daily-report] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to send daily report", details: message },
      { status: 502 },
    );
  }
}
