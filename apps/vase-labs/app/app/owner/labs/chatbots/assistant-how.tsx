"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

// Asistente › Cómo habla: tono, reglas del negocio y una prueba en vivo (no se manda a nadie).
// El tono se guarda como primera línea de las instrucciones ("Tono: cercano, breve."), así no hace
// falta tocar la base: el asistente ya lee las instrucciones completas.

const TONES = [
  { id: "cercano", label: "Cercano", hint: "Habla de vos, simpático", line: "cercano (habla de vos)" },
  { id: "formal", label: "Formal", hint: "Habla de usted", line: "formal (habla de usted)" },
  { id: "breve", label: "Breve", hint: "Respuestas cortas", line: "breve" },
  { id: "detallado", label: "Detallado", hint: "Explica más", line: "detallado" },
] as const;
type ToneId = (typeof TONES)[number]["id"];
const OPPOSITE: Record<ToneId, ToneId> = { cercano: "formal", formal: "cercano", breve: "detallado", detallado: "breve" };
const TONE_PREFIX = "Tono: ";

function splitPrompt(prompt: string): { tones: ToneId[]; rules: string } {
  const [first, ...rest] = prompt.split("\n");
  if (!first?.startsWith(TONE_PREFIX)) return { tones: [], rules: prompt };
  const text = first.slice(TONE_PREFIX.length).toLowerCase();
  const tones = TONES.filter((tone) => text.includes(tone.id)).map((tone) => tone.id);
  return { tones, rules: rest.join("\n").replace(/^\n+/, "") };
}

function joinPrompt(tones: ToneId[], rules: string) {
  const line = tones.length ? `${TONE_PREFIX}${TONES.filter((tone) => tones.includes(tone.id)).map((tone) => tone.line).join(", ")}.` : "";
  return [line, rules.trim()].filter(Boolean).join("\n\n");
}

type Bubble = { from: "cliente" | "asistente"; text: string };

export function AssistantHow({ initialPrompt, assistantName }: { initialPrompt: string | null; assistantName: string }) {
  const router = useRouter();
  const initial = splitPrompt(initialPrompt ?? "");
  const [tones, setTones] = useState<ToneId[]>(initial.tones);
  const [rules, setRules] = useState(initial.rules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null);
  const [chat, setChat] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const prompt = joinPrompt(tones, rules);
  const changed = prompt !== (initialPrompt ?? "").trim();

  const pickTone = (id: ToneId) => {
    setTones((current) => (current.includes(id) ? current.filter((tone) => tone !== id) : [...current.filter((tone) => tone !== OPPOSITE[id]), id]));
    setSaved(null);
  };

  async function save() {
    if (saving || prompt.length > 4000) return;
    setSaving(true);
    setSaved(null);
    try {
      const response = await fetch("/api/labs/assistant/prompt", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompt }),
      });
      if (!response.ok) throw new Error("save");
      setSaved({ ok: true, text: "Guardado. Desde ahora responde así." });
      router.refresh();
    } catch {
      setSaved({ ok: false, text: "No pudimos guardarlo. Probá de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  async function test(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || asking) return;
    setDraft("");
    setChat((current) => [...current, { from: "cliente", text: message }]);
    setAsking(true);
    try {
      const response = await fetch("/api/labs/assistant/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      const text = response.ok && payload.reply
        ? payload.reply
        : payload.error === "OPENAI_API_KEY_MISSING"
          ? "Falta la clave de OpenAI: cargala en Ajustes › Labs para que pueda responder."
          : "No pude responder ahora. Probá de nuevo en un rato.";
      setChat((current) => [...current, { from: "asistente", text }]);
    } finally {
      setAsking(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  }

  return (
    <div className="lx-g2">
      <section className="vpa-card">
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3>Cómo habla</h3>
            <p>Elegí el tono y escribí las reglas de tu negocio.</p>
          </div>
        </div>
        <div className="lx-tones" role="group" aria-label="Tono">
          {TONES.map((tone) => (
            <button key={tone.id} type="button" className={tones.includes(tone.id) ? "lx-tone on" : "lx-tone"} aria-pressed={tones.includes(tone.id)} onClick={() => pickTone(tone.id)}>
              <b>{tone.label}</b>
              <span>{tone.hint}</span>
            </button>
          ))}
        </div>
        <label className="vpa-fld" style={{ marginTop: 16 }}>
          <span>Reglas para tu asistente</span>
          <textarea
            className="vpa-inp"
            rows={7}
            maxLength={3800}
            value={rules}
            onChange={(event) => { setRules(event.target.value); setSaved(null); }}
            placeholder="Ej.: Si preguntan por precios mayoristas, pedí el CUIT y pasá con una persona. Ofrecé siempre retiro en sucursal antes que envío. No prometas fechas de entrega."
            style={{ height: "auto", padding: "10px 12px", lineHeight: 1.5, resize: "vertical" }}
          />
        </label>
        <div className="lx-fromnote">
          <span>Horarios, contacto y sucursales los toma solo de <b>Ajustes › Mi negocio</b>. No hace falta escribirlos acá.</span>
          <Link href="/owner/settings?tab=negocio" className="vpa-lnk">Ver</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" className="vpa-btn acc" disabled={saving || !changed || prompt.length > 4000} onClick={() => void save()}>
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            {saving ? "Guardando…" : "Guardar"}
          </button>
          {saved ? <span role="status" className="vpa-mut" style={{ fontSize: 12.5, color: saved.ok ? undefined : "var(--red)" }}>{saved.text}</span> : null}
          {!saved && changed ? <span className="vpa-mut" style={{ fontSize: 12.5 }}>Tenés cambios sin guardar. La prueba usa lo último guardado.</span> : null}
        </div>
      </section>

      <section className="vpa-card lx-try">
        <div className="lx-tryh">
          <span className="lx-aav" aria-hidden="true">{assistantName.trim().charAt(0).toUpperCase() || "A"}</span>
          <div className="vpa-g1">
            <b>Probalo</b>
            <span>Así respondería. No se manda a nadie.</span>
          </div>
        </div>
        <div className="lx-tryb" ref={listRef} aria-live="polite">
          {chat.length === 0 ? <p className="vpa-mut" style={{ margin: "auto", textAlign: "center", fontSize: 12.5 }}>Escribí como si fueras un cliente.</p> : null}
          {chat.map((bubble, index) => (
            <div key={index} className={bubble.from === "cliente" ? "lx-b2 u" : "lx-b2 a"}>{bubble.text}</div>
          ))}
          {asking ? <div className="lx-b2 a"><Loader2 size={14} className="animate-spin" aria-label="Escribiendo" /></div> : null}
        </div>
        <form className="lx-tryc" onSubmit={test}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribí como si fueras un cliente" aria-label="Mensaje de prueba" maxLength={2000} />
          <button type="submit" aria-label="Enviar" disabled={asking || !draft.trim()}>
            <Send size={14} aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}
