"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatDuration } from "@/lib/agent-aggregation";
import type { AgentSummary } from "@/types/botmaker";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

function agentMatchesSearch(agent: AgentSummary, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const parts = [
    agent.agentName,
    agent.queue,
    agent.topTypification,
    agent.isOnline != null ? (agent.isOnline ? "verdadero" : "falso") : "",
    agent.status ?? "",
    String(agent.closedConversations),
    String(agent.openConversations),
    String(agent.onHold),
    String(agent.totalResponses),
    String(agent.transfersIn),
    String(agent.transfersOut),
  ];
  return parts.join(" ").toLowerCase().includes(q);
}

export interface AgentsTableProps {
  agents: AgentSummary[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    return agents.filter((a) => agentMatchesSearch(a, searchQuery));
  }, [agents, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalFiltered = filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageAgents = useMemo(
    () =>
      filteredAgents.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredAgents, currentPage],
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card2 px-3 py-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nombre, cola, tipificación…"
        />
      </div>

      <div className="overflow-auto max-h-[70vh] rounded-md border bg-card">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-10 min-w-[140px] bg-background">
                Nombre
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[120px] bg-background">
                Cola
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[90px] bg-background">
                En línea
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[90px] bg-background">
                Estado
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[90px] bg-background text-right">
                Conv. cerradas
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[90px] bg-background text-right">
                Conv. abiertas
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[90px] bg-background text-right">
                En espera
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[110px] bg-background">
                T. 1ª respuesta
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[110px] bg-background">
                T. atención
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[90px] bg-background text-right">
                Respuestas
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageAgents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  {searchQuery.trim()
                    ? "No hay resultados para la búsqueda."
                    : "No hay agentes para mostrar."}
                </TableCell>
              </TableRow>
            ) : (
              pageAgents.map((agent) => (
                <TableRow key={agent.agentId}>
                  <TableCell className="font-medium">
                    {agent.agentName || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agent.queue || "—"}
                  </TableCell>
                  <TableCell>
                    {agent.isOnline === true
                      ? "Verdadero"
                      : agent.isOnline === false
                        ? "Falso"
                        : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agent.status ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {agent.closedConversations}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {agent.openConversations}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {agent.onHold}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDuration(agent.avgFirstResponseMs)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDuration(agent.avgAttendingTimeMs)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {agent.totalResponses}
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
            Página {currentPage} de {totalPages} · Mostrando{" "}
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, totalFiltered)} de {totalFiltered}
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
    </div>
  );
}
