"use client";

// Copia de seguridad de la web: muestra la última copia y deja hacer una nueva o restablecer.
import { useActionState, useState } from "react";
import {
  createBackupAction,
  restoreBackupAction,
  type BackupActionState,
} from "@/app/(platform)/app/owner/pages/[pageId]/plan/actions";

const initial: BackupActionState = { ok: false, message: "" };

export type BackupView = { id: string; when: string; detail: string };

export function BackupPanel({
  pageId,
  backup,
  nextLabel,
  canRestore,
}: {
  pageId: string;
  backup: BackupView | null;
  nextLabel: string;
  canRestore: boolean;
}) {
  const [created, createAction, creating] = useActionState(createBackupAction, initial);
  const [restored, restoreAction, restoring] = useActionState(restoreBackupAction, initial);
  const [confirming, setConfirming] = useState(false);
  const notice = restored.message ? restored : created;

  return (
    <section className="vpa-tp-box" aria-label="Copia de seguridad">
      <div>
        <h3>Copia de seguridad</h3>
        <p className="sub">Guardamos una copia completa de tu web por semana. Siempre queda la última.</p>
      </div>

      <div className="vpa-tp-bk">
        <div className="g">
          <b>{backup ? backup.when : "Todavía no hay una copia"}</b>
          <span>{backup ? backup.detail : "La primera se hace sola esta semana, de madrugada."}</span>
        </div>
        <form action={createAction}>
          <input type="hidden" name="pageId" value={pageId} />
          <button type="submit" className="vpa-btn line sm" disabled={creating || restoring}>
            {creating ? "Copiando..." : "Hacer copia ahora"}
          </button>
        </form>
        {backup?.id && canRestore ? (
          <button type="button" className="vpa-btn ink sm" disabled={creating || restoring} onClick={() => setConfirming(true)}>
            Restablecer
          </button>
        ) : null}
      </div>

      {notice.message ? (
        <p className="vpa-tp-note" role="status" style={{ color: notice.ok ? "var(--acc-tx)" : "var(--red)" }}>
          {notice.message}
        </p>
      ) : null}

      <div className="vpa-tp-facts">
        <div>
          <small>Cada cuánto</small>
          <b>Una vez por semana</b>
        </div>
        <div>
          <small>Próxima</small>
          <b>{nextLabel}</b>
        </div>
        <div>
          <small>Se guarda</small>
          <b>Solo la última</b>
        </div>
        <div>
          <small>Qué incluye</small>
          <b>Todo</b>
        </div>
      </div>
      <p className="vpa-tp-note">
        Incluye diseño, textos, catálogo, precios, imágenes y pedidos. Restablecer deja la web como estaba ese día: lo que
        cambiaste después se pierde. Antes de restablecer guardamos una copia de cómo está ahora, por si te arrepentís.
      </p>

      {confirming && backup ? (
        <div className="vpa-dialog" style={{ position: "fixed" }}>
          <form
            action={(formData) => {
              setConfirming(false);
              restoreAction(formData);
            }}
            role="dialog"
            aria-label="Restablecer web"
          >
            <input type="hidden" name="pageId" value={pageId} />
            <input type="hidden" name="backupId" value={backup.id} />
            <h3>¿Restablecer la web?</h3>
            <p>
              La web vuelve a como estaba el {backup.when}. Los cambios, pedidos y productos cargados después se pierden.
              Antes guardamos una copia del estado actual.
            </p>
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button type="submit" className="vpa-btn ink">
                Restablecer
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
