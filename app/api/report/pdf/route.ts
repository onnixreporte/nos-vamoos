/**
 * Genera el PDF del reporte diario on-demand para una fecha dada.
 *
 * Usado como fallback cuando no hay Vercel Blob configurado: el cron pasa
 * esta URL a la plantilla de WhatsApp y Botmaker/WhatsApp descargan el PDF
 * desde acá (se regenera en cada descarga con los mismos datos del día).
 *
 * Protegida con ?key=REPORT_PUBLIC_KEY (secret aparte de CRON_SECRET porque
 * la URL viaja a servicios externos).
 */
import { NextRequest, NextResponse } from "next/server";
import { buildDailyReportData } from "@/lib/report/report-data";
import { renderDailyReportPdf } from "@/lib/report/pdf-template";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const publicKey = process.env.REPORT_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      { error: "REPORT_PUBLIC_KEY is not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== publicKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = searchParams.get("date") ?? undefined; // YYYY-MM-DD, default ayer

  try {
    const data = await buildDailyReportData(date);
    const pdfBuffer = await renderDailyReportPdf(data);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="reporte-diario.pdf"`,
        // El día reportado ya está cerrado: cachear evita regenerar en
        // descargas repetidas del mismo PDF
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[report/pdf] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate report PDF", details: message },
      { status: 502 },
    );
  }
}
