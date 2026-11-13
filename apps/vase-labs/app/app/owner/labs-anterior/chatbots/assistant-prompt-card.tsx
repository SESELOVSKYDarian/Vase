"use client";

import { CheckCircle2, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function AssistantPromptCard({ initialPrompt }: { initialPrompt: string | null }) {
  const router = useRouter();
  const [systemPrompt, setSystemPrompt] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function savePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || systemPrompt.length > 4000) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/labs/assistant/prompt", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "ASSISTANT_PROMPT_UPDATE_FAILED");
      setMessage("Prompt actualizado.");
      router.refresh();
    } catch {
      setMessage("No pudimos guardar el prompt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="labs-panel labs-assistant-prompt p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="vase-kicker">Comportamiento</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Prompt del asistente</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Define el tono, reglas y alcance que ChatGPT va a seguir al responder WhatsApp y los demas canales.
          </p>
        </div>
        <span className={`labs-openai-key-state ${systemPrompt.trim() ? "is-ready" : ""}`}>
          <CheckCircle2 aria-hidden="true" />
          {systemPrompt.trim() ? "Personalizado" : "Base"}
        </span>
      </div>

      <form onSubmit={savePrompt} className="labs-assistant-prompt-form">
        <label htmlFor="assistant-system-prompt">Instrucciones</label>
        <textarea
          id="assistant-system-prompt"
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          maxLength={4000}
          rows={7}
          placeholder="Ej.: Sos el asistente de Sanitarios El Teflon. Responde breve, pedi medidas cuando falten datos y deriva a un humano si el cliente pide descuentos especiales."
        />
        <div>
          <span>{systemPrompt.length}/4000</span>
          <button type="submit" disabled={busy || systemPrompt.length > 4000} className="labs-button labs-button-primary">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            Guardar prompt
          </button>
        </div>
      </form>
      {message ? <p className="labs-openai-key-feedback" aria-live="polite">{message}</p> : null}
    </section>
  );
}
