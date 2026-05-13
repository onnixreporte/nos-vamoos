/**
 * Types for Botmaker API v2 (List and Search chats, ChatsPage response).
 * @see api-botmaker.json components/schemas ChatReferenceRes, ChatWithMessagesResponse, ChatsPage
 */

export interface ChatReferenceRes {
  chatId: string;
  channelId: string;
  contactId: string;
}

export interface ChatWithMessagesResponse {
  chat: ChatReferenceRes;
  creationTime?: string;
  lastSessionCreationTime?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  email?: string;
  whatsAppWindowCloseDatetime?: string;
  variables?: Record<string, string>;
  tags?: string[];
  queueId?: string;
  agentId?: string;
  onHoldAgentId?: string;
  lastUserMessageDatetime?: string;
  listMessagesURL?: string;
  isBanned?: boolean;
  isTester?: boolean;
  isBotMuted?: boolean;
}

export interface ChatsPage {
  nextPage: string | null;
  items: ChatWithMessagesResponse[];
}

/**
 * Agent Metrics (List Agents metrics) - by conversation.
 * @see api-botmaker.json /dashboards/agent-metrics, DashboardMetricsPage
 */
export interface AgentMetricsItem {
  chatId: string;
  agentId?: string;
  agentName?: string;
  typification?: string;
  sessionCreationTime?: string;
  closedTime?: string;
  queue?: string;
  avgAttendingTime?: string;
  avgResponseTime?: string;
  openSessions?: string;
  closedSessions?: string;
  onHold?: string;
  operatorResponses?: string;
  fromOpAssignedToOpFirstResponse?: string;
  sessionTransferIn?: string;
  sessionTransferOut?: string;
  closedWithNoMessages?: string;
  agentTimeout?: string;
  userTimeout?: string;
  sessionTimeout?: string;
  conversationLink?: string;
  [key: string]: unknown;
}

export interface AgentMetricsPage {
  nextPage: string | null;
  items: AgentMetricsItem[];
}

export interface SessionItem {
  id: string;
  creationTime?: string;
  startingCause?: string;
  chat: {
    chat: {
      chatId: string;
      channelId?: string;
      contactId?: string;
    };
    creationTime?: string;
    lastSessionCreationTime?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface SessionsPage {
  nextPage: string | null;
  items: SessionItem[];
}

/**
 * Agent list item from GET /agents (List agents).
 * @see api-botmaker.json AgentResponse, AgentsPage
 */
export interface AgentListItem {
  id: string;
  email?: string;
  name?: string;
  alias?: string;
  isOnline?: boolean;
  status?: string;
  role?: string;
  queues?: string[];
  slots?: number;
  priority?: string;
  groups?: string[];
  additionalInfo?: Record<string, unknown>;
  creationTime?: string;
}

export interface AgentsListPage {
  nextPage?: string | null;
  items?: AgentListItem[];
}

/**
 * Aggregated metrics per agent (from AgentMetricsItem[] grouped by agentId).
 */
export interface AgentSummary {
  agentId: string;
  agentName: string;
  queue: string;
  totalConversations: number;
  closedConversations: number;
  openConversations: number;
  onHold: number;
  avgFirstResponseMs: number;
  avgAttendingTimeMs: number;
  totalResponses: number;
  transfersIn: number;
  transfersOut: number;
  closedWithNoMessages: number;
  timeouts: number;
  typifications: Record<string, number>;
  topTypification: string;
  /** From GET /agents (list agents). */
  isOnline?: boolean;
  /** From GET /agents (list agents). */
  status?: string;
}

export interface MessageResponse {
  id?: string;
  creationTime?: string;
  from?: "bot" | "user" | "agent";
  agentId?: string;
  queueId?: string;
  sessionCreationTime?: string;
  sessionId?: string;
  chat: ChatReferenceRes;
}

export interface MessagesPage {
  nextPage?: string | null;
  items?: MessageResponse[];
}
