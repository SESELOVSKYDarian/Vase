"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { PanelSection, PanelSections, PanelTag } from "@vase/ui/panel";

export type EditableBranch = { id: string; name: string; address: string; phone: string; hours: string; isMain: boolean };
export type EditableContact = { tagline: string; phone: string; whatsapp: string; email: string; website: string; hours: string };

const CONTACT_FIELDS: Array<{ name: keyof EditableContact; label: string; type?: string; placeholder?: string; wide?: boolean }> = [
  { name: "tagline", label: "Qué hacés, en una frase", placeholder: "Materia prima para heladería y panadería", wide: true },
  { name: "phone", label: "Teléfono" },
  { name: "whatsapp", label: "WhatsApp" },
  { name: "email", label: "Correo", type: "email" },
  { name: "website", label: "Sitio web" },
  { name: "hours", label: "Horario general", placeholder: "Lunes a viernes de 9 a 18", wide: true },
];

async function send(action: string, data: unknown) {
  const response = await fetch("/api/labs/business-profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  return { ok: response.ok && body.ok !== false, message: body.message ?? (response.ok ? "Guardado." : "No pudimos guardar.") };
}

/** Mi negocio desde Labs: contacto, horarios y sucursales. Se guarda en tu cuenta de Vase y lo usan todos tus productos. */
export function BusinessEditor({
  available,
  contact,
  branches,
  fullProfileUrl,
}: {
  available: boolean;
  contact: EditableContact;
  branches: EditableBranch[];
  fullProfileUrl: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditableBranch | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EditableBranch | null>(null);
  const [contactMessage, setContactMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!available) {
    return (
      <div className="vpa-card">
        <p className="vpa-mut">No pudimos traer Mi negocio ahora. Podés editarlo desde tu cuenta de Vase.</p>
        <div className="vpa-from">
          <span />
          <a href={fullProfileUrl} className="vpa-btn line sm">Ir a Mi negocio</a>
        </div>
      </div>
    );
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(CONTACT_FIELDS.map((field) => [field.name, String(form.get(field.name) ?? "")]));
    startTransition(async () => {
      const result = await send("contact", data);
      setContactMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  function removeBranch(branch: EditableBranch) {
    startTransition(async () => {
      const result = await send("deleteBranch", { id: branch.id });
      setConfirmDelete(null);
      setBranchError(result.ok ? null : result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PanelSections>
        <PanelSection title="Contacto y horario" summary={[contact.whatsapp || contact.phone, contact.hours].filter(Boolean).join(" · ") || "Todavía sin cargar"} defaultOpen>
          <form onSubmit={saveContact} className="vpa-stack" style={{ gap: 14 }}>
            <div className="vpa-form">
              {CONTACT_FIELDS.map((field) => (
                <label key={field.name} className="vpa-fld" style={field.wide ? { gridColumn: "1 / -1" } : undefined}>
                  <span>{field.label}</span>
                  <input className="vpa-inp" name={field.name} type={field.type ?? "text"} defaultValue={contact[field.name]} placeholder={field.placeholder} maxLength={field.name === "hours" ? 120 : 191} />
                </label>
              ))}
            </div>
            <div className="vpa-from" style={{ marginTop: 0 }}>
              <span role="status" style={contactMessage && !contactMessage.ok ? { color: "var(--red)" } : undefined}>
                {contactMessage?.text ?? "Tu asistente usa estos datos para responder."}
              </span>
              <button type="submit" className="vpa-btn acc sm" disabled={isPending}>
                {isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </PanelSection>

        <PanelSection
          title="Sucursales"
          summary={branches.length ? `${branches.length} ${branches.length === 1 ? "sucursal" : "sucursales"}` : "Todavía sin sucursales"}
          defaultOpen
        >
          {branchError ? <p role="alert" style={{ color: "var(--red)" }}>{branchError}</p> : null}
          {branches.length === 0 ? <p className="vpa-mut">Todavía no cargaste sucursales.</p> : null}
          <div className="vpa-branches">
            {branches.map((branch) => (
              <article className="vpa-branch" key={branch.id}>
                <div className="vpa-g1">
                  <b>
                    {branch.name}
                    {branch.isMain ? <span style={{ marginLeft: 8 }}><PanelTag tone="g">Principal</PanelTag></span> : null}
                  </b>
                  <span>{branch.address}</span>
                  {branch.hours || branch.phone ? <span>{[branch.hours, branch.phone].filter(Boolean).join(" · ")}</span> : null}
                </div>
                <div className="vpa-branch-acts">
                  <button type="button" className="vpa-btn soft sm" onClick={() => setEditing(branch)}>Editar</button>
                  <button type="button" className="vpa-btn soft sm danger" aria-label={`Eliminar ${branch.name}`} onClick={() => setConfirmDelete(branch)}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
          <div className="vpa-from">
            <span />
            <button type="button" className="vpa-btn line sm" onClick={() => setEditing("new")}>Agregar sucursal</button>
          </div>
        </PanelSection>
      </PanelSections>

      <div className="vpa-from">
        <span>Logo, nombre, redes y datos fiscales se cambian desde tu cuenta de Vase.</span>
        <a href={fullProfileUrl} className="vpa-btn line sm">Ver todo Mi negocio</a>
      </div>

      {editing ? (
        <BranchDrawer
          branch={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setBranchError(null);
            router.refresh();
          }}
        />
      ) : null}

      {confirmDelete ? (
        <div className="vpa-dialog" style={{ position: "fixed" }}>
          <div role="dialog" aria-modal="true" aria-label="Eliminar sucursal">
            <h3>¿Eliminar {confirmDelete.name}?</h3>
            <p>Deja de aparecer en tus productos y tu asistente ya no la va a mencionar.</p>
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button type="button" className="vpa-btn acc" disabled={isPending} onClick={() => removeBranch(confirmDelete)}>
                {isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BranchDrawer({ branch, onClose, onSaved }: { branch: EditableBranch | null; onClose: () => void; onSaved: () => void }) {
  const [isMain, setIsMain] = useState(branch?.isMain ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await send("saveBranch", {
        id: branch?.id,
        name: String(form.get("name") ?? ""),
        address: String(form.get("address") ?? ""),
        phone: String(form.get("phone") ?? ""),
        hours: String(form.get("hours") ?? ""),
        isMain,
      });
      if (result.ok) onSaved();
      else setError(result.message);
    });
  }

  return (
    <div className="vpa-ov" style={{ position: "fixed" }} onClick={onClose}>
      <form className="vpa-dr" role="dialog" aria-modal="true" aria-label={branch ? "Editar sucursal" : "Nueva sucursal"} onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="vpa-mh">
          <div className="vpa-g1">
            <h3>{branch ? "Editar sucursal" : "Nueva sucursal"}</h3>
            <p>Aparece en tu tienda, tu asistente y tus locales.</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="vpa-drb">
          <label className="vpa-fld">
            <span>Nombre</span>
            <input className="vpa-inp" name="name" required minLength={2} maxLength={120} defaultValue={branch?.name} placeholder="Por ejemplo: Local Palermo" autoFocus />
          </label>
          <label className="vpa-fld">
            <span>Dirección</span>
            <input className="vpa-inp" name="address" required minLength={3} maxLength={191} defaultValue={branch?.address} placeholder="Calle, número y ciudad" />
          </label>
          <label className="vpa-fld">
            <span>Horarios</span>
            <input className="vpa-inp" name="hours" maxLength={120} defaultValue={branch?.hours} placeholder="Lunes a viernes de 9 a 18" />
          </label>
          <label className="vpa-fld">
            <span>Teléfono</span>
            <input className="vpa-inp" name="phone" maxLength={40} defaultValue={branch?.phone} />
          </label>
          <button type="button" className="vpa-nall" role="checkbox" aria-checked={isMain} onClick={() => setIsMain(!isMain)}>
            <span className={isMain ? "vpa-cbx on" : "vpa-cbx"} aria-hidden="true">✓</span>
            Es la sucursal principal
          </button>
          {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
        </div>
        <div className="vpa-mf">
          <button type="button" className="vpa-btn soft" onClick={onClose}>Cancelar</button>
          <button type="submit" className="vpa-btn acc" disabled={isPending}>{isPending ? "Guardando…" : "Guardar sucursal"}</button>
        </div>
      </form>
    </div>
  );
}
