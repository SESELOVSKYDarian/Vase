"use client";

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OpenAiKeyCardProps = {
  configured: boolean;
};

export function OpenAiKeyCard({ configured }: OpenAiKeyCardProps) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(configured);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveKey() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/labs/assistant/openai-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "ASSISTANT_OPENAI_KEY_SAVE_FAILED");
      }

      setApiKey("");
      setIsConfigured(true);
      setMessage("Key guardada. El chatbot ya puede responder con OpenAI.");
      router.refresh();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(code === "TOKEN_ENCRYPTION_SECRET_MISSING"
        ? "Falta TOKEN_ENCRYPTION_SECRET en Labs para guardar la key cifrada."
        : "No pudimos guardar la key. Revisá que empiece con sk-.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="labs-panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="vase-kicker">Credencial IA</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">OpenAI API Key</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Guardá la key de OpenAI para este chatbot. Labs la cifra y la usa cuando llega un mensaje por los canales conectados.
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${isConfigured ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>
          {isConfigured ? <CheckCircle2 className="size-4" /> : <KeyRound className="size-4" />}
          {isConfigured ? "Configurada" : "Pendiente"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          autoComplete="off"
          placeholder={isConfigured ? "Pegá una nueva key para rotarla" : "sk-..."}
          className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        />
        <button
          type="button"
          onClick={() => void saveKey()}
          disabled={busy || apiKey.trim().length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-strong)_88%,black)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Guardar key
        </button>
      </div>

      {message ? <p className="mt-4 text-xs font-bold text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
