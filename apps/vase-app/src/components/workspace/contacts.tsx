"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageCircle, Plus, Ticket } from "lucide-react";
import {
  linkSupportContactAction,
  openContactTicketAction,
  saveSupportContactAction,
  startWhatsappChatAction,
} from "@/app/(platform)/app/workspace/actions";

type Contact = {
  id: string;
  phone: string;
  name: string | null;
  tenantId: string | null;
  tenantName: string | null;
  lastRequestAt: string | null;
  openTickets: number;
};
type Tenant = { id: string; name: string };

function prettyPhone(digits: string) {
  return digits.startsWith("549") && digits.length >= 12 ? `+54 9 ${digits.slice(3, -7)} ${digits.slice(-7, -4)}-${digits.slice(-4)}` : `+${digits}`;
}

/** Contactos de WhatsApp: los números vinculados a una cuenta abren tickets solos cuando piden ayuda. */
export function WorkspaceContacts({ contacts, tenants, base }: { contacts: Contact[]; tenants: Tenant[]; base: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  const run = (call: () => Promise<{ ok: boolean; message?: string; key?: string }>) => {
    setMessage(null);
    start(async () => {
      const result = await call().catch(() => ({ ok: false, message: "No pudimos guardar.", key: undefined }));
      if (result.message) setMessage({ ok: result.ok, text: result.message });
      if (result.ok && "key" in result && result.key) {
        router.push(`${base}/i/${result.key}` as Route);
        return;
      }
      if (result.ok) router.refresh();
    });
  };

  const tenantSelect = (value: string | null, onChange: (id: string) => void, name?: string) => (
    <select className="vpa-inp" name={name} defaultValue={value ?? ""} onChange={(event) => onChange(event.target.value)} aria-label="Cuenta de Vase" style={{ minWidth: 200 }}>
      <option value="">Sin vincular</option>
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="vpa-stack">
      <div className="wsp-bar">
        <p className="vpa-mut" style={{ margin: 0, flex: 1, minWidth: 240 }}>
          Cuando un número vinculado pide hablar con una persona por el WhatsApp de Vase, se abre un ticket en el tablero. Los que no están vinculados
          quedan acá para que los asignes.
        </p>
        <button type="button" className="vpa-btn acc" onClick={() => setAdding((value) => !value)}>
          <Plus size={15} aria-hidden="true" />
          Agregar contacto
        </button>
      </div>

      {adding ? (
        <form
          className="vpa-card stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(() =>
              saveSupportContactAction({ phone: String(form.get("phone") ?? ""), name: String(form.get("name") ?? ""), tenantId: String(form.get("tenantId") ?? "") }),
            );
            setAdding(false);
          }}
        >
          <div className="vpa-form">
            <label className="vpa-fld">
              <span>Número (con 54 9 y característica)</span>
              <input className="vpa-inp" name="phone" required inputMode="tel" placeholder="54 9 223 555 1234" />
            </label>
            <label className="vpa-fld">
              <span>Nombre</span>
              <input className="vpa-inp" name="name" placeholder="Ej.: Juan de Sanitarios El Teflón" />
            </label>
            <label className="vpa-fld vpa-span2">
              <span>Cuenta de Vase</span>
              {tenantSelect(null, () => undefined, "tenantId")}
            </label>
          </div>
          <div>
            <button className="vpa-btn acc" disabled={pending}>
              Guardar
            </button>
          </div>
        </form>
      ) : null}

      {message ? (
        <p className={message.ok ? "vpa-notice" : "vpa-saveerr"} role="status" style={{ margin: 0 }}>
          {message.text}
        </p>
      ) : null}

      <section className="vpa-card" style={{ padding: "12px 20px" }} aria-busy={pending}>
        {contacts.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>
            Todavía no escribió nadie. Cuando alguien pida ayuda por el WhatsApp de Vase, aparece acá.
          </div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Contacto</th>
                  <th>Cuenta de Vase</th>
                  <th>Último pedido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="wrap">
                      <b>{contact.name ?? prettyPhone(contact.phone)}</b>
                      <span className="sub">
                        {contact.name ? prettyPhone(contact.phone) : "Sin nombre"}
                        {contact.openTickets ? ` · ${contact.openTickets} ticket abierto` : ""}
                      </span>
                    </td>
                    <td>{tenantSelect(contact.tenantId, (id) => run(() => linkSupportContactAction(contact.id, id)))}</td>
                    <td className="vpa-mut">
                      {contact.lastRequestAt ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(contact.lastRequestAt)) : "—"}
                    </td>
                    <td className="r">
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <button type="button" className="vpa-btn line sm" disabled={pending || !contact.tenantId} onClick={() => run(() => openContactTicketAction(contact.id))} title={contact.tenantId ? "Abrir ticket" : "Vinculalo primero"}>
                          <Ticket size={14} aria-hidden="true" />
                          Ticket
                        </button>
                        <button type="button" className="vpa-btn line sm" disabled={pending} onClick={() => run(() => startWhatsappChatAction(contact.id))}>
                          <MessageCircle size={14} aria-hidden="true" />
                          Escribirle
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
