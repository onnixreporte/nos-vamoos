import type { ChatWithMessagesResponse } from "@/types/botmaker";

export const TEST_CONTACT_IDS = new Set([
  "595972417062",
  "595994757235",
  "595994351389",
  "595983444521",
  "595972801607",
  "595981197690",
  "595994156891",
]);

export function isTestChat(chat: ChatWithMessagesResponse): boolean {
  return TEST_CONTACT_IDS.has(chat.chat.contactId);
}
