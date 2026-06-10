/**
 * Reporte diario web (reemplaza al PDF por WhatsApp).
 *
 * URL fija para el botón "Ver" del flujo de Botmaker:
 *   /reporte?key=REPORT_PUBLIC_KEY
 * Siempre muestra los datos del día anterior (hora Paraguay); acepta
 * ?date=YYYY-MM-DD para ver un día puntual.
 *
 * Server component: los datos se arman server-side con los mismos cómputos
 * del dashboard (lib/report/report-data). Protegida con ?key= porque la URL
 * viaja por WhatsApp.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDuration } from "@/lib/agent-aggregation";
import {
  buildDailyReportData,
  type DailyReportData,
} from "@/lib/report/report-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reporte diario — NosVamoos",
  robots: { index: false, follow: false },
};

// Cache corto en memoria: el link se abre muchas veces la misma mañana y los
// datos de ayer pueden seguir actualizándose (ventas cargadas durante el día)
const CACHE_TTL_MS = 10 * 60 * 1000;
const reportCache = new Map<string, { data: DailyReportData; ts: number }>();

async function getReportData(date?: string): Promise<DailyReportData> {
  const cacheKey = date ?? "yesterday";
  const hit = reportCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
  const data = await buildDailyReportData(date);
  reportCache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

const fmtInt = (n: number) => n.toLocaleString("es");
const fmtGs = (n: number) =>
  n.toLocaleString("es", { maximumFractionDigits: 0 });
const fmtUsd = (n: number) =>
  n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) =>
  `${n.toLocaleString("es", { maximumFractionDigits: 1 })}%`;

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; date?: string }>;
}) {
  const { key, date } = await searchParams;

  const publicKey = process.env.REPORT_PUBLIC_KEY;
  if (!publicKey || key !== publicKey) notFound();

  let data: DailyReportData;
  try {
    data = await getReportData(date);
  } catch (err) {
    console.error("[reporte] Error:", err);
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-lg font-semibold">Reporte diario NosVamoos</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Volvé a intentar en unos minutos.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <header className="border-b pb-4">
        <h1 className="text-xl font-bold">Reporte diario NosVamoos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos del {data.dateLabel}
        </p>
      </header>

      <SectionTitle>Conversaciones</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total contactos" value={fmtInt(data.totalContacts)} />
        <KpiCard label="Sesiones" value={fmtInt(data.totalSessions)} />
        <KpiCard
          label="Atendidas por agente"
          value={fmtInt(data.attendedConversations)}
        />
        <KpiCard label="Cerradas" value={fmtInt(data.closedConversations)} />
        <KpiCard
          label="T. prom. 1ª respuesta"
          value={
            data.avgFirstResponseMs > 0
              ? formatDuration(data.avgFirstResponseMs)
              : "—"
          }
        />
      </div>

      <SectionTitle>Ventas</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Ventas cerradas" value={fmtInt(data.totalSales)} />
        <KpiCard label="Monto total (Gs)" value={fmtGs(data.totalSalesAmount)} />
        <KpiCard
          label="Conversión (atendidas)"
          value={fmtPct(data.conversionRateAttended)}
        />
      </div>

      {data.topAgents.length > 0 && (
        <>
          <SectionTitle>Top agentes por ventas</SectionTitle>
          <div className="overflow-hidden rounded-lg border">
            {data.topAgents.map((a, i) => (
              <div
                key={a.agentName}
                className={`flex items-center justify-between px-3 py-2 text-sm ${i > 0 ? "border-t" : ""}`}
              >
                <span className="truncate">{a.agentName}</span>
                <span className="ml-3 shrink-0 tabular-nums text-muted-foreground">
                  {fmtInt(a.salesCount)} · Gs {fmtGs(a.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {data.meta && (
        <>
          <SectionTitle>Meta Ads</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Gasto (USD)" value={fmtUsd(data.meta.spend)} />
            <KpiCard label="Alcance" value={fmtInt(data.meta.reach)} />
            <KpiCard
              label="Conversaciones iniciadas"
              value={fmtInt(data.meta.conversations)}
            />
            <KpiCard
              label="Costo por conversación"
              value={fmtUsd(data.meta.costPerConversation)}
            />
          </div>
        </>
      )}

      <footer className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
        Generado automáticamente · NosVamoos Dashboard
      </footer>
    </main>
  );
}
