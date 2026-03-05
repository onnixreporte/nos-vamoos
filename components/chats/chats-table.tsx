"use client";

import { useMemo, useState } from "react";
import type { ChatWithMessagesResponse } from "@/types/botmaker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/chats/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { normalizeChannelId } from "@/lib/dashboard-aggregation";
import { normalizeTypification } from "@/lib/dashboard-filters";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  const secs = value / 1000;
  if (secs < 60) return `${secs.toFixed(1)} s`;
  const minutes = Math.floor(secs / 60);
  const remSecs = Math.round(secs % 60);
  return `${minutes}m ${remSecs}s`;
}

const PAGE_SIZE = 20;

const VARIABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "nombre_cliente", label: "Nombre cliente" },
  { key: "destino_viaje", label: "Destino viaje" },
  { key: "origen", label: "Origen" },
  { key: "fecha_viaje", label: "Fecha viaje" },
  { key: "cantidad_dias", label: "Cantidad días" },
  { key: "tipo_paquete", label: "Tipo paquete" },
  { key: "cantidad_pasajeros", label: "Cantidad pasajeros" },
  { key: "cantidad_adultos", label: "Cantidad adultos" },
  { key: "cantidad_ninos", label: "Cantidad niños" },
  { key: "numero_proforma", label: "Número proforma" },
  { key: "monto_venta", label: "Monto venta" },
];

function VariableValueCell({
  variables,
  variableKey,
}: {
  variables?: Record<string, string>;
  variableKey: string;
}) {
  const value = variables?.[variableKey];
  if (value == null || value === "")
    return <span className="text-muted-foreground">—</span>;
  return <span className="text-xs">{value}</span>;
}

function itemMatchesSearch(
  item: ChatWithMessagesResponse,
  query: string,
  chatMetricsByChatId?: Record<
    string,
    {
      agentName: string;
      typification: string;
      conversationCount: number;
      botMessageCount: number;
      agentMessageCount: number;
      avgAgentResponseMs: number;
    }
  > | null,
): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const metrics = chatMetricsByChatId?.[item.chat.chatId];
  const parts: string[] = [
    item.chat.chatId ?? "",
    item.chat.contactId ?? "",
    item.chat.channelId ?? "",
    normalizeChannelId(item.chat.channelId ?? ""),
    item.creationTime ?? "",
    item.lastUserMessageDatetime ?? "",
    item.country ?? "",
    item.firstName ?? "",
    item.lastName ?? "",
    item.email ?? "",
    item.agentId ?? "",
    ...(item.tags ?? []),
    item.variables ? JSON.stringify(item.variables) : "",
    ...(item.variables ? Object.values(item.variables) : []),
    metrics?.agentName ?? "",
    metrics?.typification ?? "",
    String(metrics?.conversationCount ?? ""),
    String(metrics?.botMessageCount ?? ""),
    String(metrics?.agentMessageCount ?? ""),
    String(metrics?.avgAgentResponseMs ?? ""),
  ];
  const searchable = parts.join(" ").toLowerCase();
  return searchable.includes(q);
}

function TagsCell({ tags }: { tags?: string[] }) {
  if (!tags?.length) return <span className="text-muted-foreground">—</span>;

  const visible = tags.slice(0, 2);
  const hidden = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
      {hidden > 0 && <Badge variant="outline">+{hidden}</Badge>}
    </div>
  );
}

interface ChatsTableProps {
  items: ChatWithMessagesResponse[];
  nextPage: string | null;
  onLoadMore: (nextPageUrl: string) => Promise<void>;
  isLoadingMore?: boolean;
  chatMetricsByChatId?: Record<
    string,
    {
      agentName: string;
      typification: string;
      conversationCount: number;
      botMessageCount: number;
      agentMessageCount: number;
      avgAgentResponseMs: number;
      conversationLink?: string;
    }
  > | null;
}

export function ChatsTable({
  items,
  nextPage,
  onLoadMore,
  isLoadingMore = false,
  chatMetricsByChatId = null,
}: ChatsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aVal = a.lastUserMessageDatetime ?? "";
        const bVal = b.lastUserMessageDatetime ?? "";
        return bVal.localeCompare(aVal);
      }),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedItems;
    return sortedItems.filter((item) =>
      itemMatchesSearch(item, searchQuery, chatMetricsByChatId),
    );
  }, [sortedItems, searchQuery, chatMetricsByChatId]);

  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageItems = useMemo(
    () =>
      filteredItems.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredItems, currentPage],
  );

  return (
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-card2">
          <SearchBar
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="overflow-auto max-h-[70vh] rounded-md border bg-card">
          <Table className="min-w-[2200px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky top-0 z-10 min-w-[150px] bg-background">Nombre</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[80px] bg-background">País</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[130px] bg-background">Contacto</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[130px] bg-background">Canal</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[140px] bg-background">Primer mensaje</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[140px] bg-background">Último mensaje</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[130px] bg-background">Nombre de agente</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[120px] bg-background">Tipificación</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[100px] bg-background">Conversaciones</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[110px] bg-background">Mensajes bot</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[130px] bg-background">Mensajes agente</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[150px] bg-background">Tiempo resp. agente</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[140px] bg-background">Etiquetas</TableHead>
                {VARIABLE_COLUMNS.map(({ key, label }) => (
                  <TableHead key={key} className="sticky top-0 z-10 min-w-[110px] bg-background">
                    {label}
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 z-10 min-w-[100px] bg-background text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={14 + VARIABLE_COLUMNS.length}
                    className="h-24 text-center"
                  >
                    {searchQuery.trim()
                      ? "No hay resultados para la búsqueda."
                      : "No hay chats para mostrar."}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((item) => (
                  <TableRow key={item.chat.chatId} className="align-top">
                    <TableCell className="max-w-[180px] truncate">
                      {[item.firstName, item.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </TableCell>
                    <TableCell>{item.country ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.chat.contactId}
                    </TableCell>
                    <TableCell
                      className="max-w-[140px] truncate font-mono text-xs"
                      title={item.chat.channelId}
                    >
                      {normalizeChannelId(item.chat.channelId)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(item.creationTime)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(item.lastUserMessageDatetime)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {chatMetricsByChatId?.[item.chat.chatId]?.agentName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {chatMetricsByChatId?.[item.chat.chatId]?.typification
                        ? normalizeTypification(
                            chatMetricsByChatId[item.chat.chatId].typification,
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-center tabular-nums">
                      {chatMetricsByChatId?.[item.chat.chatId]?.conversationCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-center tabular-nums">
                      {chatMetricsByChatId?.[item.chat.chatId]?.botMessageCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-center tabular-nums">
                      {chatMetricsByChatId?.[item.chat.chatId]?.agentMessageCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDurationMs(
                        chatMetricsByChatId?.[item.chat.chatId]?.avgAgentResponseMs ?? 0,
                      )}
                    </TableCell>
                    <TableCell>
                      <TagsCell tags={item.tags} />
                    </TableCell>
                    {VARIABLE_COLUMNS.map(({ key }) => (
                      <TableCell key={key} className="text-xs">
                        <VariableValueCell
                          variables={item.variables}
                          variableKey={key}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <a
                        href={
                          chatMetricsByChatId?.[item.chat.chatId]?.conversationLink ||
                          `https://go.botmaker.com/#/chats/${item.chat.chatId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Ver chat
                        <ExternalLink className="size-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalFiltered > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Página siguiente"
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {nextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => onLoadMore(nextPage)}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Cargando…
                </>
              ) : (
                "Cargar más"
              )}
            </Button>
          </div>
        )}
      </div>
  );
}
