"use client";

import { ArrowLeft, Check, Copy, FileText, HelpCircle, Link2, Plus, Store, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { KnowledgeSourceType } from "../../../../lib/knowledge-source";

const choices: { type: KnowledgeSourceType; label: string; icon: typeof FileText }[] = [
  { type: "FILE", label: "Documento o archivo", icon: FileText },
  { type: "URL", label: "URL", icon: Link2 },
  { type: "FAQ", label: "FAQ manual", icon: HelpCircle },
  { type: "VASE_MANAGEMENT", label: "Vase Management", icon: Store },
  { type: "EXTERNAL_MANAGEMENT", label: "Sistema de gestión externo", icon: Store },
];
type Credentials = { domain: string; tenantUuid: string; consumerKey: string };
const externalManagementDomain = "business.vase.ar";

export function KnowledgeAddModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false), [step, setStep] = useState(1), [type, setType] = useState<KnowledgeSourceType>();
  const [title, setTitle] = useState(""), [fileName, setFileName] = useState(""), [url, setUrl] = useState("");
  const [question, setQuestion] = useState(""), [answer, setAnswer] = useState("");
  const [credentials, setCredentials] = useState<Credentials>(), [error, setError] = useState(""), [busy, setBusy] = useState(false), [copyMessage, setCopyMessage] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  function close() { setOpen(false); setStep(1); setType(undefined); setTitle(""); setFileName(""); setUrl(""); setQuestion(""); setAnswer(""); setCredentials(undefined); setError(""); setBusy(false); setCopyMessage(""); requestAnimationFrame(() => openButton.current?.focus()); }
  useEffect(() => { if (!open) return; closeButton.current?.focus(); const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape); }, [open]);

  async function select(nextType: KnowledgeSourceType) {
    setType(nextType); setStep(2); setError("");
    if (nextType !== "EXTERNAL_MANAGEMENT" || credentials) return;
    setBusy(true);
    try { const response = await fetch("/api/labs/external-management-credentials"); const payload = await response.json(); if (!response.ok) throw new Error(); setCredentials(payload); }
    catch { setError("No pudimos obtener las credenciales. Intentá nuevamente."); }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!type || busy) return; setBusy(true); setError("");
    try {
      if (type === "VASE_MANAGEMENT") {
        const provider = await fetch("/api/labs/integration-provider", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "VASE_MANAGEMENT" }) });
        if (!provider.ok) throw new Error("provider");
      }
      const body = type === "FILE" ? { type, title: title || fileName, fileName } : type === "URL" ? { type, title, url } : type === "FAQ" ? { type, title, question, answer } : { type, title: type === "VASE_MANAGEMENT" ? "Vase Management" : "Sistema de gestión externo" };
      const response = await fetch("/api/labs/knowledge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("knowledge");
      router.refresh(); close();
    } catch (cause) { setError(cause instanceof Error && cause.message === "provider" ? "No pudimos conectar Vase Management. No se guardó ninguna fuente." : "No pudimos guardar la fuente. Revisá los datos e intentá nuevamente."); }
    finally { setBusy(false); }
  }

  async function copy(value: string, label: string) { try { await navigator.clipboard.writeText(value); setCopyMessage(`${label} copiado`); } catch { setCopyMessage(`No pudimos copiar ${label}`); } }

  function trapFocus(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])');
    if (!controls?.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <>
    <button ref={openButton} className="labs-button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" onClick={() => setOpen(true)}><Plus size={16} />Agregar conocimiento</button>
    {open && <div className="labs-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialog} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="knowledge-dialog-title" className="labs-knowledge-modal">
        <header className="labs-modal-header"><div><p className="labs-modal-kicker">Paso {step} de 2</p><h2 id="knowledge-dialog-title">{step === 1 ? "Elegí una fuente" : choices.find((choice) => choice.type === type)?.label}</h2></div><button ref={closeButton} className="labs-icon-button" aria-label="Cerrar" onClick={close}><X size={19} /></button></header>
        {step === 1 ? <div className="labs-source-grid">{choices.map(({ type: choiceType, label, icon: Icon }) => <button key={choiceType} className="labs-source-choice" onClick={() => void select(choiceType)}><Icon size={20} /><span>{label}</span></button>)}</div> :
          <form onSubmit={submit} className="labs-knowledge-form">
            {type === "FILE" && <><label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opcional; usaremos el nombre del archivo" /></label><label>Archivo<input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} /></label><p className="labs-form-note">Al guardar, el archivo quedará en cola para procesamiento.</p></>}
            {type === "URL" && <><label>Título<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>URL<input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></label></>}
            {type === "FAQ" && <><label>Título<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Pregunta<input required value={question} onChange={(e) => setQuestion(e.target.value)} /></label><label>Respuesta<textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} /></label></>}
            {type === "VASE_MANAGEMENT" && <p className="labs-form-note">Conectaremos Vase Management sin solicitar credenciales. La fuente quedará en cola mientras sincronizamos la información.</p>}
            {type === "EXTERNAL_MANAGEMENT" && <div className="labs-credentials">{busy && !credentials ? <p>Cargando credenciales…</p> : credentials ? <>{[["Dominio", externalManagementDomain], ["Tenant UUID", credentials.tenantUuid], ["Consumer Key", credentials.consumerKey]].map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code><button type="button" aria-label={`Copiar ${label}`} onClick={() => void copy(value, label)}><Copy size={15} /></button></div>)}</> : <button type="button" onClick={() => void select("EXTERNAL_MANAGEMENT")}>Reintentar</button>}</div>}
            {error && <p className="labs-modal-error" role="alert">{error}</p>}<p className="sr-only" aria-live="polite">{copyMessage}</p>
            <footer className="labs-modal-actions"><button type="button" className="labs-button-secondary" onClick={() => setStep(1)} disabled={busy}><ArrowLeft size={16} />Volver</button><button className="labs-button-primary" disabled={busy || (type === "EXTERNAL_MANAGEMENT" && !credentials)}>{busy ? "Guardando…" : <><Check size={16} />Agregar fuente</>}</button></footer>
          </form>}
      </div>
    </div>}
  </>;
}
