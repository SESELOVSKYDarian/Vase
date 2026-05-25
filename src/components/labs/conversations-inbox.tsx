"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { sendHumanReplyAction, setConversationAiModeAction } from "@/app/(platform)/app/owner/labs/actions";

type ConversationItem = {
  id: string;
  customerName: string | null;
  customerContact: string | null;
  channelType: string;
  status: string;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  aiPaused: boolean;
};

const initialState: LabsActionState = {};

export function ConversationsInbox({ conversations }: { conversations: ConversationItem[] }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [replyState, replyAction] = useActionState(sendHumanReplyAction, initialState);
  const [modeState, modeAction] = useActionState(setConversationAiModeAction, initialState);
  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0],
    [conversations, selectedId],
  );

  if (!selected) {
    return <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm text-[var(--muted)]">Aun no hay conversaciones para mostrar.</div>;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-white p-4">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => setSelectedId(conversation.id)}
            className={[
              "cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors",
              selected.id === conversation.id
                ? "border-[#006d43] bg-[#e9f8f0]"
                : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] hover:bg-[#f4f8f5]",
            ].join(" ")}
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {conversation.customerName ?? conversation.customerContact ?? "Cliente"} · {conversation.channelType}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{conversation.aiPaused ? "IA pausada (humano activo)" : "IA activa"}</p>
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--foreground)]">Chat en vivo</p>
          <form action={modeAction}>
            <input type="hidden" name="conversationId" value={selected.id} />
            <input type="hidden" name="paused" value={selected.aiPaused ? "false" : "true"} />
            <button className="min-h-11 cursor-pointer rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]">
              {selected.aiPaused ? "Reanudar IA" : "Pausar IA y tomar control"}
            </button>
          </form>
        </div>

        <div className="grid max-h-[26rem] gap-3 overflow-y-auto rounded-2xl bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] p-4">
          {selected.transcript.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Sin mensajes en esta conversacion.</p>
          ) : (
            selected.transcript.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={[
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6",
                  item.role === "user"
                    ? "mr-auto bg-white text-[#1f2924]"
                    : item.content.startsWith("[HUMANO]")
                      ? "ml-auto bg-[#1a7f4f] text-white"
                      : "ml-auto bg-[#006d43] text-white",
                ].join(" ")}
              >
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] opacity-80">
                  {item.role === "user" ? "Cliente" : item.content.startsWith("[HUMANO]") ? "Humano" : "IA"}
                </p>
                {item.content.replace(/^\[HUMANO\]\s*/, "")}
              </div>
            ))
          )}
        </div>

        <form action={replyAction} className="mt-4 grid gap-3">
          <input type="hidden" name="conversationId" value={selected.id} />
          <textarea
            name="message"
            required
            rows={3}
            placeholder="Escribe una respuesta humana..."
            className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-sm text-[var(--foreground)]"
          />
          <button className="min-h-11 cursor-pointer rounded-full bg-[#006d43] px-5 text-sm font-semibold text-white">
            Enviar como humano
          </button>
        </form>

        {replyState.success ? <p className="mt-2 text-sm text-[var(--success)]">{replyState.success}</p> : null}
        {replyState.error ? <p className="mt-2 text-sm text-[var(--danger)]">{replyState.error}</p> : null}
        {modeState.success ? <p className="mt-2 text-sm text-[var(--success)]">{modeState.success}</p> : null}
        {modeState.error ? <p className="mt-2 text-sm text-[var(--danger)]">{modeState.error}</p> : null}
      </div>
    </section>
  );
}
