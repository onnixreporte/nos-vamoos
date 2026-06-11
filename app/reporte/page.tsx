/**
 * Reporte diario web para gerencia (reemplaza al PDF por WhatsApp).
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
const fmtUsd = (n: number) =>
  n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) =>
  `${n.toLocaleString("es", { maximumFractionDigits: 1 })}%`;

const BRAND = "#e81f76"; // magenta NosVamoos

/** Wordmark NosVamoos (mismos paths que components/ui/Logo, sin lógica de sidebar). */
function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 351 60"
      aria-label="Nos Vamoos"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M0,5.63C0,3.64.44,1.7,3.31,1.7c1.99,0,2.43.5,3.92,1.93l18.27,22.88V5.07c0-1.82,1.6-3.81,3.48-3.81,1.99,0,3.92,1.99,3.92,3.81v31.11c0,2.43-1.49,3.37-2.93,3.81-1.93,0-2.87-.44-4.47-1.93L7.23,14.86v21.33c0,2.43-1.49,3.81-3.48,3.81s-3.75-1.38-3.75-3.81V5.63Z" fill="#918f91" />
      <path d="M59.41,7.56c-6.18,0-12.92,4.36-12.92,13.1s6.74,13.1,12.92,13.1,13.14-4.42,13.14-13.1-6.79-13.1-13.14-13.1M60.01,40.55c-10.21.44-20.81-6.35-20.81-19.89S49.8.38,60.01.38c9.66.5,19.77,7.18,19.77,20.28s-10.1,19.89-19.77,19.89" fill="#918f91" />
      <path d="M85.85,10.05c1.27-10.72,17.45-12.65,25.07-6.8,3.75,3.04-.22,7.85-3.53,5.42-4.09-2.6-13.36-3.81-14.52,1.93-1.49,9.06,22.53,3.87,22.14,18.56-.39,14.03-20.7,14.37-28.32,8.07-1.82-1.49-1.77-3.92-.77-5.41,1.44-1.44,3.04-1.94,4.91-.39,4.53,3.09,16.18,5.41,17.01-2.43-.72-8.18-23.69-3.26-21.98-18.95" fill="#918f91" />
      <path d="M133.83,37.51l-14.58-30.56c-2.15-4.36,4.36-7.96,6.79-3.37l4.91,11.11,6.35,14.59,6.24-14.59,4.91-11.11c2.21-4.2,8.61-1.55,6.74,3.04l-14.08,30.89c-1.27,3.48-5.19,4.31-7.29,0" fill="#e81f76" />
      <path d="M179.82,25.96l-6.24-13.65-6.79,13.65h13.03ZM156.08,40c-1.77-.99-2.87-2.98-1.77-5.31l15.85-31c1.49-2.93,5.47-3.04,6.85,0l15.57,31c2.26,4.31-4.42,7.74-6.41,3.43l-2.43-4.86h-20.37l-2.38,4.86c-.88,1.88-2.93,2.27-4.91,1.88" fill="#e81f76" />
      <path d="M204.95,15.74v20.44c0,2.43-1.99,3.81-3.97,3.81-1.77,0-3.31-1.38-3.31-3.81V5.07c0-2.87,2.43-3.81,3.31-3.81,1.6,0,2.54.94,3.48,1.99l12.15,16.41,12.59-17.02c1.82-2.27,6.29-1.38,6.29,2.43v31.11c0,2.43-1.55,3.81-3.31,3.81-1.99,0-3.53-1.38-3.53-3.81V15.74l-9.17,11.6c-1.99,2.43-4.47,2.43-6.29,0l-8.23-11.6Z" fill="#e81f76" />
      <path d="M295.74,0c-4.31,0-8.69,1.16-12.34,3.5-1.52.97-2.91,2.15-4.13,3.53,1.65,2.49,2.87,5.36,3.49,8.61.21-.56.45-1.09.72-1.59,1.29-2.39,3.25-4.14,5.49-5.25,1.94-.96,4.07-1.44,6.15-1.44,6.51,0,13.47,4.47,13.47,13.42s-6.96,13.42-13.47,13.42c-2.07,0-4.2-.49-6.14-1.45-2.24-1.12-4.21-2.87-5.5-5.26-.27-.5-.51-1.02-.72-1.58-.57-1.51-.89-3.22-.89-5.13,0-.06,0-.13,0-.19h-.06c-.04-4.9-1.46-8.92-3.73-12.07-.38-.52-.78-1.02-1.21-1.5C272.94,2.62,267.18.29,261.56,0c-4.31,0-8.68,1.16-12.34,3.5-2.13,1.36-4.02,3.13-5.51,5.29-2.16,3.15-3.48,7.14-3.48,11.99s1.32,8.84,3.49,11.98c1.49,2.16,3.39,3.91,5.52,5.25,3.65,2.28,8.02,3.35,12.32,3.16,5.62,0,11.39-2.25,15.33-6.65-1.61-2.46-2.8-5.3-3.42-8.51-2.11,5.43-7.46,8.19-12.53,8.19-2.07,0-4.21-.49-6.14-1.45-2.24-1.12-4.21-2.87-5.5-5.26-1.01-1.86-1.61-4.09-1.61-6.71s.6-4.88,1.61-6.73c1.29-2.39,3.25-4.14,5.49-5.25,1.93-.96,4.07-1.44,6.15-1.44,5.07,0,10.43,2.72,12.54,8.16.59,1.54.93,3.29.93,5.26,0,4.84,1.32,8.84,3.49,11.98.06.09.13.18.2.27.38.52.78,1.02,1.2,1.5,1.22,1.37,2.61,2.53,4.13,3.48,3.65,2.28,8.02,3.35,12.32,3.16,9.9,0,20.26-6.97,20.26-20.39S305.65.51,295.74,0" fill="#e81f76" />
      <path d="M321.84,10.05c1.27-10.72,17.45-12.65,25.07-6.8,3.75,3.04-.22,7.85-3.53,5.42-4.09-2.6-13.36-3.81-14.52,1.93-1.49,9.06,22.53,3.87,22.14,18.56-.39,14.03-20.7,14.37-28.32,8.07-1.82-1.49-1.77-3.92-.77-5.41,1.44-1.44,3.04-1.94,4.91-.39,4.53,3.09,16.18,5.41,17.01-2.43-.72-8.18-23.69-3.26-21.98-18.95" fill="#e81f76" />
    </svg>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </h2>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p
        className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight"
        style={accent ? { color: BRAND } : undefined}
      >
        {value}
      </p>
    </div>
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
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-6 text-neutral-900">
        <div className="text-center">
          <Wordmark className="mx-auto h-6 w-auto" />
          <p className="mt-8 text-lg font-semibold">
            No pudimos cargar el reporte.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Volvé a intentar en unos minutos.
          </p>
        </div>
      </main>
    );
  }

  const reportDate = new Date(data.fromIso);
  const longDate = reportDate.toLocaleDateString("es-PY", {
    timeZone: "America/Asuncion",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-900">
      {/* Regla de marca */}
      <div className="h-1" style={{ backgroundColor: BRAND }} />

      <div className="mx-auto max-w-md px-5 pb-14 sm:max-w-lg">
        {/* Cabecera */}
        <header className="flex items-center justify-between pt-7 pb-2">
          <Wordmark className="h-5 w-auto" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Reporte diario
          </p>
        </header>
        <h1 className="mt-4 text-2xl font-bold capitalize tracking-tight text-balance">
          {longDate}
        </h1>

        {/* Conversaciones */}
        <SectionTitle>Conversaciones</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Contactos únicos" value={fmtInt(data.totalContacts)} />
          <Stat label="Sesiones" value={fmtInt(data.totalSessions)} />
          <Stat
            label="Atendidas por agente"
            value={fmtInt(data.attendedConversations)}
          />
          <Stat label="Cerradas" value={fmtInt(data.closedConversations)} />
          <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium text-neutral-500">
              Tiempo prom. 1ª respuesta
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
              {data.avgFirstResponseMs > 0
                ? formatDuration(data.avgFirstResponseMs)
                : "—"}
            </p>
          </div>
        </div>

        {/* Ventas */}
        <SectionTitle>Ventas</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="col-span-2 rounded-xl border bg-white p-4"
            style={{ borderColor: BRAND }}
          >
            <p className="text-xs font-medium text-neutral-500">
              Monto total (USD)
            </p>
            <p
              className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight"
              style={{ color: BRAND }}
            >
              $ {fmtUsd(data.totalSalesAmount)}
            </p>
          </div>
          <Stat label="Ventas cerradas" value={fmtInt(data.totalSales)} />
          <Stat
            label="Conversión"
            value={fmtPct(data.conversionRateAttended)}
          />
        </div>

        {/* Top agentes */}
        {data.topAgents.length > 0 && (
          <>
            <SectionTitle>Top agentes por ventas</SectionTitle>
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {data.topAgents.map((a, i) => (
                <div
                  key={a.agentName}
                  className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-neutral-100" : ""}`}
                >
                  <span
                    className="w-5 shrink-0 text-sm font-bold tabular-nums"
                    style={{ color: i === 0 ? BRAND : "#a3a3a3" }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {a.agentName}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    $ {fmtUsd(a.totalAmount)}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {fmtInt(a.salesCount)} {a.salesCount === 1 ? "venta" : "ventas"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Meta Ads */}
        {data.meta && (
          <>
            <SectionTitle>Meta Ads</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Gasto (USD)" value={`$ ${fmtUsd(data.meta.spend)}`} />
              <Stat label="Alcance" value={fmtInt(data.meta.reach)} />
              <Stat
                label="Aperturas de chat por anuncios"
                value={fmtInt(data.meta.conversations)}
              />
              <Stat
                label="Costo por apertura (USD)"
                value={`$ ${fmtUsd(data.meta.costPerConversation)}`}
              />
            </div>
          </>
        )}

        {/* Pie */}
        <footer className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-4">
          <p className="text-[11px] text-neutral-400">
            NosVamoos · {data.dateLabel}
          </p>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: BRAND }}
          />
        </footer>
      </div>
    </main>
  );
}
