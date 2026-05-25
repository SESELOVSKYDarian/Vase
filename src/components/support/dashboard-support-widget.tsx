"use client";

import { useEffect, useMemo, useState } from "react";
import { BotMessageSquare, MessageSquarePlus, Send, UserRound, X } from "lucide-react";
import { useSupportChat } from "@/components/support/support-chat-context";

type IncidentNotice = {
  id: string;
  title: string;
  message: string;
};

type ConversationItem = {
  id: string;
  title: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

export function DashboardSupportWidget() {
  const { isOpen, openSupportChat, closeSupportChat } = useSupportChat();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentNotice | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  async function loadConversations() {
    const response = await fetch("/api/support/widget-conversations");
    const payload = await response.json();
    const items = (payload.items ?? []) as ConversationItem[];
    setConversations(items);
    if (!activeConversationId && items.length > 0) {
      setActiveConversationId(items[0].id);
    } else if (items.length === 0) {
      await createConversation();
    }
  }

  async function loadMessages(conversationId: string) {
    const response = await fetch(`/api/support/widget-messages?conversationId=${encodeURIComponent(conversationId)}`);
    const payload = await response.json();
    setMessages((payload.items ?? []) as ChatMessage[]);
  }

  async function createConversation() {
    const response = await fetch("/api/support/widget-conversations", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) return;
    const item = payload.item as ConversationItem;
    setConversations((current) => [item, ...current]);
    setActiveConversationId(item.id);
    setMessages([]);
  }

  useEffect(() => {
    if (!isOpen) return;

    void fetch("/api/support/widget-context")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload) return;
        setIncident(payload.incidentNotices?.[0] ?? null);
      })
      .catch(() => {});

    void loadConversations().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeConversationId) return;
    void loadMessages(activeConversationId).catch(() => {});
  }, [isOpen, activeConversationId]);

  async function submit() {
    if (!draft.trim() || !activeConversationId || loading) return;
    const outbound = draft.trim();
    setDraft("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/support/widget-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: outbound, conversationId: activeConversationId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "No pudimos responder ahora.");
        return;
      }
      await loadMessages(activeConversationId);
      await loadConversations();
    } catch {
      setError("No pudimos responder ahora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSupportChat}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-strong)] text-[var(--accent-contrast)] shadow-[0_20px_40px_rgba(0,109,67,0.22)] transition hover:scale-[1.02] hover:opacity-95"
        aria-label="Abrir Vase AI"
      >
        <BotMessageSquare className="size-6" />
      </button>

      {isOpen ? (
        <section className="fixed bottom-6 right-24 z-40 flex h-[78vh] w-[min(96vw,980px)] overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--background)] shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
          <aside className="hidden w-72 border-r border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 md:block">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">Conversaciones</p>
              <button
                type="button"
                onClick={() => void createConversation()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--background)]"
                aria-label="Nuevo chat"
              >
                <MessageSquarePlus className="size-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto">
              {conversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveConversationId(item.id)}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left transition",
                    item.id === activeConversationId
                      ? "border-[var(--accent)] bg-[var(--background)]"
                      : "border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--background)]",
                  ].join(" ")}
                >
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                  <p className="text-[11px] text-[var(--muted)]">{new Date(item.updatedAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <BotMessageSquare className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">Vase AI</p>
                  <p className="truncate text-xs text-[var(--muted)]">{activeConversation?.title ?? "Asistente del panel"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void createConversation()}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)] md:hidden"
                >
                  Nuevo chat
                </button>
                <button
                  type="button"
                  onClick={closeSupportChat}
                  aria-label="Cerrar chat"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {incident ? (
                <div className="mb-4 rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3 text-xs leading-6 text-[var(--muted)]">
                  <strong className="text-[var(--foreground)]">{incident.title}:</strong> {incident.message}
                </div>
              ) : null}

              {messages.length === 0 ? (
                <div className="mb-3 flex items-start gap-2">
                  <div className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <BotMessageSquare className="size-4" />
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)]">
                    Hola, soy Vase AI. Respondo usando FAQs, wikis e incidentes de Vase.
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {messages.map((item) => (
                  <div key={item.id} className={`flex items-start gap-2 ${item.role === "USER" ? "justify-end" : ""}`}>
                    {item.role === "ASSISTANT" ? (
                      <div className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                        <BotMessageSquare className="size-4" />
                      </div>
                    ) : null}
                    <div
                      className={[
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                        item.role === "USER"
                          ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
                          : "bg-[var(--surface-strong)] text-[var(--foreground)]",
                      ].join(" ")}
                    >
                      {item.content}
                    </div>
                    {item.role === "USER" ? (
                      <div className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-strong)] text-[var(--muted)]">
                        <UserRound className="size-4" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {loading ? <p className="mt-3 text-sm text-[var(--muted)]">Vase AI esta escribiendo...</p> : null}
              {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
            </div>

            <footer className="border-t border-[var(--border-subtle)] p-3">
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder='Escribe tu mensaje...'
                  className="min-h-11 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
                <button
                  type="button"
                  onClick={() => void submit()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-strong)] text-[var(--accent-contrast)] disabled:opacity-60"
                  disabled={!draft.trim() || loading || !activeConversationId}
                  aria-label="Enviar mensaje"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </footer>
          </div>
        </section>
      ) : null}
    </>
  );
}
