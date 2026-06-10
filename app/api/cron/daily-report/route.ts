/**
 * Cron del reporte diario (Vercel Cron, 8:00 AM Paraguay = 11:00 UTC).
 *
 * Flujo: datos del día anterior → PDF → Vercel Blob (URL pública) →
 * notificación WhatsApp vía plantilla de Botmaker (POST /v2.0/notifications).
 *
 * Env requeridas: CRON_SECRET, REPORT_CHANNEL_ID, REPORT_TEMPLATE_NAME,
 * REPORT_CONTACT_ID, BLOB_READ_WRITE_TOKEN (+ las de Botmaker/Meta).
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { buildDailyReportData } from "@/lib/report/report-data";
import { renderDailyReportPdf } from "@/lib/report/pdf-template";
import { BOTMAKER_NOTIFICATIONS_URL } from "@/lib/botmaker-server";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { isoToPYDate } from "@/lib/meta-server";

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

  // ?dry-run=1: genera y devuelve el PDF sin subir a Blob ni notificar (debug)
  const dryRun = new URL(request.url).searchParams.get("dry-run") === "1";

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
  if (!dryRun && missing.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  try {
    // 1. Datos del día anterior (mismos cómputos que el dashboard)
    const data = await buildDailyReportData();
    const dateKey = isoToPYDate(data.fromIso); // YYYY-MM-DD del día reportado

    // 2. Render del PDF
    const pdfBuffer = await renderDailyReportPdf(data);

    if (dryRun) {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="reporte-${dateKey}.pdf"`,
        },
      });
    }

    // 3. URL pública del PDF: Vercel Blob si está configurado; si no,
    //    fallback a la ruta on-demand /api/report/pdf (regenera al descargar)
    let pdfUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`reports/reporte-${dateKey}.pdf`, pdfBuffer, {
        access: "public",
        contentType: "application/pdf",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      pdfUrl = blob.url;
      console.log("[daily-report] PDF subido a Blob:", pdfUrl);
    } else {
      const publicKey = process.env.REPORT_PUBLIC_KEY;
      if (!publicKey) {
        return NextResponse.json(
          {
            error:
              "Set BLOB_READ_WRITE_TOKEN (Vercel Blob) or REPORT_PUBLIC_KEY (on-demand PDF fallback)",
          },
          { status: 500 },
        );
      }
      const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : new URL(request.url).origin;
      pdfUrl = `${base}/api/report/pdf?date=${dateKey}&key=${publicKey}`;
      console.log("[daily-report] Sin Blob: usando PDF on-demand:", pdfUrl);
    }

    // 4. Enviar notificación por plantilla de WhatsApp vía Botmaker
    const notificationRes = await fetchWithRetry(BOTMAKER_NOTIFICATIONS_URL, {
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
        channelId,
        name: `reporte-diario-${dateKey}`,
        intentIdOrName: templateName,
        contacts: [
          {
            contactId,
            variables: {
              // Variable del documento del header (así se llama en la plantilla)
              reporte_diario: pdfUrl,
              // Convención genérica Botmaker para header multimedia (fallback)
              headerDocumentUrl: pdfUrl,
              headerDocumentCaption: `Reporte diario ${dateKey}.pdf`,
              // Variable {{1}} del body — debe llamarse "fecha" en la plantilla
              fecha: data.dateLabel,
            },
          },
        ],
      }),
    });

    if (!notificationRes.ok) {
      const details = await notificationRes.text();
      console.error(
        "[daily-report] Botmaker notification error:",
        notificationRes.status,
        details,
      );
      // El PDF ya quedó generado y subido — reportar el fallo del envío
      return NextResponse.json(
        {
          ok: false,
          step: "notification",
          pdfUrl,
          error: `Botmaker API error: ${notificationRes.status}`,
          details,
        },
        { status: 502 },
      );
    }

    const notification = await notificationRes.json().catch(() => null);
    console.log("[daily-report] Notificación enviada:", notification);

    return NextResponse.json({
      ok: true,
      date: dateKey,
      pdfUrl,
      notification,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[daily-report] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to generate daily report", details: message },
      { status: 502 },
    );
  }
}
