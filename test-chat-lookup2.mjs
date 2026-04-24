/**
 * Diagnóstico Round 2: Con channel-id obligatorio y chatId directo
 */

const TOKEN = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDaHJpc3RpYW4gQ2hhcGFycm8iLCJidXNpbmVzc0lkIjoibm9zdmFtb29zXzEiLCJuYW1lIjoiQ2hyaXN0aWFuIENoYXBhcnJvIiwiYXBpIjp0cnVlLCJpZCI6InF4RkJzRnd0TEFiUFNvTTE3MTRDcnlVQXZYNzMiLCJleHAiOjE5Mjk4NzYxNzUsImp0aSI6InF4RkJzRnd0TEFiUFNvTTE3MTRDcnlVQXZYNzMifQ.LvkLoXMnG1ijB8goJufS2ZbH_OxCzFj8rQqlkJgjj09sltZ1cI6lwcU2tTct1_5Rt8q3guqPZ0hInYUJQRbBjQ";
const BASE = "https://api.botmaker.com/v2.0";
const TARGET_CHAT_ID = "236DFAMBFI4UZBUCDDUG";
const CONTACT_ID = "595982545981";
const CHANNEL_ID = "nosvamoos_1-whatsapp-595217292020";

async function get(url) {
  const res = await fetch(url, {
    headers: { "Accept": "application/json", "access-token": TOKEN },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

function found(items) {
  return (items ?? []).some(i => i?.chat?.chatId === TARGET_CHAT_ID);
}

async function fetchAllPages(baseUrl, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`URL:  ${baseUrl}`);
  let url = baseUrl;
  let page = 0;
  let totalItems = 0;
  let foundIt = false;

  while (url) {
    page++;
    const { status, ok, json } = await get(url);
    const items = json?.items ?? [];
    console.log(`  Página ${page}: status=${status}, items=${items.length}, nextPage=${json?.nextPage ? "SI" : "null"}`);
    if (items.length > 0 && items.length <= 5) {
      // Mostrar todos si son pocos
      for (const item of items) {
        console.log(`    → ${item?.chat?.chatId} | ${item?.firstName} ${item?.lastName} | ${item?.creationTime}`);
      }
    }
    if (found(items)) {
      console.log(`  ★★★ ENCONTRADO en página ${page} ★★★`);
      foundIt = true;
    }
    totalItems += items.length;
    if (!ok) {
      console.log(`  ERROR: ${JSON.stringify(json)}`);
      break;
    }
    url = json?.nextPage ? `${BASE}/chats?nextPage=${encodeURIComponent(json.nextPage)}` : null;
    if (page >= 50) { console.log("  [STOP] Límite de 50 páginas"); break; }
  }
  console.log(`  → ${totalItems} items en ${page} páginas → ${foundIt ? "✅ ENCONTRADO" : "❌ NO encontrado"}`);
  return foundIt;
}

async function main() {
  console.log("=".repeat(60));
  console.log("DIAGNÓSTICO ROUND 2");
  console.log("=".repeat(60));

  // ── TEST 1: con channel-id + contact-id + long-term-search, día de creación
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-03T00:00:00Z&to=2026-03-03T23:59:59Z&channel-id=${encodeURIComponent(CHANNEL_ID)}&contact-id=${CONTACT_ID}&long-term-search=true`,
    "channel-id + contact-id + 03-Mar + long-term-search=true"
  );

  // ── TEST 2: channel-id + contact-id, marzo completo
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-01T00:00:00Z&to=2026-03-17T23:59:59Z&channel-id=${encodeURIComponent(CHANNEL_ID)}&contact-id=${CONTACT_ID}&long-term-search=true`,
    "channel-id + contact-id + todo marzo + long-term-search=true"
  );

  // ── TEST 3: channel-id + contact-id SIN rango de fechas
  await fetchAllPages(
    `${BASE}/chats?channel-id=${encodeURIComponent(CHANNEL_ID)}&contact-id=${CONTACT_ID}`,
    "channel-id + contact-id SIN fechas (sin long-term-search)"
  );

  // ── TEST 4: solo channel-id WhatsApp, semana del 11-17 (modo normal dashboard)
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-11T00:00:00Z&to=2026-03-17T23:59:59Z&channel-id=${encodeURIComponent(CHANNEL_ID)}`,
    "Solo WhatsApp channel + semana 11-17 Mar (sin long-term-search)"
  );

  // ── TEST 5: chatId directo (si la API lo soporta)
  console.log(`\n${"=".repeat(60)}`);
  console.log("TEST: chatId directo via /chats/{chatId}");
  const directUrl = `${BASE}/chats/${TARGET_CHAT_ID}`;
  console.log(`URL:  ${directUrl}`);
  const { status, json } = await get(directUrl);
  console.log(`  status=${status}`);
  console.log(`  body=${JSON.stringify(json, null, 2).slice(0, 500)}`);

  // ── TEST 6: agent-sessions para ese chatId (para ver si aparece en métricas)
  console.log(`\n${"=".repeat(60)}`);
  console.log("TEST: agent-metrics para marzo + buscar ese chatId");
  let url = `${BASE}/agent-sessions?from=2026-03-01T00:00:00Z&to=2026-03-17T23:59:59Z&session-status=closed&long-term-search=true`;
  let page = 0;
  let totalMetrics = 0;
  let foundInMetrics = false;
  while (url) {
    page++;
    const { status: s, ok, json: j } = await get(url);
    const items = j?.items ?? [];
    totalMetrics += items.length;
    const hit = items.find(i => i?.chatId === TARGET_CHAT_ID);
    if (hit) {
      console.log(`  ★ ENCONTRADO en métricas página ${page}:`, JSON.stringify(hit, null, 2).slice(0, 300));
      foundInMetrics = true;
    }
    if (!ok) { console.log(`  Métricas error: ${JSON.stringify(j)}`); break; }
    url = j?.nextPage ? `${BASE}/agent-sessions?nextPage=${encodeURIComponent(j.nextPage)}` : null;
    if (page >= 50) { console.log("  [STOP] 50 páginas"); break; }
  }
  console.log(`  → ${totalMetrics} agent-sessions en ${page} páginas → ${foundInMetrics ? "✅ ENCONTRADO en métricas" : "❌ NO encontrado en métricas"}`);

  console.log("\n" + "=".repeat(60));
  console.log("FIN");
}

main().catch(err => { console.error(err); process.exit(1); });
