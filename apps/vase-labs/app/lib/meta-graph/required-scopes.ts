// Parte de meta-graph.ts: GraphPayload, REQUIRED_SCOPES, SUBSCRIBED_FIELDS, asRecord, asArray, stringValue.
import { type LabsChannel } from "@vase/contracts";

export type GraphPayload = Record<string, unknown>;

export const REQUIRED_SCOPES: Record<LabsChannel, string[]> = {
  WHATSAPP: ["whatsapp_business_management", "whatsapp_business_messaging"],
  INSTAGRAM: ["instagram_business_basic", "instagram_business_manage_messages"],
  FACEBOOK: ["pages_messaging", "pages_manage_metadata"],
};

export const SUBSCRIBED_FIELDS: Record<LabsChannel, string[]> = {
  WHATSAPP: ["messages"],
  INSTAGRAM: ["messages"],
  FACEBOOK: ["messages", "messaging_postbacks", "message_deliveries", "message_reads"],
};

export function asRecord(value: unknown): GraphPayload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GraphPayload)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
