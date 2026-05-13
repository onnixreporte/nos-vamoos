"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/chats/search-bar";
import type { ChatWithMessagesResponse } from "@/types/botmaker";

const PAGE_SIZE = 20;

interface DestinationsTableProps {
  chats: ChatWithMessagesResponse[];
}

const COLUMNS = [
  "Destino",
  "Origen",
  "Tipo paquete",
  "Dias",
  "Pasajeros",
  "Adultos",
  "Ninos",
  "Fecha viaje",
  "Pais",
];

function matchesSearch(
  chat: ChatWithMessagesResponse,
  query: string,
): boolean {
  const q = query.toLowerCase();
  const fields = [
    chat.variables?.destino_viaje,
    chat.variables?.origen,
    chat.variables?.tipo_paquete,
    chat.variables?.cantidad_dias,
    chat.variables?.cantidad_pasajeros,
    chat.variables?.cantidad_adultos,
    chat.variables?.cantidad_ninos,
    chat.variables?.fecha_viaje,
    chat.externalId,
    chat.country,
  ];
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export function DestinationsTable({ chats }: DestinationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const destinationChats = useMemo(
    () => chats.filter((c) => c.variables?.destino_viaje?.trim()),
    [chats],
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return destinationChats;
    return destinationChats.filter((c) => matchesSearch(c, searchQuery));
  }, [destinationChats, searchQuery]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const startItem = safePage * PAGE_SIZE;
  const pageItems = filteredItems.slice(startItem, startItem + PAGE_SIZE);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            setPage(0);
          }}
          placeholder="Buscar en destinos..."
        />
        <p className="ml-auto text-xs text-muted-foreground">
          {totalItems} consultas
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
                  No hay destinos para mostrar.
                </td>
              </tr>
            ) : (
              pageItems.map((chat) => {
                const v = chat.variables ?? {};
                return (
                  <tr
                    key={chat.chat.chatId}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.destino_viaje || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.origen || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.tipo_paquete || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                      {v.cantidad_dias || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                      {v.cantidad_pasajeros || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                      {v.cantidad_adultos || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                      {v.cantidad_ninos || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {v.fecha_viaje || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {chat.country || "\u2014"}
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
