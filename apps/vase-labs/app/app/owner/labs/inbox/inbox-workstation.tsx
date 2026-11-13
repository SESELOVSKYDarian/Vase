"use client";

import { ArrowDown, CheckCheck, ChevronDown, ChevronUp, CircleAlert, Clock3, Loader2, Maximize2, Minimize2, PanelRightOpen, PauseCircle, PlayCircle, RefreshCw, Send, Sparkles, UserRoundCheck, X } from "lucide-react";
import { type FormEvent, Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  countInboxConversationsByChannel,
  filterInboxConversationsByChannel,
  inboxChannels,
  normalizeInboxChannel,
  type InboxChannel,
} from "./inbox-channels";
import { formatInboxDeliveryError, parseInboxReplyResponse } from "./inbox-delivery-errors";
import {
  resolveInboxMessageDelivery,
  type InboxMessageDelivery,
} from "./inbox-message-delivery";
import { isInboxNearBottom, restoreInboxScrollOffset, shouldAutoScrollInbox } from "./inbox-scroll-policy";
import { mergeInboxConversationSummaries, reconcileInboxMessages } from "./inbox-conversation-merge";

type InboxMessage = {
  id: string;
  role: string;
  direction: "INBOUND" | "OUTBOUND" | null;
  content: string;
  createdAt: string;
  delivery: InboxMessageDelivery | null;
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

/** Lo que el análisis sabe de cada cliente (Conversaciones › Del cliente). */
export type InboxInsight = {
  leadScore: number;
  intentLabel: string;
  currentNeed: string;
  productInterests: string[];
  recommendations: string[];
  nextBestAction: string;
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

const inboxTimeZone = "America/Argentina/Buenos_Aires";

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { timeStyle: "short", timeZone: inboxTimeZone }).format(new Date(value));
}

function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: inboxTimeZone }).format(new Date(value));
}

function formatDay(value: string) {
  const key = dayKey(value);
  const today = new Date();
  if (key === dayKey(today)) return "Hoy";
  if (key === dayKey(new Date(today.getTime() - 86_400_000))) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: inboxTimeZone }).format(new Date(value));
}

function formatQueueTime(value: string | null) {
  if (!value) return "";
  if (dayKey(value) === dayKey(new Date())) return formatTime(value);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: inboxTimeZone }).format(new Date(value));
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "#";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const conversationStatusLabels: Record<string, string> = {
  OPEN: "Abierta",
  ESCALATED: "Con humano",
  CLOSED: "Cerrada",
};

function conversationStatusLabel(status: string) {
  return conversationStatusLabels[status] ?? status;
}

function resizeDraft(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
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
    messages: Array.isArray(raw.messages) ? raw.messages.map((message: RawInboxMessage) => {
      const rawDelivery = message.delivery && typeof message.delivery === "object"
        ? message.delivery as Partial<Record<keyof InboxMessageDelivery, unknown>>
        : null;
      return {
        id: stringify(message.id),
        role: stringify(message.role, "customer"),
        direction: message.direction === "INBOUND" || message.direction === "OUTBOUND" ? message.direction : null,
        content: stringify(message.content),
        createdAt: stringify(message.createdAt, new Date().toISOString()),
        delivery: rawDelivery
          ? {
              status: rawDelivery.status === "SENT" || rawDelivery.status === "FAILED"
                ? rawDelivery.status
                : "PENDING",
              providerMessageId: stringifyNullable(rawDelivery.providerMessageId),
              error: stringifyNullable(rawDelivery.error),
            }
          : null,
      };
    }) : [],
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

type ChannelFilter = InboxChannel | "ALL";
type StatusFilter = "todas" | "necesitan" | "ia";

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "necesitan", label: "Te necesitan" },
  { id: "ia", label: "Atiende la IA" },
];

function needsPerson(conversation: Pick<InboxConversationItem, "escalatedToHuman" | "handoffs">) {
  return conversation.escalatedToHuman || conversation.handoffs.length > 0;
}

function channelOf(conversation: Pick<InboxConversationItem, "channel">): InboxChannel {
  return normalizeInboxChannel(conversation.channel) ?? "WHATSAPP";
}

/** Lo que conviene preguntarle y cómo arrancar cuando la atiende una persona. */
function personSuggestions(name: string) {
  const first = name.split(/\s+/)[0] || "";
  return {
    ask: ["Para cuándo lo necesita", "Si lo retira o se lo enviamos", "Cómo quiere pagar"],
    replies: [
      `¡Hola${first && first !== "Cliente" ? ` ${first}` : ""}! Soy del equipo, ya te ayudo.`,
      "¿Para cuándo lo necesitás?",
      "¿Lo retirás o te lo enviamos?",
      "¿Querés que te lo reserve?",
    ],
  };
}

export function InboxWorkstation({
  tenantSlug,
  initialConversations,
  channelStates,
  initialActiveId,
  initialChannel,
  insights = {},
}: {
  tenantSlug: string;
  initialConversations: InboxConversationItem[];
  channelStates: InboxChannelState[];
  /** Conversación que se abre primero (cuando venís desde Inicio). */
  initialActiveId?: string;
  /** Canal elegido al entrar (cuando venís desde Inicio › Por canal). */
  initialChannel?: string;
  insights?: Record<string, InboxInsight>;
}) {
  const initialActive = initialConversations.find((conversation) => conversation.id === initialActiveId) ?? initialConversations[0];
  const [conversations, setConversations] = useState(() => sortConversations(initialConversations));
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>(() => normalizeInboxChannel(initialChannel ?? null) ?? "ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [search, setSearch] = useState("");
  const [full, setFull] = useState(false);
  // Sugerencias arriba de donde se escribe: se pueden achicar y queda recordado en este navegador.
  const [sugsOpen, setSugsOpen] = useState(() => {
    try {
      return typeof window === "undefined" || window.localStorage.getItem("lx-sugs") !== "closed";
    } catch {
      return true;
    }
  });
  const toggleSugs = () => {
    setSugsOpen((open) => {
      try {
        window.localStorage.setItem("lx-sugs", open ? "closed" : "open");
      } catch {
        // sin almacenamiento: solo por esta vez
      }
      return !open;
    });
  };
  const [showInfo, setShowInfo] = useState(true);
  const [activeId, setActiveId] = useState(initialActive?.id ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const operatorSentRef = useRef(false);
  const previousThreadRef = useRef({ conversationId: "", messageCount: 0 });
  const refreshSequenceRef = useRef(0);
  const pendingScrollRestoreRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);

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
  const visibleConversations = useMemo(() => {
    const byChannel = selectedChannel === "ALL" ? conversations : filterInboxConversationsByChannel(conversations, selectedChannel);
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? byChannel.filter((conversation) =>
          [conversation.customerName, conversation.customerContact, conversation.summary, conversation.messages.at(-1)?.content]
            .some((value) => value?.toLowerCase().includes(term)))
      : byChannel;
    if (statusFilter === "necesitan") return bySearch.filter(needsPerson);
    if (statusFilter === "ia") return bySearch.filter((conversation) => !needsPerson(conversation));
    return bySearch;
  }, [conversations, selectedChannel, statusFilter, search]);
  const activeConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.id === activeId)
      ?? visibleConversations[0]
      ?? null,
    [activeId, visibleConversations],
  );
  const activeName = activeConversation?.customerName ?? activeConversation?.customerContact ?? "Cliente";
  const activeContact = activeConversation?.customerContact && activeConversation.customerContact !== activeName
    ? activeConversation.customerContact
    : null;
  const pendingHumanCount = conversations.filter(needsPerson).length;
  const activeChannel: InboxChannel = activeConversation ? channelOf(activeConversation) : selectedChannel === "ALL" ? "WHATSAPP" : selectedChannel;
  const emptyLabel = selectedChannel === "ALL" ? "tus canales" : inboxChannelLabels[selectedChannel];
  const suggestions = personSuggestions(activeName);

  useEffect(() => {
    const nextActiveId = visibleConversations.some((conversation) => conversation.id === activeId)
      ? activeId
      : visibleConversations[0]?.id ?? "";
    if (nextActiveId !== activeId) setActiveId(nextActiveId);
  }, [activeId, visibleConversations]);

  useLayoutEffect(() => {
    if (draftRef.current) resizeDraft(draftRef.current);
  }, [draft]);

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

  useLayoutEffect(() => {
    const previous = pendingScrollRestoreRef.current;
    const thread = threadRef.current;
    if (!previous || !thread) return;
    thread.scrollTop = restoreInboxScrollOffset(previous, thread.scrollHeight);
    pendingScrollRestoreRef.current = null;
  }, [activeConversation?.messages.length]);

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
    const requestedConversationId = activeId;
    const requestSequence = ++refreshSequenceRef.current;
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/inbox/${tenantSlug}/conversations/${requestedConversationId}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.conversation) return;
      if (requestSequence !== refreshSequenceRef.current) return;
      const thread = threadRef.current;
      if (thread && !nearBottomRef.current) {
        pendingScrollRestoreRef.current = { scrollTop: thread.scrollTop, scrollHeight: thread.scrollHeight };
      }

      setConversations((current) => sortConversations(current.map((conversation) =>
        conversation.id === requestedConversationId
          ? {
              ...conversation,
              status: payload.conversation.status,
              escalatedToHuman: payload.conversation.escalatedToHuman,
              messageCount: payload.conversation.messageCount,
              lastMessageAt: payload.conversation.lastMessageAt,
              handoffs: payload.conversation.handoffs ?? conversation.handoffs,
              messages: Array.isArray(payload.messages)
                ? reconcileInboxMessages(conversation.messages, payload.messages)
                : conversation.messages,
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

  useEffect(() => {
    const source = new EventSource(`/api/v1/inbox/${tenantSlug}/events`);
    const refreshFromLiveEvent = () => {
      void refreshConversationList(true);
      void refreshConversation(true);
    };
    source.addEventListener("inbox.changed", refreshFromLiveEvent);
    source.onerror = () => {
      // EventSource reconnects automatically; the existing polling remains active
      // while the connection is recovering.
    };
    return () => {
      source.removeEventListener("inbox.changed", refreshFromLiveEvent);
      source.close();
    };
  }, [tenantSlug, activeId]);

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
      const parsed = await parseInboxReplyResponse(response);
      if (!parsed.ok) throw { code: parsed.error.code, providerStatus: parsed.error.httpStatus };
      const payload = parsed.payload;
      if (!response.ok) {
        if (payload.message) {
          setConversations((current) => sortConversations(current.map((conversation) =>
            conversation.id === activeId && !conversation.messages.some((message) => message.id === payload.message.id)
              ? {
                  ...conversation,
                  messageCount: conversation.messageCount + 1,
                  lastMessageAt: payload.message.createdAt,
                  messages: [...conversation.messages, payload.message],
                }
              : conversation,
          )));
        }
        throw {
          code: payload.error ?? "INBOX_REPLY_FAILED",
          providerStatus: payload.providerStatus,
          providerMessage: payload.providerMessage,
          requestId: payload.requestId,
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
        requestId?: string;
      } | null;
      const deliveryError = formatInboxDeliveryError(source ?? {});
      setError(source?.requestId ? `${deliveryError} Referencia: ${source.requestId}` : deliveryError);
    } finally {
      setBusy(false);
    }
  }

  const channelColor: Record<InboxChannel, string> = { WHATSAPP: "#25d366", INSTAGRAM: "linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af)", FACEBOOK: "#1877f2" };
  const channelIcon = (channel: InboxChannel, size: "sm" | "md" = "sm") => (
    <span className={size === "sm" ? "lx-chico sm" : "lx-chico"} style={{ background: channelColor[channel] }} aria-hidden="true">
      <img src={`/icons/channels/${channel.toLowerCase()}.svg`} alt="" />
    </span>
  );

  const activeInsight = activeConversation ? insights[activeConversation.id] : undefined;
  // Opciones arriba de donde se escribe: lo que conviene preguntarle según lo que busca.
  const quickOptions = (() => {
    const fromInsight = (activeInsight?.recommendations ?? []).map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 120);
    const asks = suggestions.ask.map((item) => `¿${item.charAt(0).toLowerCase()}${item.slice(1)}?`);
    const base = activeConversation?.escalatedToHuman ? [...suggestions.replies.slice(0, 1), ...asks] : asks;
    return [...fromInsight.slice(0, 3), ...base].slice(0, 5);
  })();
  const scoreLabel = (score: number) => (score >= 70 ? "Alto" : score >= 40 ? "Medio" : "Bajo");

  return (
    <section className={full ? "lx-inbox-wrap full" : "lx-inbox-wrap"} onKeyDown={(event) => { if (event.key === "Escape" && full) setFull(false); }}>

      <div className={`lx-inbox${activeConversation && showInfo ? "" : " noside"}`}>
        <aside className="lx-ilist" aria-label="Conversaciones">
          <div className="lx-ilh">
            <div className="lx-srch">
              <input className="vpa-inp" placeholder="Buscar" aria-label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="lx-chdots" role="group" aria-label="Canal">
                {inboxChannels.map((channel) => {
                  const active = selectedChannel === channel;
                  const connected = channelStateMap.get(channel)?.status === "CONNECTED";
                  return (
                    <button
                      key={channel}
                      type="button"
                      className={`lx-chd${active ? " on" : selectedChannel === "ALL" ? "" : " off"}`}
                      style={{ background: channelColor[channel] }}
                      aria-pressed={active}
                      title={`${inboxChannelTitles[channel]} · ${channelCounts[channel]} · ${connected ? "Conectado" : "No conectado"}`}
                      onClick={() => { setSelectedChannel(active ? "ALL" : channel); setError(""); setNotice(""); }}
                    >
                      <img src={`/icons/channels/${channel.toLowerCase()}.svg`} alt="" aria-hidden="true" />
                      <span className="sr-only">{inboxChannelLabels[channel]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="lx-stabs" role="tablist" aria-label="Estado">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.id}
                  className={statusFilter === tab.id ? "on" : ""}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                  {tab.id === "necesitan" && pendingHumanCount > 0 ? <em>{pendingHumanCount}</em> : null}
                </button>
              ))}
            </div>
            {selectedChannel !== "ALL" ? (
              <div className="lx-chnote">
                <span>{inboxChannelTitles[selectedChannel]} · {channelCounts[selectedChannel]} conversaciones</span>
                <button type="button" className="vpa-lnk" onClick={() => setSelectedChannel("ALL")}>Ver todos</button>
              </div>
            ) : null}
          </div>
          <div className="lx-icards">
            {visibleConversations.length === 0 ? (
              <div className="lx-iempty">
                <b>{search.trim() ? "Nada con esa búsqueda" : statusFilter === "todas" ? (selectedChannel === "ALL" ? "Todavía no hay conversaciones acá" : "No hay conversaciones de este canal") : "No hay conversaciones con estos filtros"}</b>
                <span>Los mensajes nuevos de {emptyLabel} aparecen acá solos.</span>
                {selectedChannel !== "ALL" ? (
                  <small>
                    {channelStateMap.get(activeChannel)?.lastError
                      ? `Último mensaje recibido con error: ${channelStateMap.get(activeChannel)?.lastError}`
                      : channelStateMap.get(activeChannel)?.lastSyncedAt
                        ? `Último mensaje recibido: ${formatDate(channelStateMap.get(activeChannel)?.lastSyncedAt ?? null)}`
                        : "Todavía no llegó ningún mensaje"}
                  </small>
                ) : null}
              </div>
            ) : null}
            {visibleConversations.map((conversation) => {
              const latestMessage = conversation.messages.at(-1);
              const active = conversation.id === activeId;
              const name = conversation.customerName ?? conversation.customerContact ?? "Cliente";
              const preview = latestMessage
                ? latestMessage.direction === "OUTBOUND"
                  ? `${messageAuthor(latestMessage)}: ${latestMessage.content}`
                  : latestMessage.content
                : conversation.summary ?? "Sin mensajes";
              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setActiveId(conversation.id)}
                  className={active ? "lx-irow on" : "lx-irow"}
                  aria-current={active ? "true" : undefined}
                >
                  {channelIcon(channelOf(conversation))}
                  <span className="vpa-g1">
                    <b>{name}</b>
                    <span>{preview}</span>
                  </span>
                  <span className="lx-irt">
                    <time dateTime={conversation.lastMessageAt ?? undefined}>{formatQueueTime(conversation.lastMessageAt)}</time>
                    {needsPerson(conversation) ? <span className="lx-ndot" aria-label="Te necesita" title="Te necesita" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {activeConversation ? (
          <article className="lx-ichat">
            <header className="lx-ich">
              {channelIcon(activeChannel, "md")}
              <div className="vpa-g1">
                <b>{activeName}</b>
                <span>
                  {inboxChannelLabels[activeChannel]}
                  {activeContact ? ` · ${activeContact}` : ""}
                  {` · ${activeConversation.messageCount} mensaje${activeConversation.messageCount === 1 ? "" : "s"}`}
                </span>
              </div>
              <span className={`vpa-tag ${activeConversation.escalatedToHuman || activeConversation.status === "ESCALATED" ? "y" : "g"}`}>
                <i />
                {activeConversation.escalatedToHuman ? "La atendés vos" : conversationStatusLabel(activeConversation.status)}
              </span>
              <button
                type="button"
                className={activeConversation.escalatedToHuman ? "lx-take back" : "lx-take"}
                onClick={() => void (activeConversation.escalatedToHuman ? reactivateAi() : requestHandoff())}
                disabled={handoffBusy}
                title={activeConversation.escalatedToHuman ? "Reactivar IA" : "Pausar IA"}
              >
                {handoffBusy
                  ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  : activeConversation.escalatedToHuman
                    ? <PlayCircle size={15} aria-hidden="true" />
                    : <PauseCircle size={15} aria-hidden="true" />}
                {activeConversation.escalatedToHuman ? "Devolver a la IA" : "Atender yo"}
              </button>
              {showInfo ? null : (
                <button type="button" className="vpa-ib" onClick={() => setShowInfo(true)} aria-label="Ver datos del cliente" title="Ver datos del cliente">
                  <PanelRightOpen size={16} aria-hidden="true" />
                </button>
              )}
              <button type="button" className="vpa-ib" onClick={() => setFull((value) => !value)} aria-pressed={full} aria-label={full ? "Salir de pantalla completa" : "Ver la bandeja en pantalla completa"} title={full ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}>
                {full ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
              </button>
            </header>

            {activeConversation.handoffs[0] ? (
              <div className="lx-handoff">
                <UserRoundCheck size={16} aria-hidden="true" />
                <span>{activeConversation.handoffs[0].reason}</span>
              </div>
            ) : null}

            <div className="lx-imsgs-wrap">
              <div ref={threadRef} className="lx-imsgs" aria-live="polite" onScroll={handleThreadScroll}>
                {activeConversation.messages.length === 0 ? <p className="lx-day"><span>Sin mensajes todavía</span></p> : null}
                {activeConversation.messages.map((message, index) => {
                  const previous = activeConversation.messages[index - 1];
                  const startsDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
                  const author = messageAuthor(message);
                  const continuesGroup = Boolean(previous) && !startsDay && messageAuthor(previous) === author;
                  const delivery = message.direction === "OUTBOUND" ? resolveInboxMessageDelivery(message.delivery) : null;
                  const kind = message.direction !== "OUTBOUND" ? "in" : author === "IA" ? "out ai" : "out human";
                  return (
                    <Fragment key={message.id}>
                      {startsDay ? <p className="lx-day"><span>{formatDay(message.createdAt)}</span></p> : null}
                      <div className={`lx-msg ${kind}${continuesGroup ? " grouped" : ""}`}>
                        {message.direction === "OUTBOUND" && !continuesGroup ? (
                          <small>
                            {author === "IA" ? <Sparkles size={12} aria-hidden="true" /> : <UserRoundCheck size={12} aria-hidden="true" />}
                            {author === "IA" ? "Respuesta IA" : "Equipo"}
                          </small>
                        ) : null}
                        <p>{message.content}</p>
                        <span className="lx-msg-meta">
                          <time dateTime={message.createdAt} title={formatDate(message.createdAt)}>{formatTime(message.createdAt)}</time>
                          {delivery ? (
                            <span className={`lx-delivery ${delivery.tone}`} title={delivery.detail} aria-label={delivery.label}>
                              {delivery.tone === "sent"
                                ? <CheckCheck size={13} aria-hidden="true" />
                                : delivery.tone === "failed"
                                  ? <CircleAlert size={13} aria-hidden="true" />
                                  : <Clock3 size={13} aria-hidden="true" />}
                              {delivery.tone === "sent" ? null : delivery.label}
                            </span>
                          ) : null}
                        </span>
                        {delivery?.tone === "failed" ? (
                          <small className="lx-delivery-error" role="status">
                            {formatInboxDeliveryError({ code: message.delivery?.error ?? "META_SEND_FAILED" })}
                          </small>
                        ) : null}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
              {showJumpToLatest ? (
                <button type="button" className="lx-jump" onClick={() => scrollToLatest()} aria-label="Ir al último mensaje" title="Ir al último mensaje">
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {quickOptions.length ? (
              <div className={sugsOpen ? "lx-sugs" : "lx-sugs closed"}>
                <button type="button" className="lx-sugs-h" onClick={toggleSugs} aria-expanded={sugsOpen}>
                  <Sparkles size={13} aria-hidden="true" />
                  <span>{activeInsight?.recommendations.length ? "Según lo que busca, podés preguntarle" : "Podés preguntarle"}</span>
                  {sugsOpen ? null : <em>{quickOptions.length}</em>}
                  {sugsOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
                </button>
                {sugsOpen ? (
                  <div className="lx-sugl">
                    {quickOptions.map((option) => (
                      <button key={option} type="button" className="lx-sug" onClick={() => { setDraft(option); draftRef.current?.focus(); }}>
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <form ref={composerRef} onSubmit={sendReply} className="lx-icomp">
              <label htmlFor="inbox-human-reply" className="sr-only">Respuesta humana</label>
              <div className="lx-icomp-row">
                <textarea
                  ref={draftRef}
                  id="inbox-human-reply"
                  className="vpa-inp"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                    event.preventDefault();
                    composerRef.current?.requestSubmit();
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={activeConversation.escalatedToHuman ? "Escribile al cliente…" : "Escribí para atender vos (la IA se pausa)…"}
                  disabled={busy}
                />
                <button type="submit" className="vpa-btn acc" disabled={busy || !draft.trim()}>
                  {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                  Enviar
                </button>
              </div>
              {error ? <p role="alert" className="lx-err">{error}</p> : null}
              {notice ? <p className="lx-ok" aria-live="polite">{notice}</p> : null}
              {!error && !notice ? (
                <small className="lx-hint">
                  {activeConversation.escalatedToHuman ? "La IA está pausada en esta conversación." : "Al responder, la IA se pausa en esta conversación."} Enter envía · Shift + Enter agrega una línea.
                </small>
              ) : null}
            </form>
          </article>
        ) : (
          <article className="lx-ichat lx-ichat-empty" aria-live="polite">
            {channelIcon(activeChannel, "md")}
            <b>Esperando el primer mensaje</b>
            <span>Cuando un cliente te escriba por {emptyLabel}, la conversación se abre acá.</span>
            <button type="button" className="vpa-btn line sm" onClick={() => void refreshConversationList()} disabled={refreshing}>
              {refreshing ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
              Comprobar mensajes
            </button>
          </article>
        )}

        {activeConversation && showInfo ? (
          <aside className="lx-iside" aria-label="Datos del cliente">
            <div className="lx-isech">
              <b>Del cliente</b>
              <button type="button" className="vpa-x" aria-label="Cerrar datos del cliente" onClick={() => setShowInfo(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="lx-isec">
              <h4>Interés en comprar</h4>
              {activeInsight ? (
                <div className="lx-score">
                  <span className="lx-meter"><i style={{ width: `${Math.max(4, Math.min(100, activeInsight.leadScore))}%` }} /></span>
                  <b>{scoreLabel(activeInsight.leadScore)}</b>
                </div>
              ) : (
                <p className="vpa-mut">Todavía se está analizando la charla.</p>
              )}
            </div>
            <div className="lx-isec">
              <h4>Lo que busca</h4>
              <p>{activeInsight?.currentNeed?.trim() || activeConversation.summary?.trim() || "Todavía no hay suficiente charla para resumirlo."}</p>
            </div>
            <div className="lx-isec">
              <h4>Productos que le interesan</h4>
              {activeInsight?.productInterests.length ? (
                <div className="lx-pchips">
                  {activeInsight.productInterests.slice(0, 8).map((product) => <span key={product} className="lx-pchip">{product}</span>)}
                </div>
              ) : (
                <p className="vpa-mut">Todavía no nombró ningún producto.</p>
              )}
            </div>
            {activeInsight?.nextBestAction?.trim() ? (
              <div className="lx-isec">
                <h4>Qué conviene hacer</h4>
                <p>{activeInsight.nextBestAction}</p>
              </div>
            ) : null}
            <div className="lx-isec">
              <h4>Contacto</h4>
              <p>{activeContact ?? activeName}</p>
              <p className="vpa-mut">{inboxChannelLabels[activeChannel]} · {activeConversation.messageCount} mensaje{activeConversation.messageCount === 1 ? "" : "s"}</p>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
