"use client";

import { Bot, Loader2, Send } from "lucide-react";
import { type FormEvent, useState } from "react";

export function AssistantTestPanel({ configured, hasKnowledge }: { configured: boolean; hasKnowledge: boolean }) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || busy || !configured) return;
    setBusy(true);
    setReply("");
    setImageUrls([]);
    setMeta("");
    setError("");

    try {
      const response = await fetch("/api/labs/assistant/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "ASSISTANT_TEST_FAILED");
      setReply(payload.reply);
      setImageUrls(Array.isArray(payload.imageUrls) ? payload.imageUrls : []);
      setMeta(`${payload.model} · ${Number(payload.usage?.inputTokens ?? 0) + Number(payload.usage?.outputTokens ?? 0)} tokens`);
    } catch (reason) {
      setImageUrls([]);
      const code = reason instanceof Error ? reason.message : "";
      setError(code === "OPENAI_API_KEY_MISSING"
        ? "Agregá una OpenAI API Key antes de probar el chatbot."
        : "No pudimos generar la respuesta. Revisá la key y el modelo seleccionado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="labs-panel labs-assistant-test" aria-label="Asistente">
      <div className="labs-assistant-test-thread" aria-live="polite">
        {!reply && !busy ? (
          <div className="labs-assistant-test-placeholder">
            <Bot aria-hidden="true" />
            <strong>{hasKnowledge ? "Tu conocimiento está listo" : "Todavía no hay fuentes listas"}</strong>
          </div>
        ) : null}
        {busy ? <div className="labs-assistant-test-loading"><Loader2 className="animate-spin" aria-hidden="true" /> Generando respuesta...</div> : null}
        {reply ? (
          <div className="labs-assistant-message">
            <Bot aria-hidden="true" />
            <div>
              <p>{reply}</p>
              {imageUrls.length ? (
                <div className="labs-assistant-message-images">
                  {imageUrls.map((url, index) => (
                    // eslint-disable-next-line @next/next/no-img-element -- Catalog URLs are tenant-scoped and already validated by the API.
                    <img key={url} src={url} alt={`Imagen de producto ${index + 1}`} />
                  ))}
                </div>
              ) : null}
              <small>{meta}</small>
            </div>
          </div>
        ) : null}
        {error ? <p className="labs-assistant-test-error" role="alert">{error}</p> : null}
      </div>

      <form onSubmit={submit}>
        <div>
          <textarea
            id="assistant-test-message"
            aria-label="Consulta para el asistente"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows={3}
            disabled={!configured || busy}
          />
          <button type="submit" disabled={!configured || busy || !message.trim()} aria-label="Enviar consulta">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          </button>
        </div>
      </form>
    </section>
  );
}
