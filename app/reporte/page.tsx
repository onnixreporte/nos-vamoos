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
import { Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import { formatDuration } from "@/lib/agent-aggregation";
import {
  buildDailyReportData,
  type DailyReportData,
} from "@/lib/report/report-data";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

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

/* ————— Identidad ————— */

const INK = "#211d1f"; // negro cálido
const STONE = "#8a8689"; // gris del logo, apenas oscurecido para contraste
const HAIR = "#e9e4e0"; // hairlines
const PAPER = "#fbf9f7"; // papel cálido
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

/* ————— Piezas editoriales ————— */

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="mt-12 flex items-baseline gap-3">
      <span
        className={`${fraunces.className} text-xs italic`}
        style={{ color: BRAND }}
      >
        {index}
      </span>
      <h2
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: INK }}
      >
        {title}
      </h2>
      <span
        className="ml-1 h-px flex-1 self-center"
        style={{ backgroundColor: HAIR }}
      />
    </div>
  );
}

function Stat({
  label,
  hint,
  value,
  accent = false,
}: {
  label: string;
  hint: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="py-5 pr-4">
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{ color: STONE }}
      >
        {label}
      </p>
      <p
        className={`${fraunces.className} mt-1.5 text-[28px] leading-none font-medium`}
        style={{ color: accent ? BRAND : INK }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: STONE }}>
        {hint}
      </p>
    </div>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-2 grid grid-cols-2 [&>*]:border-t [&>*:nth-child(odd)]:border-r [&>*:nth-child(even)]:pl-4"
      style={{ borderColor: HAIR, ["--tw-border-opacity" as string]: 1 }}
    >
      {children}
    </div>
  );
}

/* ————— Página ————— */

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
      <main
        className={`${fraunces.variable} flex min-h-dvh items-center justify-center px-6`}
        style={{ backgroundColor: PAPER, color: INK }}
      >
        <div className="text-center">
          <Wordmark className="mx-auto h-6 w-auto" />
          <p
            className={`${fraunces.className} mt-8 text-xl`}
            style={{ color: INK }}
          >
            No pudimos cargar el reporte.
          </p>
          <p className="mt-2 text-sm" style={{ color: STONE }}>
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
    <main
      className="min-h-dvh"
      style={{ backgroundColor: PAPER, color: INK }}
    >
      {/* Regla de marca, estilo cabecera de imprenta */}
      <div className="h-1" style={{ backgroundColor: BRAND }} />

      <style>{`
        @keyframes rfade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rfade { animation: rfade .55s cubic-bezier(.2,.65,.3,1) both; }
        @media (prefers-reduced-motion: reduce) { .rfade { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-md px-6 pb-16 sm:max-w-lg">
        {/* Cabecera */}
        <header className="rfade pt-10" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center justify-between">
            <Wordmark className="h-5 w-auto" />
            <p
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{ color: STONE }}
            >
              Reporte diario
            </p>
          </div>
          <h1
            className={`${fraunces.className} mt-10 text-[34px] leading-[1.08] font-medium text-balance capitalize`}
          >
            {longDate}
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: STONE }}>
            Resumen ejecutivo de la operación del día anterior. Mismos cálculos
            y filtros que el dashboard.
          </p>
        </header>

        {/* 01 — Conversaciones */}
        <section className="rfade" style={{ animationDelay: "90ms" }}>
          <SectionHeader index="01" title="Conversaciones" />
          <StatGrid>
            <Stat
              label="Contactos únicos"
              hint="Personas distintas que escribieron"
              value={fmtInt(data.totalContacts)}
            />
            <Stat
              label="Sesiones"
              hint="Aperturas de conversación (con reingresos)"
              value={fmtInt(data.totalSessions)}
            />
            <Stat
              label="Atendidas por agente"
              hint="Sesiones tomadas por un agente humano"
              value={fmtInt(data.attendedConversations)}
            />
            <Stat
              label="Cerradas"
              hint="Sesiones cerradas por agentes en el día"
              value={fmtInt(data.closedConversations)}
            />
          </StatGrid>
          <div className="border-t py-5" style={{ borderColor: HAIR }}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{ color: STONE }}
            >
              Tiempo prom. 1ª respuesta
            </p>
            <p
              className={`${fraunces.className} mt-1.5 text-[28px] leading-none font-medium`}
            >
              {data.avgFirstResponseMs > 0
                ? formatDuration(data.avgFirstResponseMs)
                : "—"}
            </p>
            <p className="mt-1.5 text-[11px]" style={{ color: STONE }}>
              Desde la asignación al agente hasta su primera respuesta
            </p>
          </div>
        </section>

        {/* 02 — Ventas */}
        <section className="rfade" style={{ animationDelay: "180ms" }}>
          <SectionHeader index="02" title="Ventas" />
          <div className="border-t py-6" style={{ borderColor: HAIR }}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{ color: STONE }}
            >
              Monto total
            </p>
            <p
              className={`${fraunces.className} mt-2 text-[44px] leading-none font-medium`}
              style={{ color: BRAND }}
            >
              <span className="text-[22px] align-top mr-1">Gs</span>
              {fmtGs(data.totalSalesAmount)}
            </p>
          </div>
          <StatGrid>
            <Stat
              label="Ventas cerradas"
              hint="Chats con venta registrada"
              value={fmtInt(data.totalSales)}
            />
            <Stat
              label="Conversión"
              hint="Ventas sobre sesiones atendidas"
              value={fmtPct(data.conversionRateAttended)}
            />
          </StatGrid>
        </section>

        {/* 03 — Top agentes */}
        {data.topAgents.length > 0 && (
          <section className="rfade" style={{ animationDelay: "270ms" }}>
            <SectionHeader index="03" title="Top agentes por ventas" />
            <div className="mt-2">
              {data.topAgents.map((a, i) => (
                <div
                  key={a.agentName}
                  className="flex items-baseline gap-4 border-t py-4"
                  style={{ borderColor: HAIR }}
                >
                  <span
                    className={`${fraunces.className} w-6 shrink-0 text-sm italic`}
                    style={{ color: i === 0 ? BRAND : STONE }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                    {a.agentName}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`${fraunces.className} text-[15px]`}
                    >
                      Gs {fmtGs(a.totalAmount)}
                    </span>
                    <span
                      className="ml-2 text-[11px]"
                      style={{ color: STONE }}
                    >
                      {fmtInt(a.salesCount)} {a.salesCount === 1 ? "venta" : "ventas"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 04 — Meta Ads */}
        {data.meta && (
          <section className="rfade" style={{ animationDelay: "360ms" }}>
            <SectionHeader index="04" title="Meta Ads" />
            <StatGrid>
              <Stat
                label="Gasto"
                hint="Inversión publicitaria del día (USD)"
                value={`$ ${fmtUsd(data.meta.spend)}`}
              />
              <Stat
                label="Alcance"
                hint="Personas que vieron los anuncios"
                value={fmtInt(data.meta.reach)}
              />
              <Stat
                label="Conv. iniciadas"
                hint="Conversaciones atribuidas a anuncios (Meta)"
                value={fmtInt(data.meta.conversations)}
              />
              <Stat
                label="Costo por conv."
                hint="Gasto sobre conversaciones iniciadas (USD)"
                value={`$ ${fmtUsd(data.meta.costPerConversation)}`}
              />
            </StatGrid>
          </section>
        )}

        {/* Nota metodológica */}
        <section className="rfade" style={{ animationDelay: "450ms" }}>
          <div
            className="mt-14 border-t pt-5"
            style={{ borderColor: HAIR }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: STONE }}
            >
              Nota metodológica
            </p>
            <p
              className="mt-3 text-[12px] leading-relaxed"
              style={{ color: STONE }}
            >
              Contactos y sesiones miden cosas distintas: un mismo contacto
              puede abrir varias sesiones en el día, y una sesión puede pasar
              por más de un agente. Por eso “atendidas por agente” puede
              superar a los contactos únicos. Las cifras de Meta provienen de
              la atribución publicitaria de Meta y no equivalen a chats de
              Botmaker.
            </p>
          </div>
        </section>

        {/* Pie */}
        <footer
          className="rfade mt-12 flex items-center justify-between border-t pt-5"
          style={{ borderColor: HAIR, animationDelay: "520ms" }}
        >
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: STONE }}>
            NosVamoos · {data.dateLabel}
          </p>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRAND }} />
        </footer>
      </div>
    </main>
  );
}
