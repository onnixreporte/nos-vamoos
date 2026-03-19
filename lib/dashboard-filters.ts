import type { AgentMetricsItem, ChatWithMessagesResponse } from "@/types/botmaker";

export interface AdditionalFilters {
  agent: string;
  typification: string;
  tag: string;
}

export interface AdditionalFilterOptions {
  agents: string[];
  typifications: string[];
  tags: string[];
}

export const DEFAULT_ADDITIONAL_FILTERS: AdditionalFilters = {
  agent: "all",
  typification: "all",
  tag: "all",
};

/** Typification used for testing; excluded from charts and filter options. */
export const TEST_TYPIFICATION_NORMALIZED = "Testing Conversación de Prueba";

export function normalizeTypification(raw: string): string {
  return raw.replaceAll("_", " ");
}

export function isTestTypification(normalized: string): boolean {
  return normalized === TEST_TYPIFICATION_NORMALIZED;
}

export const EXCLUDED_AGENT_NAMES = new Set([
  "Angela Milen",
  "Angela Milena Ojeda Alarcon",
  "Andrés Pangrazio",
  "Cesar Josué Farias Vega",
  "Christian Chaparro",
  "Christian Chaparroa Ojeda Alarcon",
  "Enzo Rafael Gregor Nunez",
  "Hector Andres Riveros Miranda",
  "Patty Villalba",
]);

/**
 * Collect chatIds whose typification is the test one so they can be excluded
 * from all dashboard computations.
 */
export function buildTestTypificationChatIds(
  agentItems: AgentMetricsItem[],
): Set<string> {
  const ids = new Set<string>();
  for (const item of agentItems) {
    const raw = item.typification?.trim();
    if (raw && isTestTypification(normalizeTypification(raw)) && item.chatId) {
      ids.add(item.chatId);
    }
  }
  return ids;
}

export function buildAdditionalFilterOptions(
  chats: ChatWithMessagesResponse[],
  agentItems: AgentMetricsItem[] = [],
): AdditionalFilterOptions {
  const agentSet = new Set<string>();
  const typificationSet = new Set<string>();
  const tagSet = new Set<string>();

  for (const item of agentItems) {
    const agentName = item.agentName?.trim();
    const typificationRaw = item.typification?.trim();
    const typification = typificationRaw
      ? normalizeTypification(typificationRaw)
      : "";
    if (agentName) agentSet.add(agentName);
    if (typification && !isTestTypification(typification)) typificationSet.add(typification);
  }

  for (const chat of chats) {
    const fallbackAgent = chat.agentId?.trim();
    if (fallbackAgent) agentSet.add(fallbackAgent);
    for (const tag of chat.tags ?? []) {
      const cleanTag = tag.trim();
      if (cleanTag) tagSet.add(cleanTag);
    }
  }

  return {
    agents: Array.from(agentSet).sort((a, b) => a.localeCompare(b)),
    typifications: Array.from(typificationSet).sort((a, b) =>
      a.localeCompare(b),
    ),
    tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
  };
}

export function buildChatMetadataMaps(
  agentItems: AgentMetricsItem[],
): {
  agentNameByChatId: Map<string, string>;
  typificationByChatId: Map<string, string>;
  conversationLinkByChatId: Map<string, string>;
} {
  const agentNameByChatId = new Map<string, string>();
  const typificationByChatId = new Map<string, string>();
  const conversationLinkByChatId = new Map<string, string>();

  for (const item of agentItems) {
    if (!item.chatId) continue;

    const agentName = item.agentName?.trim();
    const typificationRaw = item.typification?.trim();
    const typification = typificationRaw
      ? normalizeTypification(typificationRaw)
      : "";
    const conversationLink =
      typeof item.conversationLink === "string"
        ? item.conversationLink.trim()
        : "";

    if (agentName && !agentNameByChatId.has(item.chatId)) {
      agentNameByChatId.set(item.chatId, agentName);
    }
    if (typification && !typificationByChatId.has(item.chatId)) {
      typificationByChatId.set(item.chatId, typification);
    }
    if (conversationLink && !conversationLinkByChatId.has(item.chatId)) {
      conversationLinkByChatId.set(item.chatId, conversationLink);
    }
  }

  return { agentNameByChatId, typificationByChatId, conversationLinkByChatId };
}

export function chatMatchesAdditionalFilters(
  chat: ChatWithMessagesResponse,
  filters: AdditionalFilters,
  metadata?: {
    agentNameByChatId?: Map<string, string>;
    typificationByChatId?: Map<string, string>;
  },
): boolean {
  const hasAgentFilter = filters.agent !== "all";
  const hasTypificationFilter = filters.typification !== "all";
  const hasTagFilter = filters.tag !== "all";

  if (!hasAgentFilter && !hasTypificationFilter && !hasTagFilter) {
    return true;
  }

  if (hasTagFilter && !(chat.tags ?? []).includes(filters.tag)) {
    return false;
  }

  if (hasAgentFilter) {
    const agentName = metadata?.agentNameByChatId?.get(chat.chat.chatId);
    const fallbackAgentId = chat.agentId?.trim();
    const effectiveAgent = agentName || fallbackAgentId || "";
    if (effectiveAgent !== filters.agent) {
      return false;
    }
  }

  if (hasTypificationFilter) {
    const typificationRaw =
      metadata?.typificationByChatId?.get(chat.chat.chatId) ?? "";
    const typification = normalizeTypification(typificationRaw);
    if (typification !== filters.typification) {
      return false;
    }
  }

  return true;
}
