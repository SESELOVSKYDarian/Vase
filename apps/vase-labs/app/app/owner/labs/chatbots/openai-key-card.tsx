"use client";

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpenAiKeyCard({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(configured);
  const [showKey, setShowKey] = useState(false);
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
      if (!response.ok) throw new Error(payload.error ?? "ASSISTANT_OPENAI_KEY_SAVE_FAILED");
      setApiKey("");
      setShowKey(false);
      setIsConfigured(true);
      setMessage(`Key validada y guardada para ${payload.model}.`);
      router.refresh();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const messages: Record<string, string> = {
        TOKEN_ENCRYPTION_SECRET_MISSING: "Labs no tiene disponible el cifrado interno. Revisá el despliegue.",
        OPENAI_CREDENTIAL_REJECTED: "OpenAI rechazó la key. Revisá que esté activa y pertenezca al proyecto correcto.",
        OPENAI_MODEL_UNAVAILABLE: "La key no tiene acceso al modelo seleccionado.",
        OPENAI_VALIDATION_UNAVAILABLE: "OpenAI no respondió a la validación. Intentá nuevamente.",
      };
      setMessage(messages[code] ?? "No pudimos guardar la key. Revisá que empiece con sk-.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="labs-panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="vase-kicker">Acceso seguro</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">OpenAI API Key</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            La key pertenece a este chatbot. Vase la valida, la cifra y nunca vuelve a mostrarla.
          </p>
        </div>
        <span className={`labs-openai-key-state ${isConfigured ? "is-ready" : ""}`}>
          {isConfigured ? <CheckCircle2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          {isConfigured ? "Configurada" : "Pendiente"}
        </span>
      </div>

      <label className="labs-openai-key-label" htmlFor="openai-api-key">OpenAI API Key</label>
      <div className="labs-openai-key-row">
        <div className="labs-openai-key-input">
          <input
            id="openai-api-key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type={showKey ? "text" : "password"}
            autoComplete="new-password"
            spellCheck={false}
            placeholder={isConfigured ? "Pegá una nueva key para reemplazarla" : "sk-proj-..."}
          />
          <button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "Ocultar key" : "Mostrar key"}>
            {showKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        <button type="button" onClick={() => void saveKey()} disabled={busy || apiKey.trim().length === 0} className="labs-button labs-button-primary">
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          Validar y guardar
        </button>
      </div>
      {message ? <p className="labs-openai-key-feedback" aria-live="polite">{message}</p> : null}
    </section>
  );
}
