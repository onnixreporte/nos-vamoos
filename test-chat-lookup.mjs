/**
 * Diagnóstico: ¿Por qué no aparece el chat 236DFAMBFI4UZBUCDDUG (Marce Ovelar)?
 *
 * Ejecutar: node test-chat-lookup.mjs
 */

const TOKEN = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDaHJpc3RpYW4gQ2hhcGFycm8iLCJidXNpbmVzc0lkIjoibm9zdmFtb29zXzEiLCJuYW1lIjoiQ2hyaXN0aWFuIENoYXBhcnJvIiwiYXBpIjp0cnVlLCJpZCI6InF4RkJzRnd0TEFiUFNvTTE3MTRDcnlVQXZYNzMiLCJleHAiOjE5Mjk4NzYxNzUsImp0aSI6InF4RkJzRnd0TEFiUFNvTTE3MTRDcnlVQXZYNzMifQ.LvkLoXMnG1ijB8goJufS2ZbH_OxCzFj8rQqlkJgjj09sltZ1cI6lwcU2tTct1_5Rt8q3guqPZ0hInYUJQRbBjQ";
const BASE = "https://api.botmaker.com/v2.0";
const TARGET_CHAT_ID = "236DFAMBFI4UZBUCDDUG";
const CONTACT_ID = "595982545981";

// Chat data:
//   creationTime:          2026-03-03T12:52:02.911Z
//   lastSessionCreationTime: 2026-03-11T14:45:29.316Z

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

function summarize(items) {
  const count = (items ?? []).length;
  const hit = found(items);
  const ids = (items ?? []).map(i => i?.chat?.chatId).join(", ") || "(vacío)";
  return { count, hit, ids };
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
    const s = summarize(items);
    console.log(`  Página ${page}: status=${status}, items=${s.count}, nextPage=${json?.nextPage ? "SI" : "null"}`);
    if (s.count > 0) {
      console.log(`    IDs: ${s.ids.slice(0, 120)}`);
    }
    if (s.hit) {
      console.log(`  ★★★ ENCONTRADO en página ${page} ★★★`);
      foundIt = true;
    }
    totalItems += s.count;
    if (!ok) {
      console.log(`  ERROR: ${JSON.stringify(json)}`);
      break;
    }
    url = json?.nextPage ? `${BASE}/chats?nextPage=${encodeURIComponent(json.nextPage)}` : null;
    if (page >= 30) { console.log("  [STOP] Límite de 30 páginas para el test"); break; }
  }
  console.log(`  RESULTADO: ${totalItems} items totales en ${page} páginas → ${foundIt ? "✅ CHAT ENCONTRADO" : "❌ NO encontrado"}`);
  return foundIt;
}

async function main() {
  console.log("=".repeat(60));
  console.log("DIAGNÓSTICO: Chat 236DFAMBFI4UZBUCDDUG (Marce Ovelar)");
  console.log("=".repeat(60));

  // ── TEST 1: Por contact-id con long-term-search, rango exacto de creación
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-03T00:00:00Z&to=2026-03-03T23:59:59Z&contact-id=${CONTACT_ID}&long-term-search=true`,
    "contact-id + día de creación (03-Mar) + long-term-search=true"
  );

  // ── TEST 2: Por contact-id sin long-term-search, mismo día
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-03T00:00:00Z&to=2026-03-03T23:59:59Z&contact-id=${CONTACT_ID}`,
    "contact-id + día de creación (03-Mar) SIN long-term-search"
  );

  // ── TEST 3: Rango todo marzo, por contact-id, long-term-search
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-01T00:00:00Z&to=2026-03-17T23:59:59Z&contact-id=${CONTACT_ID}&long-term-search=true`,
    "contact-id + todo marzo + long-term-search=true"
  );

  // ── TEST 4: Rango todo marzo SIN contact-id, solo long-term-search (busca en general)
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-01T00:00:00Z&to=2026-03-17T23:59:59Z&long-term-search=true`,
    "TODO MARZO + long-term-search=true (sin filtro de contacto)"
  );

  // ── TEST 5: Rango todo marzo SIN long-term-search (como hace el dashboard normalmente)
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-01T00:00:00Z&to=2026-03-17T23:59:59Z`,
    "TODO MARZO sin long-term-search (modo normal del dashboard)"
  );

  // ── TEST 6: Por la fecha de lastSession (11-Mar) que puede ser la que indexa Botmaker
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-11T00:00:00Z&to=2026-03-11T23:59:59Z&contact-id=${CONTACT_ID}&long-term-search=true`,
    "contact-id + día de lastSession (11-Mar) + long-term-search=true"
  );

  // ── TEST 7: Semana del 11 al 17 de marzo
  await fetchAllPages(
    `${BASE}/chats?from=2026-03-11T00:00:00Z&to=2026-03-17T23:59:59Z`,
    "Semana 11-17 Mar SIN long-term-search"
  );

  console.log("\n" + "=".repeat(60));
  console.log("FIN DEL DIAGNÓSTICO");
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
