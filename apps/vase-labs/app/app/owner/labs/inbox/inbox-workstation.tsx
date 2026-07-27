"use client";

import { ArrowDown, Bell, CheckCheck, Clock3, Loader2, MessageCircle, PauseCircle, PlayCircle, RefreshCw, Send, UserRoundCheck } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LabsStatusPill } from "../labs-ui";
import {
  countInboxConversationsByChannel,
  filterInboxConversationsByChannel,
  inboxChannels,
  normalizeInboxChannel,
  type InboxChannel,
} from "./inbox-channels";
import { formatInboxDeliveryError } from "./inbox-delivery-errors";
import { isInboxNearBottom, shouldAutoScrollInbox } from "./inbox-scroll-policy";
import { mergeInboxConversationSummaries } from "./inbox-conversation-merge";

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

type InboxChannelState = {
  channel: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};

type RawInboxMessage = Partial<Record<keyof InboxMessage, unknown>>;
type RawInboxHandoff = Partial<Record<keyof InboxHandoff, unknown>>;
type RawInboxConversation = Partial<Omit<InboxConversationItem, "messages" | "handoffs">> & {
  messages?: unknown;
  handoffs?: unknown;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
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

function stringify(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value?.toString() ?? fallback;
}

function stringifyNullable(value: unknown) {
  return typeof value === "string" ? value : value?.toString() ?? null;
}

function normalizeConversation(raw: RawInboxConversation): InboxConversationItem {
  return {
    id: stringify(raw.id),
    channel: stringifyNullable(raw.channel),
    status: stringify(raw.status, "OPEN"),
    customerName: stringifyNullable(raw.customerName),
    customerContact: stringifyNullable(raw.customerContact),
    messageCount: typeof raw.messageCount === "number" ? raw.messageCount : 0,
    lastMessageAt: stringifyNullable(raw.lastMessageAt),
    escalatedToHuman: Boolean(raw.escalatedToHuman),
    summary: stringifyNullable(raw.summary),
    messages: Array.isArray(raw.messages) ? raw.messages.map((message: RawInboxMessage) => ({
      id: stringify(message.id),
      role: stringify(message.role, "customer"),
      direction: message.direction === "INBOUND" || message.direction === "OUTBOUND" ? message.direction : null,
      content: stringify(message.content),
      createdAt: stringify(message.createdAt, new Date().toISOString()),
    })) : [],
    handoffs: Array.isArray(raw.handoffs) ? raw.handoffs.map((handoff: RawInboxHandoff) => ({
      id: stringify(handoff.id),
      status: stringify(handoff.status, "OPEN"),
      reason: stringify(handoff.reason),
      priority: stringify(handoff.priority, "normal"),
      assignedTo: stringifyNullable(handoff.assignedTo),
    })) : [],
  };
}

const inboxChannelLabels: Record<InboxChannel, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

const inboxChannelTitles: Record<InboxChannel, string> = {
  WHATSAPP: "Chats de WhatsApp",
  INSTAGRAM: "Chats de Instagram",
  FACEBOOK: "Chats de Facebook",
};

export function InboxWorkstation({
  tenantSlug,
  initialConversations,
  channelStates,
}: {
  tenantSlug: string;
  initialConversations: InboxConversationItem[];
  channelStates: InboxChannelState[];
}) {
  const [conversations, setConversations] = useState(() => sortConversations(initialConversations));
  const [selectedChannel, setSelectedChannel] = useState<InboxChannel>(
    () => normalizeInboxChannel(initialConversations[0]?.channel) ?? "WHATSAPP",
  );
  const [activeId, setActiveId] = useState(initialConversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const operatorSentRef = useRef(false);
  const previousThreadRef = useRef({ conversationId: "", messageCount: 0 });

  const channelCounts = useMemo(
    () => countInboxConversationsByChannel(conversations),
    [conversations],
  );
  const channelStateMap = useMemo(
    () => new Map(
      channelStates.flatMap((state) => {
        const channel = normalizeInboxChannel(state.channel);
        return channel ? [[channel, state] as const] : [];
      }),
    ),
    [channelStates],
  );
  const visibleConversations = useMemo(
    () => filterInboxConversationsByChannel(conversations, selectedChannel),
    [conversations, selectedChannel],
  );
  const activeConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.id === activeId)
      ?? visibleConversations[0]
      ?? null,
    [activeId, visibleConversations],
  );
  const pendingHumanCount = conversations.filter(
    (conversation) => conversation.escalatedToHuman || conversation.handoffs.length > 0,
  ).length;

  useEffect(() => {
    const nextActiveId = visibleConversations.some((conversation) => conversation.id === activeId)
      ? activeId
      : visibleConversations[0]?.id ?? "";
    if (nextActiveId !== activeId) setActiveId(nextActiveId);
  }, [activeId, visibleConversations]);

  function scrollToLatest(behavior: ScrollBehavior = "smooth") {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior });
    nearBottomRef.current = true;
    setShowJumpToLatest(false);
  }

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    const nearBottom = isInboxNearBottom(thread);
    nearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  }

  useEffect(() => {
    if (!activeConversation) return;
    const previous = previousThreadRef.current;
    const conversationChanged = previous.conversationId !== activeConversation.id;
    const messagesAdded = !conversationChanged
      && activeConversation.messages.length > previous.messageCount;
    const operatorSent = operatorSentRef.current;
    const autoScroll = shouldAutoScrollInbox({
      conversationChanged,
      messagesAdded,
      operatorSent,
      wasNearBottom: nearBottomRef.current,
    });
    previousThreadRef.current = {
      conversationId: activeConversation.id,
      messageCount: activeConversation.messages.length,
    };
    operatorSentRef.current = false;
    if (autoScroll) {
      window.requestAnimationFrame(() => scrollToLatest(conversationChanged ? "auto" : "smooth"));
    } else if (messagesAdded) {
      setShowJumpToLatest(true);
    }
  }, [activeConversation?.id, activeConversation?.messages.length]);

  async function refreshConversationList(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.conversations)) return;

      const refreshed = payload.conversations.map(normalizeConversation);
      setConversations((current) => sortConversations(
        mergeInboxConversationSummaries(current, refreshed),
      ));
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
    const interval = window.setInterval(() => {
      void refreshConversationList(true);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [tenantSlug]);

  useEffect(() => {
    if (!activeId) return;
    const interval = window.setInterval(() => {
      void refreshConversation(true);
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

  async function reactivateAi() {
    if (!activeId || handoffBusy) return;
    setHandoffBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}/reactivate`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.conversation) throw new Error("AI_REACTIVATION_FAILED");
      setConversations((current) => sortConversations(current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              status: payload.conversation.status ?? "OPEN",
              escalatedToHuman: false,
              handoffs: [],
            }
          : conversation,
      )));
      setNotice("IA reactivada. Responderá el próximo mensaje del cliente.");
    } catch {
      setError("No pudimos reactivar la IA para esta conversación.");
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
      if (!response.ok) {
        throw {
          code: payload.error ?? "INBOX_REPLY_FAILED",
          providerStatus: payload.providerStatus,
          providerMessage: payload.providerMessage,
        };
      }

      setDraft("");
      setNotice("Mensaje enviado al cliente por el canal oficial.");
      operatorSentRef.current = true;
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
      const source = reason as {
        code?: string;
        providerStatus?: number;
        providerMessage?: string;
      } | null;
      setError(formatInboxDeliveryError(source ?? {}));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="labs-inbox-shell">
      <nav className="labs-inbox-channel-tabs" aria-label="Chats por canal">
        {inboxChannels.map((channel) => {
          const active = selectedChannel === channel;
          const channelState = channelStateMap.get(channel);
          return (
            <button
              key={channel}
              type="button"
              className={active ? "is-active" : ""}
              aria-pressed={active}
              onClick={() => {
                setSelectedChannel(channel);
                setError("");
                setNotice("");
              }}
            >
              <img src={`/icons/channels/${channel.toLowerCase()}.svg`} alt="" aria-hidden="true" />
              <span>
                <strong>{inboxChannelTitles[channel]}</strong>
                <small>
                  {channelCounts[channel]} conversacion{channelCounts[channel] === 1 ? "" : "es"}
                  {" · "}
                  {channelState?.status === "CONNECTED" ? "Conectado" : channelState?.status ?? "No conectado"}
                </small>
              </span>
              <em>{channelCounts[channel]}</em>
            </button>
          );
        })}
      </nav>

      {pendingHumanCount > 0 ? (
        <div className="labs-inbox-alert" aria-live="polite">
          <Bell aria-hidden="true" />
          <span>{pendingHumanCount} conversacion{pendingHumanCount === 1 ? "" : "es"} requiere{pendingHumanCount === 1 ? "" : "n"} atencion humana.</span>
        </div>
      ) : null}

      <div className="labs-inbox-workstation">
      <aside className="labs-inbox-queue" aria-label="Pendientes de atencion">
        <div className="labs-inbox-queue-heading">
          <span>Chats de {inboxChannelLabels[selectedChannel]}</span>
          <strong>{visibleConversations.length}</strong>
        </div>
        {visibleConversations.length === 0 ? (
          <div className="labs-inbox-channel-empty">
            <img src={`/icons/channels/${selectedChannel.toLowerCase()}.svg`} alt="" aria-hidden="true" />
            <strong>No hay conversaciones de este canal</strong>
            <span>Los mensajes nuevos de {inboxChannelLabels[selectedChannel]} apareceran aca automaticamente.</span>
            <small>
              {channelStateMap.get(selectedChannel)?.lastError
                ? `Ultimo webhook: ${channelStateMap.get(selectedChannel)?.lastError}`
                : channelStateMap.get(selectedChannel)?.lastSyncedAt
                  ? `Ultimo webhook: ${formatDate(channelStateMap.get(selectedChannel)?.lastSyncedAt ?? null)}`
                  : "Sin webhooks recibidos"}
            </small>
          </div>
        ) : null}
        {visibleConversations.map((conversation) => {
          const latestMessage = conversation.messages.at(-1);
          const active = conversation.id === activeId;
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

      {activeConversation ? (
      <article className="labs-inbox-thread labs-inbox-thread-card">
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
              onClick={() => void (activeConversation.escalatedToHuman ? reactivateAi() : requestHandoff())}
              disabled={handoffBusy}
              aria-label={activeConversation.escalatedToHuman ? "Reactivar IA" : "Pausar IA e intervenir humano"}
              title={activeConversation.escalatedToHuman ? "Reactivar IA" : "Pausar IA"}
            >
              {handoffBusy
                ? <Loader2 className="animate-spin" aria-hidden="true" />
                : activeConversation.escalatedToHuman
                  ? <PlayCircle aria-hidden="true" />
                  : <PauseCircle aria-hidden="true" />}
              <span>{activeConversation.escalatedToHuman ? "Reactivar IA" : "Pausar IA"}</span>
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

        <div className="labs-inbox-message-viewport">
          <div
            ref={threadRef}
            className="labs-inbox-messages"
            aria-live="polite"
            onScroll={handleThreadScroll}
          >
            {activeConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`labs-inbox-bubble ${message.direction === "OUTBOUND" ? "is-outbound" : "is-inbound"}`}
              >
                <span>{messageAuthor(message)}</span>
                <p>{message.content}</p>
                <div className="labs-inbox-bubble-meta">
                  <time>{formatDate(message.createdAt)}</time>
                  {message.direction === "OUTBOUND" ? (
                    <span>
                      <CheckCheck aria-hidden="true" />
                      Entregado
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {showJumpToLatest ? (
            <button
              type="button"
              className="labs-inbox-jump-latest"
              onClick={() => scrollToLatest()}
              aria-label="Ir al último mensaje"
              title="Ir al último mensaje"
            >
              <ArrowDown aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <form onSubmit={sendReply} className="labs-inbox-composer">
          <div className="labs-inbox-composer-heading">
            <label htmlFor="inbox-human-reply">
              <UserRoundCheck aria-hidden="true" />
              Respuesta humana
            </label>
            <span>{activeConversation.channel ?? "Canal"}</span>
          </div>
          <div className="labs-inbox-composer-field">
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
      ) : (
        <article className="labs-inbox-thread-empty" aria-live="polite">
          <img src={`/icons/channels/${selectedChannel.toLowerCase()}.svg`} alt="" aria-hidden="true" />
          <p className="vase-kicker">{inboxChannelLabels[selectedChannel]}</p>
          <h2>Esperando el primer mensaje</h2>
          <p>Cuando un cliente escriba por {inboxChannelLabels[selectedChannel]}, el chat se abrira en esta bandeja.</p>
          <button type="button" onClick={() => void refreshConversationList()} disabled={refreshing}>
            {refreshing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Comprobar mensajes
          </button>
        </article>
      )}
      </div>
    </section>
  );
}
