"use client";

// Resumen al tomar la charla, cliente molesto y respuestas con tu estilo: se piden una vez por mensaje del cliente.
import { useCallback, useEffect, useRef, useState } from "react";
import { needsPerson, type InboxConversationItem } from "./normalize-conversation";

export type InboxAssist = {
  brief: string[];
  mood: "calm" | "upset";
  moodReason: string;
  replies: string[];
};

type AssistState =
  | { status: "loading"; lastMessageId: string; data?: InboxAssist }
  | { status: "ok"; lastMessageId: string; data: InboxAssist }
  | { status: "error"; lastMessageId: string; message: string; data?: InboxAssist };

const UPSET_PREFIX = /^cliente molesto:\s*/i;

/** La IA pasó la charla porque el cliente está molesto ("Cliente molesto: ..."). */
export function isUpsetHandoff(reason: string | undefined | null) {
  return Boolean(reason && UPSET_PREFIX.test(reason.trim()));
}

export function upsetHandoffReason(reason: string) {
  const text = reason.trim().replace(UPSET_PREFIX, "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function errorMessage(status: number) {
  if (status === 402) return "No queda uso de IA en tu plan este mes.";
  if (status === 503) return "La IA no está configurada en esta cuenta.";
  return "No pudimos armar las sugerencias. Probá de nuevo.";
}

export function useInboxAssist(tenantSlug: string, conversation: InboxConversationItem | null, enabled: boolean) {
  const [states, setStates] = useState<Record<string, AssistState>>({});
  const inflight = useRef(new Set<string>());
  const lastMessage = conversation?.messages.at(-1);
  const lastMessageId = lastMessage?.id ?? "";
  const conversationId = conversation?.id ?? "";

  const request = useCallback(async (id: string, messageId: string) => {
    const key = `${id}:${messageId}`;
    if (!id || !messageId || inflight.current.has(key)) return;
    inflight.current.add(key);
    setStates((current) => ({ ...current, [id]: { status: "loading", lastMessageId: messageId, data: current[id]?.data } }));
    const fail = (status: number) =>
      setStates((current) => ({ ...current, [id]: { status: "error", lastMessageId: messageId, message: errorMessage(status), data: current[id]?.data } }));
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations/${id}/assist`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.assist) {
        fail(response.status);
        return;
      }
      setStates((current) => ({ ...current, [id]: { status: "ok", lastMessageId: messageId, data: payload.assist as InboxAssist } }));
    } catch {
      fail(0);
    } finally {
      inflight.current.delete(key);
    }
  }, [tenantSlug]);

  // Solo se pide sola cuando la charla te necesita y lo último lo escribió el cliente.
  const auto = Boolean(
    enabled
      && conversation
      && needsPerson(conversation)
      && lastMessage
      && lastMessage.direction !== "OUTBOUND",
  );
  const current = conversationId ? states[conversationId] : undefined;
  const stale = !current || current.lastMessageId !== lastMessageId;

  useEffect(() => {
    if (!auto || !stale) return;
    // Espera un momento por si se está pasando de una charla a otra.
    const timer = window.setTimeout(() => void request(conversationId, lastMessageId), 500);
    return () => window.clearTimeout(timer);
  }, [auto, stale, conversationId, lastMessageId, request]);

  // Mientras llega una respuesta nueva se sigue mostrando la anterior.
  const shown = current?.data;
  return {
    assist: shown,
    loading: current?.status === "loading",
    error: current?.status === "error" ? current.message : "",
    fresh: Boolean(current && !stale),
    refresh: () => void request(conversationId, lastMessageId),
  };
}
