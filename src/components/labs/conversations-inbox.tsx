"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Pause, Play, Send, UserRoundCheck } from "lucide-react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { sendHumanReplyAction, setConversationAiModeAction } from "@/app/(platform)/app/owner/labs/actions";
import { LabsDrawer } from "@/components/labs/labs-overlays";
import { LabsEmptyState, LabsStatusPill } from "@/components/labs/labs-ui";
import type { LabsInboxConversation } from "@/server/services/labs-inbox";

type ConversationItem = LabsInboxConversation;

const initialState: LabsActionState = {};

function getIntentTone(label?: string | null): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (label) {
    case "HOT_LEAD":
      return "success";
    case "HUMAN_REQUESTED":
      return "warning";
    case "LOW_INTENT":
      return "neutral";
    default:
      return "info";
  }
}

export function ConversationsInbox({
  conversations,
  initialConversationId,
}: {
  conversations: ConversationItem[];
  initialConversationId?: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(conversations);
  const [selectedId, setSelectedId] = useState(initialConversationId || conversations[0]?.id || "");
  const [replyState, setReplyState] = useState<LabsActionState>(initialState);
  const [modeState, setModeState] = useState<LabsActionState>(initialState);
  const [isPending, startTransition] = useTransition();
  const replyFormRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => items.find((conversation) => conversation.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const selectedExists = useMemo(
    () => items.some((conversation) => conversation.id === selectedId),
    [items, selectedId],
  );

  const refreshConversations = useCallback(async () => {
    const params = selectedId ? `?conversationId=${encodeURIComponent(selectedId)}` : "";
    const response = await fetch(`/api/labs/inbox${params}`, { cache: "no-store" });

    if (!response.ok) return;

    const payload = (await response.json()) as { conversations?: ConversationItem[] };
    if (Array.isArray(payload.conversations)) {
      setItems(payload.conversations);
    }
  }, [selectedId]);

  useEffect(() => {
    setItems(conversations);
  }, [conversations]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (!selectedExists && items[0]) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedExists]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshConversations();
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [refreshConversations]);

  useEffect(() => {
    if (selectedId) {
      router.replace(`/app/owner/labs/inbox?conversationId=${encodeURIComponent(selectedId)}`);
    }
  }, [router, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [selected?.id, selected?.transcript.length]);

  function updateConversationLocally(conversationId: string, updater: (conversation: ConversationItem) => ConversationItem) {
    setItems((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  }

  function handleHumanReply(formData: FormData) {
    const conversationId = String(formData.get("conversationId") ?? "");
    const message = String(formData.get("message") ?? "").trim();

    if (!conversationId || !message) return;

    setReplyState(initialState);
    updateConversationLocally(conversationId, (conversation) => ({
      ...conversation,
      aiPaused: true,
      escalatedToHuman: true,
      transcript: [...conversation.transcript, { role: "assistant" as const, content: `[HUMANO] ${message}` }].slice(-20),
    }));
    replyFormRef.current?.reset();

    startTransition(async () => {
      const result = await sendHumanReplyAction(initialState, formData);
      setReplyState(result);
      await refreshConversations();
    });
  }

  function handleAiMode(formData: FormData) {
    const conversationId = String(formData.get("conversationId") ?? "");
    const paused = String(formData.get("paused") ?? "") === "true";

    if (!conversationId) return;

    setModeState(initialState);
    updateConversationLocally(conversationId, (conversation) => ({ ...conversation, aiPaused: paused }));

    startTransition(async () => {
      const result = await setConversationAiModeAction(initialState, formData);
      setModeState(result);
      await refreshConversations();
    });
  }

  if (!selected) {
    return <LabsEmptyState title="Aun no hay conversaciones" description="Cuando entren mensajes desde tus canales se van a listar aca." />;
  }

  return (
    <section className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] lg:grid-cols-[22rem_1fr]">
      <aside className="border-b border-[var(--border-subtle)] bg-[var(--surface)] lg:border-b-0 lg:border-r">
        <div className="border-b border-[var(--border-subtle)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">Conversaciones</p>
          <p className="text-xs text-[var(--muted)]">{items.length} chats recientes</p>
        </div>
        <div className="labs-scrollbar max-h-[28rem] overflow-y-auto lg:max-h-[calc(100vh-15rem)]">
          {items.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={[
                "grid w-full cursor-pointer gap-2 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors",
                selected.id === conversation.id ? "bg-[var(--surface-strong)]" : "hover:bg-[var(--surface-strong)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {conversation.customerName ?? conversation.customerContact ?? "Cliente"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{conversation.channelType}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--muted)]">{conversation.intentScore ?? 0}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <LabsStatusPill label={conversation.intentLabel ?? "Sin etiqueta"} tone={getIntentTone(conversation.intentLabel)} />
                <LabsStatusPill label={conversation.aiPaused ? "Humano" : conversation.escalatedToHuman ? "Derivada" : "IA activa"} tone={conversation.aiPaused || conversation.escalatedToHuman ? "warning" : "success"} />
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-[var(--muted)]">{conversation.summary ?? "Sin resumen disponible"}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="grid min-h-0 grid-rows-[auto_1fr_auto]">
        <header className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                {selected.customerName ?? selected.customerContact ?? "Cliente sin nombre"}
              </h2>
              <LabsStatusPill label={selected.intentLabel ?? "Sin etiqueta"} tone={getIntentTone(selected.intentLabel)} />
              <LabsStatusPill label={selected.aiPaused ? "IA pausada" : "IA activa"} tone={selected.aiPaused ? "warning" : "success"} />
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {selected.channelType} · {selected.customerContact ?? "Sin contacto"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LabsDrawer
              title="Reporte IA"
              description="Resumen operativo y siguiente accion sugerida."
              trigger={<span className="labs-button labs-button-secondary">Ver reporte</span>}
            >
              <div className="space-y-4">
                <div className="labs-subpanel p-4">
                  <p className="vase-kicker">Resumen</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{selected.summary ?? "Sin resumen disponible."}</p>
                </div>
                <div className="grid gap-3">
                  <div className="labs-subpanel p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Motivo</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selected.intentReason ?? "Sin motivo disponible."}</p>
                  </div>
                  <div className="labs-subpanel p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Siguiente paso</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selected.nextAction ?? "Sin siguiente paso sugerido."}</p>
                  </div>
                </div>
              </div>
            </LabsDrawer>
            <form action={handleAiMode}>
              <input type="hidden" name="conversationId" value={selected.id} />
              <input type="hidden" name="paused" value={selected.aiPaused ? "false" : "true"} />
              <button disabled={isPending} className="labs-button labs-button-secondary disabled:opacity-60">
                {selected.aiPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                {selected.aiPaused ? "Volver a IA" : "Tomar control"}
              </button>
            </form>
          </div>
        </header>

        <div className="labs-scrollbar min-h-0 overflow-y-auto bg-[var(--surface)] p-4">
          <div className="mx-auto grid max-w-4xl gap-3">
            {selected.transcript.length === 0 ? (
              <LabsEmptyState title="Sin mensajes" description="Esta conversacion todavia no tiene transcript guardado." />
            ) : (
              selected.transcript.map((item, index) => {
                const isHuman = item.content.startsWith("[HUMANO]");
                const isUser = item.role === "user";

                return (
                  <div
                    key={`${item.role}-${index}`}
                    className={[
                      "max-w-[86%] rounded-xl px-4 py-3 text-sm leading-6 shadow-sm",
                      isUser
                        ? "mr-auto border border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--foreground)]"
                        : isHuman
                          ? "ml-auto bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
                          : "ml-auto bg-[var(--foreground)] text-[var(--background)]",
                    ].join(" ")}
                  >
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                      {isUser ? <UserRoundCheck className="size-3" /> : <Bot className="size-3" />}
                      {isUser ? "Cliente" : isHuman ? "Humano" : "IA"}
                    </p>
                    {item.content.replace(/^\[HUMANO\]\s*/, "")}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
          <form ref={replyFormRef} action={handleHumanReply} className="mx-auto grid max-w-4xl gap-3 md:grid-cols-[1fr_auto]">
            <input type="hidden" name="conversationId" value={selected.id} />
            <textarea
              name="message"
              required
              rows={2}
              placeholder="Responder como humano..."
              className="labs-textarea min-h-20 resize-none"
            />
            <button disabled={isPending} className="labs-button labs-button-primary self-end disabled:opacity-60">
              <Send className="size-4" />
              {isPending ? "Enviando" : "Enviar"}
            </button>
          </form>
          <div className="mx-auto mt-2 max-w-4xl">
            {replyState.success ? <p className="text-sm text-[var(--success)]">{replyState.success}</p> : null}
            {replyState.error ? <p className="text-sm text-[var(--danger)]">{replyState.error}</p> : null}
            {modeState.success ? <p className="text-sm text-[var(--success)]">{modeState.success}</p> : null}
            {modeState.error ? <p className="text-sm text-[var(--danger)]">{modeState.error}</p> : null}
          </div>
        </footer>
      </div>
    </section>
  );
}
