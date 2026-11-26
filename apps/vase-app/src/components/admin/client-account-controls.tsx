"use client";

// Botones de la ficha del cliente para la cuenta en sí: "Editar datos" y "Eliminar cuenta", cada uno con su ventana.
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/client-ficha";
import {
  deleteClientAccountAction,
  updateClientAccountInfoAction,
  type ClientAccountInfo,
} from "@/app/(platform)/app/admin/actions/client-account";
import type { ClientActionResult } from "@/app/(platform)/app/admin/actions/client-admin";

/** Corre una acción del servidor y guarda lo que respondió, para mostrarlo en la ventana. */
function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ClientActionResult | null>(null);
  const run = (call: () => Promise<ClientActionResult>, after: () => void) => {
    setResult(null);
    start(async () => {
      const next = await call().catch(() => ({ ok: false, message: "No pudimos guardar." }));
      setResult(next);
      if (next.ok) after();
    });
  };
  return { pending, result, run };
}

/** Ventana para cambiar nombre, mail de facturación, rubro y teléfonos de la cuenta. */
function EditInfoDialog({ tenantId, info, onClose }: { tenantId: string; info: ClientAccountInfo; onClose: () => void }) {
  const router = useRouter();
  const { pending, result, run } = useAction();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const value = (key: keyof ClientAccountInfo) => String(form.get(key) ?? "");
        run(
          () =>
            updateClientAccountInfoAction(tenantId, {
              name: value("name"),
              accountName: value("accountName"),
              billingEmail: value("billingEmail"),
              industry: value("industry"),
              phone: value("phone"),
              whatsapp: value("whatsapp"),
            }),
          () => {
            onClose();
            router.refresh();
          },
        );
      }}
    >
      <AdminModal
        title="Editar datos de la cuenta"
        onClose={onClose}
        footer={
          <>
            <span style={{ flex: 1 }} />
            <button type="button" className="vpa-btn soft" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="vpa-btn acc" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </>
        }
      >
        <div className="vpa-form">
          <label className="vpa-fld">
            <span>Nombre del negocio</span>
            <input className="vpa-inp" name="name" required defaultValue={info.name} />
          </label>
          <label className="vpa-fld">
            <span>Nombre de la cuenta</span>
            <input className="vpa-inp" name="accountName" required defaultValue={info.accountName} />
          </label>
          <label className="vpa-fld vpa-span2">
            <span>Mail de facturación</span>
            <input className="vpa-inp" name="billingEmail" type="email" defaultValue={info.billingEmail} />
          </label>
          <label className="vpa-fld vpa-span2">
            <span>Rubro</span>
            <input className="vpa-inp" name="industry" defaultValue={info.industry} />
          </label>
          <label className="vpa-fld">
            <span>Teléfono</span>
            <input className="vpa-inp" name="phone" defaultValue={info.phone} />
          </label>
          <label className="vpa-fld">
            <span>WhatsApp</span>
            <input className="vpa-inp" name="whatsapp" defaultValue={info.whatsapp} />
          </label>
        </div>
        {result && !result.ok ? <p className="vpa-saveerr">{result.message}</p> : null}
      </AdminModal>
    </form>
  );
}

/** Ventana para eliminar la cuenta. Pide escribir el nombre exacto para que no se borre por error. */
function DeleteDialog({ tenantId, tenantName, onClose }: { tenantId: string; tenantName: string; onClose: () => void }) {
  const router = useRouter();
  const { pending, result, run } = useAction();
  const [typed, setTyped] = useState("");
  const [deleteUsers, setDeleteUsers] = useState(true);
  const matches = typed.trim() === tenantName.trim();
  return (
    <AdminModal
      title="Eliminar cuenta"
      subtitle="Se borra para siempre y no se puede deshacer."
      onClose={onClose}
      footer={
        <>
          <span style={{ flex: 1 }} />
          <button type="button" className="vpa-btn soft" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vpa-btn line danger"
            disabled={!matches || pending}
            onClick={() =>
              run(
                () => deleteClientAccountAction(tenantId, typed, deleteUsers),
                () => router.push("/clients" as Route),
              )
            }
          >
            {pending ? "Eliminando…" : "Eliminar para siempre"}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        Se borran sus productos, planes, cobros, equipo, avisos y todo lo que tenga en Vase. Las tiendas, asistentes y
        datos que guardan Business y Labs no se tocan desde acá.
      </p>
      <label className="vpa-fld" style={{ marginTop: 14 }}>
        <span>
          Para confirmar, escribí <b>{tenantName}</b>
        </span>
        <input className="vpa-inp" value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
        <input type="checkbox" checked={deleteUsers} onChange={(event) => setDeleteUsers(event.target.checked)} />
        Borrar también a las personas que solo están en esta cuenta (así pueden volver a registrarse con el mismo mail)
      </label>
      {result && !result.ok ? <p className="vpa-saveerr">{result.message}</p> : null}
    </AdminModal>
  );
}

/** "Editar datos" y "Eliminar cuenta" para la ficha. Eliminar solo aparece para un Super Admin. */
export function ClientAccountControls({ tenantId, info, canDelete }: { tenantId: string; info: ClientAccountInfo; canDelete: boolean }) {
  const [open, setOpen] = useState<"edit" | "delete" | null>(null);
  return (
    <>
      <button type="button" className="vpa-btn soft sm" onClick={() => setOpen("edit")}>
        Editar datos
      </button>
      {canDelete ? (
        <button type="button" className="vpa-btn line danger sm" onClick={() => setOpen("delete")}>
          Eliminar cuenta
        </button>
      ) : null}
      {open === "edit" ? <EditInfoDialog tenantId={tenantId} info={info} onClose={() => setOpen(null)} /> : null}
      {open === "delete" ? <DeleteDialog tenantId={tenantId} tenantName={info.name} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
