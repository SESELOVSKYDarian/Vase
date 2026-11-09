"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AuthActionState } from "@/app/(auth)/actions";
import {
  createStorefrontPageAction,
  deleteStorefrontPagesAction,
  requestCustomPageAction,
  requestDomainConnectionAction,
} from "@/app/(platform)/app/owner/actions";
import { NavLink } from "@/components/layout/nav-link";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import { CUSTOM_WEB_DEFAULTS } from "@/lib/business/web-cards";

export type BusinessWeb = {
  id: string;
  name: string;
  sub: string;
  address: string;
  url: string | null;
  hasDomain: boolean;
  state: string;
  tone: string;
  bg: string;
  accent: string;
};

export type BusinessSlot = { id: string; day: string; time: string };

const initialState: AuthActionState = {};

function firstError(state: AuthActionState) {
  return state.error ?? null;
}

function fieldMessage(state: AuthActionState) {
  return Object.values(state.fieldErrors ?? {})[0]?.[0] ?? null;
}

function Problem({ state }: { state: AuthActionState }) {
  const field = fieldMessage(state);
  const message = field ?? firstError(state);
  return message ? <p role="alert" style={{ color: "var(--red)" }}>{message}</p> : null;
}

function DialogHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <div>
        <h3>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}

function useCloseOnSuccess(state: AuthActionState, onClose: () => void) {
  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);
}

function TemplateStep({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createStorefrontPageAction, initialState);
  useCloseOnSuccess(state, onClose);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="pageMode" value="STANDARD" />
      <label className="vpa-fld">
        <span>Nombre de la web</span>
        <input className="vpa-inp" name="name" required minLength={3} maxLength={80} placeholder="Por ejemplo: Mi tienda mayorista" />
      </label>
      <Problem state={state} />
      <div className="row">
        <button type="button" className="vpa-btn soft" style={{ marginRight: "auto" }} onClick={onBack}>
          Volver
        </button>
        <button type="submit" className="vpa-btn acc" disabled={pending}>
          {pending ? "Creando..." : "Crear web"}
        </button>
      </div>
    </form>
  );
}

function CustomStep({ slots, onBack, onClose }: { slots: BusinessSlot[]; onBack: () => void; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(requestCustomPageAction, initialState);
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  useCloseOnSuccess(state, onClose);

  if (slots.length === 0) {
    return (
      <>
        <div className="vpa-hrow">
          <div className="vpa-g1">
            <b>Por ahora no hay horarios para la reunión</b>
            <span>Escribinos desde Ayuda y soporte y coordinamos.</span>
          </div>
        </div>
        <div className="row">
          <button type="button" className="vpa-btn soft" style={{ marginRight: "auto" }} onClick={onBack}>
            Volver
          </button>
          <NavLink href="/app/help" className="vpa-btn acc">
            Ir a Ayuda
          </NavLink>
        </div>
      </>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Object.entries(CUSTOM_WEB_DEFAULTS).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="slotId" value={slotId} />
      <label className="vpa-fld">
        <span>¿Qué web necesitás?</span>
        <input className="vpa-inp" name="pageScope" required minLength={10} maxLength={200} placeholder="Por ejemplo: una tienda solo para mayoristas" />
      </label>
      <label className="vpa-fld">
        <span>¿Qué querés lograr con ella?</span>
        <textarea className="vpa-inp vpa-area" name="businessObjective" required minLength={10} maxLength={300} />
      </label>
      <div className="vpa-fld">
        <span>Elegí un horario para la reunión</span>
        <div className="vpa-slots" role="radiogroup" aria-label="Horarios">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={slotId === slot.id}
              className={slotId === slot.id ? "vpa-choice on" : "vpa-choice"}
              onClick={() => setSlotId(slot.id)}
            >
              <b>{slot.day}</b>
              <span>{slot.time}</span>
            </button>
          ))}
        </div>
      </div>
      <Problem state={state} />
      <div className="row">
        <button type="button" className="vpa-btn soft" style={{ marginRight: "auto" }} onClick={onBack}>
          Volver
        </button>
        <button type="submit" className="vpa-btn acc" disabled={pending}>
          {pending ? "Enviando..." : "Enviar pedido"}
        </button>
      </div>
    </form>
  );
}

function NewWebDialog({
  canUseTemplate,
  canUseCustom,
  slots,
  onClose,
}: {
  canUseTemplate: boolean;
  canUseCustom: boolean;
  slots: BusinessSlot[];
  onClose: () => void;
}) {
  const [flow, setFlow] = useState<"choice" | "template" | "custom">("choice");
  const copy = {
    choice: ["Nueva web", "¿Cómo la querés hacer?"],
    template: ["Con una plantilla", "Ponele un nombre. Después la editás cuando quieras."],
    custom: ["Web a medida", "Contanos lo básico. El resto lo vemos en la reunión."],
  }[flow];

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label="Nueva web" style={{ width: 560 }}>
        <DialogHead title={copy[0]} sub={copy[1]} onClose={onClose} />
        {flow === "choice" ? (
          <div className="vpa-flow">
            {canUseTemplate ? (
              <button type="button" className="vpa-flowc" onClick={() => setFlow("template")}>
                <b>Con una plantilla</b>
                <span>Elegís un diseño, le ponés tus cosas y queda lista en el momento.</span>
              </button>
            ) : null}
            {canUseCustom ? (
              <button type="button" className="vpa-flowc" onClick={() => setFlow("custom")}>
                <b>A medida</b>
                <span>La diseñamos con vos. Empieza con una reunión y un presupuesto.</span>
              </button>
            ) : null}
            {!canUseTemplate && !canUseCustom ? <p>Tu cuenta no tiene habilitado crear webs.</p> : null}
          </div>
        ) : null}
        {flow === "template" ? <TemplateStep onBack={() => setFlow("choice")} onClose={onClose} /> : null}
        {flow === "custom" ? <CustomStep slots={slots} onBack={() => setFlow("choice")} onClose={onClose} /> : null}
      </div>
    </div>
  );
}

function DomainDialog({ web, canUseDomain, onClose }: { web: BusinessWeb; canUseDomain: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(requestDomainConnectionAction, initialState);
  useCloseOnSuccess(state, onClose);

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label="Conectar dominio" style={{ width: 520 }}>
        <DialogHead title="Conectar dominio" sub={web.name} onClose={onClose} />
        {canUseDomain ? (
          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="hidden" name="storefrontPageId" value={web.id} />
            <label className="vpa-fld">
              <span>Tu dominio</span>
              <input className="vpa-inp" name="hostname" required placeholder="tunegocio.com.ar" />
            </label>
            <div className="vpa-hrow">
              <span className="vpa-mut">Después te mostramos qué cambiar donde compraste el dominio.</span>
            </div>
            <Problem state={state} />
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="vpa-btn acc" disabled={pending}>
                {pending ? "Conectando..." : "Conectar"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p>Tu plan no incluye dominio propio.</p>
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={onClose}>
                Cerrar
              </button>
              <NavLink href="/app/products" className="vpa-btn acc">
                Ver planes
              </NavLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteDialog({ web, onClose }: { web: BusinessWeb; onClose: () => void }) {
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
                      <NavLink href={`/app/owner/integrations/api?site=${web.id}`} className="vpa-fopt">
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
