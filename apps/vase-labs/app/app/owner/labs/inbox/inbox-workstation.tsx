"use client";

import { Bell, Clock3, Loader2, MessageCircle, PauseCircle, RefreshCw, Send, UserRoundCheck } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LabsStatusPill } from "../labs-ui";

type InboxMessage = {
  id: string;
  role: string;
  direction: "INBOUND" | "OUTBOUND" | null;
  content: string;
  createdAt: string;
};

type InboxHandoff = {
  id: string;
  status: string;
  reason: string;
  priority: string;
  assignedTo: string | null;
};

export type InboxConversationItem = {
  id: string;
  channel: string | null;
  status: string;
  customerName: string | null;
  customerContact: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  escalatedToHuman: boolean;
  summary: string | null;
  messages: InboxMessage[];
  handoffs: InboxHandoff[];
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function messageAuthor(message: Pick<InboxMessage, "role" | "direction">) {
  if (message.role === "human_agent") return "Equipo";
  if (message.direction === "OUTBOUND") return "IA";
  return "Cliente";
}

function sortConversations(conversations: InboxConversationItem[]) {
  return [...conversations].sort((left, right) =>
    new Date(right.lastMessageAt ?? 0).getTime() - new Date(left.lastMessageAt ?? 0).getTime(),
  );
}

function normalizeConversation(raw: any): InboxConversationItem {
  return {
    id: raw.id,
    channel: raw.channel ?? null,
    status: raw.status,
    customerName: raw.customerName ?? null,
    customerContact: raw.customerContact ?? null,
    messageCount: raw.messageCount ?? 0,
    lastMessageAt: typeof raw.lastMessageAt === "string" ? raw.lastMessageAt : raw.lastMessageAt?.toString() ?? null,
    escalatedToHuman: Boolean(raw.escalatedToHuman),
    summary: raw.summary ?? null,
    messages: Array.isArray(raw.messages) ? raw.messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      direction: message.direction,
      content: message.content,
      createdAt: typeof message.createdAt === "string" ? message.createdAt : message.createdAt?.toString() ?? new Date().toISOString(),
    })) : [],
    handoffs: Array.isArray(raw.handoffs) ? raw.handoffs.map((handoff: any) => ({
      id: handoff.id,
      status: handoff.status,
      reason: handoff.reason,
      priority: handoff.priority,
      assignedTo: handoff.assignedTo ?? null,
    })) : [],
  };
}

export function InboxWorkstation({
  tenantSlug,
  initialConversations,
}: {
  tenantSlug: string;
  initialConversations: InboxConversationItem[];
}) {
  const [conversations, setConversations] = useState(() => sortConversations(initialConversations));
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? conversations[0] ?? null,
    [activeId, conversations],
  );
  const pendingHumanCount = conversations.filter(
    (conversation) => conversation.escalatedToHuman || conversation.handoffs.length > 0,
  ).length;

  useEffect(() => {
    if (!activeConversation) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [activeConversation?.messages.length, activeConversation]);

  async function refreshConversationList(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.conversations)) return;

      setConversations(sortConversations(payload.conversations.map(normalizeConversation)));
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  async function refreshConversation(silent = false) {
    if (!activeId) return;
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.conversation) return;

      setConversations((current) => sortConversations(current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              status: payload.conversation.status,
              escalatedToHuman: payload.conversation.escalatedToHuman,
              messageCount: payload.conversation.messageCount,
              lastMessageAt: payload.conversation.lastMessageAt,
              handoffs: payload.conversation.handoffs ?? conversation.handoffs,
              messages: payload.messages ?? conversation.messages,
            }
          : conversation,
      )));
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!activeId) return;
    const interval = window.setInterval(() => {
      void refreshConversation(true);
      void refreshConversationList(true);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [activeId]);

  async function requestHandoff() {
    if (!activeId || handoffBusy) return;
    setHandoffBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}/handoff`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Intervencion humana solicitada desde Inbox." }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.handoff) throw new Error("HANDOFF_FAILED");

      setConversations((current) => sortConversations(current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              status: payload.conversation?.status ?? "ESCALATED",
              escalatedToHuman: true,
              handoffs: [payload.handoff],
            }
          : conversation,
      )));
      setNotice("IA pausada. El equipo puede responder esta conversacion.");
    } catch {
      setError("No pudimos pausar la IA para esta conversacion.");
    } finally {
      setHandoffBusy(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!activeId || !text || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "INBOX_REPLY_FAILED");

      setDraft("");
      setConversations((current) => sortConversations(current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              escalatedToHuman: true,
              messageCount: conversation.messageCount + 1,
              lastMessageAt: payload.message.createdAt,
              messages: [...conversation.messages, payload.message],
            }
          : conversation,
      )));
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "";
      setError(code === "CONVERSATION_NOT_DELIVERABLE"
        ? "Esta conversacion no tiene un canal entregable."
        : "No pudimos enviar el mensaje.");
    } finally {
      setBusy(false);
    }
  }

  if (!activeConversation) {
    return null;
  }

  return (
    <section className="labs-inbox-shell">
      {pendingHumanCount > 0 ? (
        <div className="labs-inbox-alert" aria-live="polite">
          <Bell aria-hidden="true" />
          <span>{pendingHumanCount} conversacion{pendingHumanCount === 1 ? "" : "es"} requiere{pendingHumanCount === 1 ? "" : "n"} atencion humana.</span>
        </div>
      ) : null}

      <div className="labs-inbox-workstation">
      <aside className="labs-inbox-queue" aria-label="Pendientes de atencion">
        {conversations.map((conversation) => {
          const latestMessage = conversation.messages.at(-1);
          const active = conversation.id === activeConversation.id;
          const hasHandoff = conversation.escalatedToHuman || conversation.handoffs.length > 0;
          return (
            <button
              type="button"
              key={conversation.id}
              onClick={() => setActiveId(conversation.id)}
              className={active ? "is-active" : ""}
            >
              <span className="labs-inbox-queue-title">
                <strong>{conversation.customerName ?? conversation.customerContact ?? "Cliente"}</strong>
                <em>{conversation.channel ?? "LABS"}</em>
              </span>
              <small>
                {latestMessage ? `${messageAuthor(latestMessage)}: ${latestMessage.content}` : conversation.summary ?? "Sin mensajes"}
              </small>
              <span className="labs-inbox-queue-meta">
                <LabsStatusPill label={conversation.status} tone={conversation.status === "ESCALATED" ? "warning" : "info"} />
                {hasHandoff ? <LabsStatusPill label="Humano" tone="warning" /> : null}
                <small><MessageCircle aria-hidden="true" />{conversation.messageCount}</small>
                <small><Clock3 aria-hidden="true" />{formatDate(conversation.lastMessageAt)}</small>
              </span>
            </button>
          );
        })}
      </aside>

      <article className="labs-inbox-thread">
        <header>
          <div>
            <p className="vase-kicker">{activeConversation.channel ?? "LABS"}</p>
            <h2>{activeConversation.customerName ?? activeConversation.customerContact ?? "Cliente"}</h2>
            <span>{formatDate(activeConversation.lastMessageAt)}</span>
          </div>
          <div className="labs-inbox-actions">
            <LabsStatusPill label={activeConversation.status} tone={activeConversation.status === "ESCALATED" ? "warning" : "info"} />
            {activeConversation.escalatedToHuman ? (
              <LabsStatusPill label="Humano activo" tone="warning" />
            ) : null}
            <button
              type="button"
              onClick={() => void requestHandoff()}
              disabled={handoffBusy || activeConversation.escalatedToHuman}
              aria-label="Pausar IA e intervenir humano"
              title="Pausar IA"
            >
              {handoffBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
              <span>{activeConversation.escalatedToHuman ? "IA pausada" : "Pausar IA"}</span>
            </button>
            <button type="button" onClick={() => void refreshConversation()} aria-label="Actualizar hilo">
              {refreshing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            </button>
          </div>
        </header>

        {activeConversation.handoffs[0] ? (
          <div className="labs-inbox-handoff">
            <UserRoundCheck aria-hidden="true" />
            <span>{activeConversation.handoffs[0].reason}</span>
          </div>
        ) : null}

        <div ref={threadRef} className="labs-inbox-messages" aria-live="polite">
          {activeConversation.messages.map((message) => (
            <div
              key={message.id}
              className={`labs-inbox-bubble ${message.direction === "OUTBOUND" ? "is-outbound" : "is-inbound"}`}
            >
              <span>{messageAuthor(message)}</span>
              <p>{message.content}</p>
              <time>{formatDate(message.createdAt)}</time>
            </div>
          ))}
        </div>

        <form onSubmit={sendReply} className="labs-inbox-composer">
          <label htmlFor="inbox-human-reply">Intervenir humano</label>
          <div>
            <textarea
              id="inbox-human-reply"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Escribi la respuesta del equipo..."
              disabled={busy}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar respuesta humana">
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            </button>
          </div>
          {error ? <p role="alert">{error}</p> : null}
          {notice ? <p className="is-success" aria-live="polite">{notice}</p> : null}
        </form>
      </article>
      </div>
    </section>
  );
}
