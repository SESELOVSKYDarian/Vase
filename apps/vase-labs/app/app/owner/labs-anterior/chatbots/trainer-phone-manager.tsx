"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrainerPhoneManager({ phones }: { phones: Array<{ id: string; label: string; phone: string; active: boolean }> }) {
  const router = useRouter(); const [label, setLabel] = useState(""); const [phone, setPhone] = useState(""); const [busy, setBusy] = useState(false);
  async function add(event: React.FormEvent) { event.preventDefault(); setBusy(true); const response = await fetch("/api/labs/knowledge/trainer/phones", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, phone }) }); setBusy(false); if (response.ok) { setLabel(""); setPhone(""); router.refresh(); } }
  async function toggle(id: string, active: boolean) { await fetch(`/api/labs/knowledge/trainer/phones/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active }) }); router.refresh(); }
  return <section className="labs-knowledge-trainer"><header><div><p>Entrenador personal</p><h2>Actualizá conocimiento desde WhatsApp</h2></div><span>Confirmación obligatoria</span></header><p>Sólo estos números pueden proponer cambios. Las conversaciones quedan separadas del Inbox comercial y cada cambio conserva historial.</p>
    <form onSubmit={add}><input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre del entrenador" /><input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+54 9 11…" /><button disabled={busy}>{busy ? "Agregando…" : "Autorizar teléfono"}</button></form>
    <div>{phones.map((item) => <article key={item.id}><div><strong>{item.label}</strong><span>+{item.phone}</span></div><button onClick={() => toggle(item.id, !item.active)}>{item.active ? "Revocar" : "Reactivar"}</button></article>)}</div>
  </section>;
}
