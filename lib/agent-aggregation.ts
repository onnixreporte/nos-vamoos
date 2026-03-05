import type { AgentMetricsItem, AgentSummary } from "@/types/botmaker";
import {
  normalizeTypification,
  isTestTypification,
} from "@/lib/dashboard-filters";

function parseNum(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format milliseconds as human-readable duration (e.g. "2m 15s", "45s", "1h 3m").
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms === 0) return "0s";
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Aggregate raw agent-metrics items (per session) into one summary per agent.
 */
export function aggregateByAgent(items: AgentMetricsItem[]): AgentSummary[] {
  const byAgent = new Map<
    string,
    {
      agentName: string;
      queue: string;
      closedConversationIds: Set<string>;
      openConversationIds: Set<string>;
      onHold: number;
      firstResponseSumMs: number;
      firstResponseCount: number;
      attendingSumMs: number;
      attendingCount: number;
      totalResponses: number;
      transfersIn: number;
      transfersOut: number;
      closedWithNoMessages: number;
      timeouts: number;
      typifications: Record<string, number>;
    }
  >();

  for (const item of items) {
    const agentId = item.agentId ?? "";
    if (!agentId) continue;

    let acc = byAgent.get(agentId);
    if (!acc) {
      acc = {
        agentName: item.agentName ?? "",
        queue: item.queue ?? "",
        closedConversationIds: new Set<string>(),
        openConversationIds: new Set<string>(),
        onHold: 0,
        firstResponseSumMs: 0,
        firstResponseCount: 0,
        attendingSumMs: 0,
        attendingCount: 0,
        totalResponses: 0,
        transfersIn: 0,
        transfersOut: 0,
        closedWithNoMessages: 0,
        timeouts: 0,
        typifications: {},
      };
      byAgent.set(agentId, acc);
    }

    acc.agentName = item.agentName ?? acc.agentName;
    acc.queue = item.queue ?? acc.queue;
    if (item.chatId) {
      if (parseNum(item.closedSessions) > 0) {
        acc.closedConversationIds.add(item.chatId);
      }
      if (parseNum(item.openSessions) > 0) {
        acc.openConversationIds.add(item.chatId);
      }
    }
    acc.onHold += parseNum(item.onHold);
    const firstRespMs = parseNum(item.fromOpAssignedToOpFirstResponse);
    if (firstRespMs > 0) {
      acc.firstResponseSumMs += firstRespMs;
      acc.firstResponseCount += 1;
    }
    const attendingMs = parseNum(item.avgAttendingTime);
    if (attendingMs > 0) {
      acc.attendingSumMs += attendingMs;
      acc.attendingCount += 1;
    }
    acc.totalResponses += parseNum(item.operatorResponses);
    acc.transfersIn += parseNum(item.sessionTransferIn);
    acc.transfersOut += parseNum(item.sessionTransferOut);
    acc.closedWithNoMessages += parseNum(item.closedWithNoMessages);
    acc.timeouts +=
      parseNum(item.agentTimeout) +
      parseNum(item.userTimeout) +
      parseNum(item.sessionTimeout);

    const typ = item.typification?.trim()
      ? normalizeTypification(item.typification.trim())
      : "—";
    if (!isTestTypification(typ)) {
      acc.typifications[typ] = (acc.typifications[typ] ?? 0) + 1;
    }
  }

  const result: AgentSummary[] = [];
  for (const [agentId, acc] of byAgent.entries()) {
    const topTypification =
      Object.entries(acc.typifications)
        .filter(([t]) => !isTestTypification(t))
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    result.push({
      agentId,
      agentName: acc.agentName,
      queue: acc.queue,
      totalConversations:
        acc.closedConversationIds.size + acc.openConversationIds.size + acc.onHold,
      closedConversations: acc.closedConversationIds.size,
      openConversations: acc.openConversationIds.size,
      onHold: acc.onHold,
      avgFirstResponseMs:
        acc.firstResponseCount > 0
          ? acc.firstResponseSumMs / acc.firstResponseCount
          : 0,
      avgAttendingTimeMs:
        acc.attendingCount > 0
          ? acc.attendingSumMs / acc.attendingCount
          : 0,
      totalResponses: acc.totalResponses,
      transfersIn: acc.transfersIn,
      transfersOut: acc.transfersOut,
      closedWithNoMessages: acc.closedWithNoMessages,
      timeouts: acc.timeouts,
      typifications: acc.typifications,
      topTypification,
    });
  }

  return result.sort((a, b) => b.closedConversations - a.closedConversations);
}
