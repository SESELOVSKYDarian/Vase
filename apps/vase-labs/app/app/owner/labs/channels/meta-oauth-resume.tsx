"use client";
import type { MetaAssetCandidate } from "@vase/contracts";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function MetaOAuthResume({ attemptId }: { attemptId?: string }) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<MetaAssetCandidate[]>([]), [selected, setSelected] = useState(""), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(Boolean(attemptId));
  useEffect(() => { if (!attemptId) return; fetch(`/api/v1/meta/connections/${encodeURIComponent(attemptId)}`).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(); setCandidates(payload.candidates ?? []); }).catch(() => setError("No pudimos recuperar las cuentas disponibles." )).finally(() => setBusy(false)); }, [attemptId]);
  if (!attemptId) return null;
  async function complete() { setBusy(true); setError(null); try { const response = await fetch(`/api/v1/meta/connections/${encodeURIComponent(attemptId!)}/complete`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({candidateId:selected}) }); if (!response.ok) throw new Error(); router.replace("/owner/channels"); router.refresh(); } catch { setError("Meta no pudo validar o suscribir el activo seleccionado."); } finally { setBusy(false); } }
  return <div className="labs-modal-backdrop"><section className="labs-connect-modal" role="dialog" aria-modal="true" aria-labelledby="meta-assets-title"><header><div><span className="labs-modal-kicker">Último paso</span><h2 id="meta-assets-title">Elegí la cuenta de Meta</h2><p>Seleccioná la página, cuenta profesional o número que usará el chatbot.</p></div><button className="labs-icon-button" onClick={() => router.replace("/owner/channels")} aria-label="Cerrar"><X className="size-4" /></button></header><div className="labs-channel-picker">{busy && !candidates.length ? <p>Cargando activos…</p> : candidates.map((candidate) => <button key={candidate.id} type="button" className={selected===candidate.id?"is-selected":""} onClick={() => setSelected(candidate.id)}><span className="labs-picker-mark">{selected===candidate.id?<Check className="size-4" />:candidate.kind.slice(0,2)}</span><span><strong>{candidate.name}</strong><small>{candidate.handle ?? candidate.id}</small></span></button>)}</div>{error?<p className="labs-form-error" role="alert">{error}</p>:null}<footer><span/><button className="labs-button labs-button-primary" disabled={!selected||busy} onClick={() => void complete()}>{busy?"Validando…":"Conectar activo"}</button></footer></section></div>;
}
