"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/chats/search-bar";
import type { ChatWithMessagesResponse, AgentMetricsItem } from "@/types/botmaker";

const PAGE_SIZE = 20;

interface SalesTableProps {
  chats: ChatWithMessagesResponse[];
  agentItems: AgentMetricsItem[];
}

function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function matchesSearch(
  chat: ChatWithMessagesResponse,
  agentName: string,
  query: string,
): boolean {
  const q = query.toLowerCase();
  const fields = [
    chat.externalId,
    chat.variables?.nombre_cliente,
    chat.variables?.destino_viaje,
    chat.variables?.monto_venta,
    chat.variables?.tipo_paquete,
    chat.variables?.fecha_viaje,
    chat.variables?.numero_proforma,
    agentName,
    ...(chat.tags ?? []),
  ];
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export function SalesTable({ chats, agentItems }: SalesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const agentNameByChatId = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of agentItems) {
      if (item.chatId && item.agentName) {
        m.set(item.chatId, item.agentName);
      }
    }
    return m;
  }, [agentItems]);

  const conversationLinkByChatId = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of agentItems) {
      const link =
        typeof item.conversationLink === "string"
          ? item.conversationLink.trim()
          : "";
      if (item.chatId && link) {
        m.set(item.chatId, link);
      }
    }
    return m;
  }, [agentItems]);

  const salesChats = useMemo(
    () => chats.filter((c) => parseNum(c.variables?.monto_venta) > 0),
    [chats],
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return salesChats;
    return salesChats.filter((c) =>
      matchesSearch(
        c,
        agentNameByChatId.get(c.chat.chatId) ?? "",
        searchQuery,
      ),
    );
  }, [salesChats, searchQuery, agentNameByChatId]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const startItem = safePage * PAGE_SIZE;
  const pageItems = filteredItems.slice(startItem, startItem + PAGE_SIZE);

  const COLUMNS = [
    "Contacto",
    "Nombre cliente",
    "Destino",
    "Monto venta",
    "Pasajeros",
    "Tipo paquete",
    "Fecha viaje",
    "N. proforma",
    "Agente",
    "Etiquetas",
    "Conversación",
  ];

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            setPage(0);
          }}
          placeholder="Buscar en ventas..."
        />
        <p className="ml-auto text-xs text-muted-foreground">
          {totalItems} ventas
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No hay ventas para mostrar.
                </td>
              </tr>
            ) : (
              pageItems.map((chat) => {
                const v = chat.variables ?? {};
                const agent =
                  agentNameByChatId.get(chat.chat.chatId) ?? "\u2014";
                return (
                  <tr
                    key={chat.chat.chatId}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {chat.externalId ?? "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.nombre_cliente || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.destino_viaje || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {v.monto_venta || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                      {v.cantidad_pasajeros || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.tipo_paquete || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.fecha_viaje || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {v.numero_proforma || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{agent}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {chat.tags?.length
                          ? chat.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                              >
                                {t}
                              </span>
                            ))
                          : "\u2014"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <a
                        href={
                          conversationLinkByChatId.get(chat.chat.chatId) ??
                          `https://go.botmaker.com/#/chats/${chat.chat.chatId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Ver chat
                        <ExternalLink className="size-3" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando {startItem + 1}–{Math.min(startItem + PAGE_SIZE, totalItems)} de {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
