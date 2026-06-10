/**
 * Server-side helpers para consumir la API de Botmaker.
 * Compartidos entre las rutas /api/* y el cron del reporte diario, de modo
 * que el cron no necesite pasar por HTTP propio para obtener los datos.
 */
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { splitDateRange } from "@/lib/date-windows";

export const BOTMAKER_CHATS_URL = "https://api.botmaker.com/v2.0/chats";
export const BOTMAKER_AGENT_METRICS_URL =
  "https://api.botmaker.com/v2.0/dashboards/agent-metrics";
export const BOTMAKER_NOTIFICATIONS_URL =
  "https://api.botmaker.com/v2.0/notifications";

const MAX_PAGES_PER_WINDOW = 200;

export class BotmakerApiError extends Error {
  constructor(
    public status: number,
    public details?: string,
  ) {
    super(`Botmaker API error: ${status}`);
    this.name = "BotmakerApiError";
  }
}

export function normalizeBotmakerDate(value: string): string {
  if (/\.\d{3}Z$/.test(value)) {
    return value.replace(/\.000\.000Z$/, ".000Z");
  }
  if (value.endsWith("Z")) {
    return value.replace(/Z$/, ".000Z");
  }
  return value;
}

export async function fetchBotmakerPage(
  url: string,
  token: string,
): Promise<{
  ok: boolean;
  status: number;
  body: unknown;
  text?: string;
}> {
  const res = await fetchWithRetry(url, {
    method: "GET",
    headers: { Accept: "application/json", "access-token": token },
    timeoutMs: 120_000,
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, body: null, text };
  }
  return { ok: true, status: res.status, body: await res.json() };
}

/**
 * Acumula todos los items de un endpoint paginado de Botmaker, dividiendo el
 * rango from/to en ventanas (limitación de Botmaker) y siguiendo nextPage
 * dentro de cada ventana. Lanza BotmakerApiError si una página falla.
 */
export async function fetchAllBotmakerItems(options: {
  baseUrl: URL;
  token: string;
  from?: string | null;
  to?: string | null;
  label?: string;
}): Promise<unknown[]> {
  const { baseUrl, token, from, to, label = "botmaker" } = options;

  const windows =
    from && to
      ? splitDateRange(normalizeBotmakerDate(from), normalizeBotmakerDate(to))
      : [null];

  const allItems: unknown[] = [];

  for (const window of windows) {
    const windowUrl = new URL(baseUrl.toString());
    if (window) {
      windowUrl.searchParams.set("from", window.from);
      windowUrl.searchParams.set("to", window.to);
    }

    let pageUrl: string | null = windowUrl.toString();
    let pageCount = 0;

    while (pageUrl && pageCount < MAX_PAGES_PER_WINDOW) {
      pageCount++;
      console.log(`[${label}] Fetching:`, pageUrl);
      const result = await fetchBotmakerPage(pageUrl, token);
      if (!result.ok) {
        if (result.status === 400) {
          console.error(`[${label}] Botmaker 400 - URL:`, pageUrl);
          console.error(`[${label}] Botmaker 400 - Response:`, result.text);
        }
        throw new BotmakerApiError(result.status, result.text);
      }
      const data = result.body as { items?: unknown[]; nextPage?: string | null };
      if (data.items?.length) allItems.push(...data.items);
      pageUrl = data.nextPage ?? null;
    }
  }

  return allItems;
}

/** Dedup de chats por chatId (Botmaker repite items entre ventanas de fecha). */
export function dedupeChats(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const id = (it as { chat?: { chatId?: string } }).chat?.chatId;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Dedup de agent-metrics por chatId + sessionCreationTime + agentId. */
export function dedupeAgentMetrics(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const x = it as {
      chatId?: string;
      sessionCreationTime?: string;
      agentId?: string;
    };
    if (!x.chatId || !x.sessionCreationTime) return true;
    const key = `${x.chatId}|${x.sessionCreationTime}|${x.agentId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
