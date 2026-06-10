/**
 * Documento PDF del reporte diario (renderizado server-side con
 * @react-pdf/renderer, sin Chromium).
 */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DailyReportData } from "@/lib/report/report-data";

// Primario del dashboard: HSL(347, 88%, 68%)
const PRIMARY = "#F56685";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerBar: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    color: "#ffffff",
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 8,
    color: "#111827",
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiBox: {
    width: "23.5%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  thAgent: { flex: 2, fontFamily: "Helvetica-Bold", fontSize: 9 },
  thNum: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9, textAlign: "right" },
  tdAgent: { flex: 2, fontSize: 9 },
  tdNum: { flex: 1, fontSize: 9, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
});

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es-PY");
}

function fmtMoney(n: number): string {
  return n.toLocaleString("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtMoney2(n: number): string {
  return n.toLocaleString("es-PY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60) {
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}m`;
  }
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

/** Renderiza el reporte a Buffer (los tipos de @react-pdf exigen el cast). */
export async function renderDailyReportPdf(
  data: DailyReportData,
): Promise<Buffer> {
  const doc = (
    <DailyReportDocument data={data} />
  ) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(doc);
}

export function DailyReportDocument({ data }: { data: DailyReportData }) {
  return (
    <Document
      title={`Reporte diario NosVamoos ${data.dateLabel}`}
      author="Dashboard NosVamoos"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>NosVamoos — Reporte diario</Text>
          <Text style={styles.headerSubtitle}>
            Resumen del {data.dateLabel}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Conversaciones</Text>
        <View style={styles.kpiRow}>
          <Kpi label="Contactos totales" value={fmtInt(data.totalContacts)} />
          <Kpi label="Sesiones" value={fmtInt(data.totalSessions)} />
          <Kpi
            label="Conversaciones atendidas"
            value={fmtInt(data.attendedConversations)}
          />
          <Kpi
            label="Conversaciones cerradas"
            value={fmtInt(data.closedConversations)}
          />
          <Kpi
            label="T. prom. 1ª respuesta"
            value={fmtDuration(data.avgFirstResponseMs)}
          />
        </View>

        <Text style={styles.sectionTitle}>Ventas</Text>
        <View style={styles.kpiRow}>
          <Kpi label="Ventas" value={fmtInt(data.totalSales)} />
          <Kpi label="Monto total" value={fmtMoney(data.totalSalesAmount)} />
          <Kpi
            label="Conversión (atendidas)"
            value={`${data.conversionRateAttended.toFixed(1)}%`}
          />
        </View>

        {data.topAgents.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Top agentes por ventas</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.thAgent}>Agente</Text>
              <Text style={styles.thNum}>Ventas</Text>
              <Text style={styles.thNum}>Monto</Text>
            </View>
            {data.topAgents.map((a) => (
              <View key={a.agentName} style={styles.tableRow}>
                <Text style={styles.tdAgent}>{a.agentName}</Text>
                <Text style={styles.tdNum}>{fmtInt(a.salesCount)}</Text>
                <Text style={styles.tdNum}>{fmtMoney(a.totalAmount)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Meta Ads</Text>
        {data.meta ? (
          <View style={styles.kpiRow}>
            <Kpi label="Gasto total" value={fmtMoney(data.meta.spend)} />
            <Kpi label="Alcance" value={fmtInt(data.meta.reach)} />
            <Kpi
              label="Conversaciones iniciadas"
              value={fmtInt(data.meta.conversations)}
            />
            <Kpi
              label="Costo por conversación"
              value={fmtMoney2(data.meta.costPerConversation)}
            />
          </View>
        ) : (
          <Text style={{ fontSize: 9, color: MUTED }}>
            Datos de Meta Ads no disponibles para este reporte.
          </Text>
        )}

        <Text style={styles.footer}>
          Generado automáticamente por el dashboard NosVamoos · Datos de
          Botmaker y Meta Marketing API · {data.dateLabel}
        </Text>
      </Page>
    </Document>
  );
}
