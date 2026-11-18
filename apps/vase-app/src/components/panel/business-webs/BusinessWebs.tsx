"use client";

// Parte de business-webs.tsx: DeleteDialog, AddDomainButton, BusinessWebs.
import { useActionState, useState } from "react";
import { deleteStorefrontPagesAction } from "@/app/(platform)/app/owner/actions";
import { NavLink } from "@/components/layout/nav-link";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import { BusinessSlot, BusinessWeb, DomainDialog, NewWebDialog, Problem, initialState, useCloseOnSuccess } from "./CustomStep";

export function DeleteDialog({ web, onClose }: { web: BusinessWeb; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(deleteStorefrontPagesAction, initialState);
  useCloseOnSuccess(state, onClose);

  return (
    <div className="vpa-dialog">
      <form action={formAction} role="dialog" aria-label="Eliminar web">
        <input type="hidden" name="pageIds" value={web.id} />
        <h3>¿Eliminar {web.name}?</h3>
        <p>La web deja de verse. No se puede deshacer.</p>
        <Problem state={state} />
        <div className="row">
          <button type="button" className="vpa-btn soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="vpa-btn ink" disabled={pending}>
            {pending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddDomainButton({ web, canUseDomain }: { web: { id: string; name: string }; canUseDomain: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="vpa-btn acc sm" onClick={() => setOpen(true)}>
        Agregar dominio
      </button>
      {open ? <DomainDialog web={web} canUseDomain={canUseDomain} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function BusinessWebs({
  webs,
  slots,
  limitText,
  remainingText,
  canCreate,
  canUseTemplate,
  canUseCustom,
  canUseDomain,
}: {
  webs: BusinessWeb[];
  slots: BusinessSlot[];
  limitText: string;
  remainingText: string;
  canCreate: boolean;
  canUseTemplate: boolean;
  canUseCustom: boolean;
  canUseDomain: boolean;
}) {
  const [menu, setMenu] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [domainOf, setDomainOf] = useState<BusinessWeb | null>(null);
  const [deleting, setDeleting] = useState<BusinessWeb | null>(null);

  return (
    <>
      <NavLink href="/app/products" className="vpa-backl">
        ← Mis productos
      </NavLink>
      <div className="vpa-sech" style={{ marginBottom: 0 }}>
        <div className="vpa-secth" style={{ marginBottom: 0 }}>
          <h2>Tus webs</h2>
          <p>{limitText}</p>
        </div>
        <button type="button" className="vpa-btn acc" disabled={!canCreate} onClick={() => setCreating(true)}>
          Nueva web
        </button>
      </div>

      <div className="vpa-wgrid">
        {webs.map((web) => (
          <article className="vpa-wcard" key={web.id}>
            <div className="vpa-wthumb" style={{ background: web.bg }}>
              <div className="vpa-wbrow" aria-hidden="true">
                <div className="vpa-wbar">
                  <i />
                  <i />
                  <i />
                  <span>{web.address}</span>
                </div>
                <div className="vpa-whero" style={{ background: web.accent }} />
                <div className="vpa-wtiles">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <span className={`vpa-tag ${web.tone}`}>
                <i />
                {web.state}
              </span>
            </div>
            <div className="vpa-wbody">
              <div>
                <h3>{web.name}</h3>
                <p>{web.sub}</p>
              </div>
              <div className="vpa-wacts">
                <a className="vpa-btn acc sm" href={BUSINESS_LAUNCH_PATH}>
                  Editar
                </a>
                {web.url ? (
                  <a className="vpa-btn line sm" href={web.url} target="_blank" rel="noreferrer">
                    Ver web
                  </a>
                ) : null}
                <div className="vpa-sp" />
                <div className="vpa-fwrap">
                  <button
                    type="button"
                    className="vpa-btn soft sm"
                    aria-label={`Más opciones de ${web.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menu === web.id}
                    onClick={() => setMenu(menu === web.id ? null : web.id)}
                  >
                    ···
                  </button>
                  {menu === web.id ? (
                    <div className="vpa-fmenu right" role="menu">
                      {web.hasDomain ? (
                        <NavLink href={`/app/owner/pages/${web.id}/domains`} className="vpa-fopt">
                          Administrar dominio
                        </NavLink>
                      ) : (
                        <button
                          type="button"
                          className="vpa-fopt"
                          role="menuitem"
                          onClick={() => {
                            setMenu(null);
                            setDomainOf(web);
                          }}
                        >
                          Conectar dominio
                        </button>
                      )}
                      <NavLink href={`/app/owner/pages/${web.id}/plan`} className="vpa-fopt">
                        Tu plan y espacio
                      </NavLink>
                      {/* La conexión con el sistema de gestión es de la cuenta, no de una web: vive en Catálogo. */}
                      <NavLink href="/app/catalogo" className="vpa-fopt">
                        Conectar con tu sistema
                      </NavLink>
                      <button
                        type="button"
                        className="vpa-fopt"
                        role="menuitem"
                        style={{ color: "var(--red)" }}
                        onClick={() => {
                          setMenu(null);
                          setDeleting(web);
                        }}
                      >
                        Eliminar web
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
        <button type="button" className="vpa-wadd" disabled={!canCreate} onClick={() => setCreating(true)}>
          <span className="pl" aria-hidden="true">+</span>
          <b>{webs.length === 0 ? "Crear tu primera web" : "Crear otra web"}</b>
          <small>{remainingText}</small>
        </button>
      </div>

      {menu ? <div className="vpa-menuscrim" onClick={() => setMenu(null)} /> : null}
      {creating ? (
        <NewWebDialog canUseTemplate={canUseTemplate} canUseCustom={canUseCustom} slots={slots} onClose={() => setCreating(false)} />
      ) : null}
      {domainOf ? <DomainDialog web={domainOf} canUseDomain={canUseDomain} onClose={() => setDomainOf(null)} /> : null}
      {deleting ? <DeleteDialog web={deleting} onClose={() => setDeleting(null)} /> : null}
    </>
  );
}
