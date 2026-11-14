// Parte de actions.ts: SupportActionState, parseKnowledgeTags.
import { sanitizeText } from "@/lib/security/sanitize";

export type SupportActionState = {
  success?: string;
  error?: string;
  reply?: string;
  knowledgeItemCount?: number;
  responseLogId?: string;
};

export function parseKnowledgeTags(rawValue: string) {
  return rawValue
    .split(",")
    .map((tag) => sanitizeText(tag))
    .filter(Boolean);
}
