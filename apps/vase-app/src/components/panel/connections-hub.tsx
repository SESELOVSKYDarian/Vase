"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  setDataSourceAction,
  setExternalSystemAction,
} from "@/app/(platform)/app/settings/product-source-actions";
import {
  DATA_RESOURCES,
  EXTERNAL_SYSTEMS,
  type DataResourceId,
  type DataSourceId,
  type ProductKey,
} from "@/lib/business/data-sources";

const PRODUCTS: Record<ProductKey, { name: string; short: string; mark: string; bg: string; fg: string }> = {
  business: { name: "Vase Business", short: "Business", mark: "B", bg: "#0d3b2a", fg: "#7ff0bd" },
  labs: { name: "Vase Labs", short: "Labs", mark: "L", bg: "#241a5c", fg: "#b9a7ff" },
  management: { name: "Vase Management", short: "Management", mark: "M", bg: "#f6dfae", fg: "#7c2d12" },
  rest: { name: "Vase Rest", short: "Rest", mark: "R", bg: "#7a2e1d", fg: "#ffe6d9" },
};
const SOURCE_KEY: Record<Exclude<DataSourceId, "EXTERNAL">, ProductKey> = { BUSINESS: "business", MANAGEMENT: "management", REST: "rest" };

type Values = Record<DataResourceId, DataSourceId>;

function list(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Selector propio (no el del navegador), con la marca de cada producto. */
function SourceSelect({
  label,
  value,
  options,
  disabled,
  onPick,
}: {
  label: string;
  value: { label: string; mark: string; bg: string; fg: string };
  options: Array<{ id: string; label: string; hint: string; mark?: string; bg?: string; fg?: string; on: boolean; off: boolean }>;
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="vpa-hubsel" ref={ref}>
      <button type="button" className={open ? "vpa-hubselb on" : "vpa-hubselb"} aria-haspopup="listbox" aria-expanded={open} aria-label={label} disabled={disabled} onClick={() => setOpen(!open)}>
        {value.mark ? (
          <span className="vpa-hubmk" style={{ background: value.bg, color: value.fg }}>
            {value.mark}
          </span>
        ) : null}
        <span className="vpa-g1">{value.label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="vpa-hubmenu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.on}
              disabled={option.off}
              className={option.on ? "vpa-hubopt on" : "vpa-hubopt"}
              onClick={() => {
                setOpen(false);
                if (!option.on) onPick(option.id);
              }}
            >
              {option.mark ? (
                <span className="vpa-hubmk" style={{ background: option.bg, color: option.fg }}>
                  {option.mark}
                </span>
              ) : null}
              <span className="vpa-g1">
                <b>{option.label}</b>
                {option.hint ? <span>{option.hint}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Mi negocio › Cómo se conectan tus productos. Cada producto funciona solo; si tenés varios, acá
 * elegís de dónde sale cada cosa y el resto la usa. Si algo sale de tu sistema de gestión, abajo
 * aparece todo lo de esa conexión.
 */
export function ConnectionsHub({
  active,
  initial,
  externalSystem,
  canEdit,
  connection,
}: {
  active: Record<ProductKey, boolean>;
  initial: Values;
  externalSystem: string | null;
  canEdit: boolean;
  connection?: React.ReactNode;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [system, setSystem] = useState<string>(externalSystem ?? EXTERNAL_SYSTEMS[0]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const sourceView = (source: DataSourceId) =>
    source === "EXTERNAL"
      ? { label: `Tu sistema (${system})`, short: system, mark: "↔", bg: "var(--active)", fg: "var(--tx)" }
      : { label: PRODUCTS[SOURCE_KEY[source]].name, short: PRODUCTS[SOURCE_KEY[source]].short, mark: PRODUCTS[SOURCE_KEY[source]].mark, bg: PRODUCTS[SOURCE_KEY[source]].bg, fg: PRODUCTS[SOURCE_KEY[source]].fg };

  const pick = (resource: DataResourceId, source: DataSourceId) => {
    const before = values[resource];
    setValues((current) => ({ ...current, [resource]: source }));
    setMessage(null);
    startTransition(async () => {
      const result = await setDataSourceAction({ resource, source, externalSystem: source === "EXTERNAL" ? (system as (typeof EXTERNAL_SYSTEMS)[number]) : undefined });
      if (!result.ok) setValues((current) => ({ ...current, [resource]: before }));
      setMessage({ ok: result.ok, text: result.message });
    });
  };

  const pickSystem = (name: string) => {
    const before = system;
    setSystem(name);
    startTransition(async () => {
      const result = await setExternalSystemAction(name);
      if (!result.ok) setSystem(before);
      setMessage({ ok: result.ok, text: result.message });
    });
  };

  const external = DATA_RESOURCES.filter((resource) => values[resource.id] === "EXTERNAL");
  const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
  const summary = `Productos desde ${sourceView(values.CATALOG).short} · stock desde ${sourceView(values.STOCK).short} · pedidos a ${sourceView(values.ORDERS).short}`;

  return (
    <details className="vpa-acc2 vpa-span2" open>
      <summary>
        <span className="vpa-g1">
          <b>Cómo se conectan tus productos</b>
          <span>{summary}</span>
        </span>
        <ChevronDown size={18} className="vpa-chev2" aria-hidden="true" />
      </summary>
      <div className="vpa-acc2-body vpa-hub">
        <div className="vpa-hubprods">
          {(Object.keys(PRODUCTS) as ProductKey[]).map((key) => (
            <div key={key} className={active[key] ? "vpa-hp" : "vpa-hp off"}>
              <span className="vpa-hpi" style={{ background: PRODUCTS[key].bg, color: PRODUCTS[key].fg }}>
                {PRODUCTS[key].mark}
              </span>
              <b>{PRODUCTS[key].name}</b>
              <small>{active[key] ? "Activo" : "No lo tenés"}</small>
            </div>
          ))}
          <div className="vpa-hp ext">
            <span className="vpa-hpi" style={{ background: "var(--soft)", color: "var(--mut)" }}>
              ↔
            </span>
            <b>Sistema externo</b>
            <small>{external.length ? system : "Sin conectar"}</small>
          </div>
        </div>
        <p className="vpa-mut" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>
          Cada producto funciona solo. Si tenés varios, acá elegís de dónde sale cada cosa y el resto lo usa. Con uno solo no tenés que tocar nada.
        </p>

        <div className="vpa-hubrows">
          {DATA_RESOURCES.map((resource) => {
            const current = sourceView(values[resource.id]);
            const users = resource.users.filter((user) => SOURCE_KEY[values[resource.id] as Exclude<DataSourceId, "EXTERNAL">] !== user);
            return (
              <div className="vpa-hubrow" key={resource.id}>
                <div className="vpa-g1">
                  <b>{resource.title}</b>
                  <span>{resource.hint}</span>
                </div>
                <SourceSelect
                  label={`${resource.title}: sale de`}
                  value={current}
                  disabled={!canEdit || pending}
                  onPick={(id) => pick(resource.id, id as DataSourceId)}
                  options={resource.options.map((option) => {
                    const view = sourceView(option);
                    const has = option === "EXTERNAL" || active[SOURCE_KEY[option]];
                    return {
                      id: option,
                      label: view.label,
                      hint: has ? resource.optionHints[option] ?? "" : "No lo tenés todavía",
                      mark: view.mark,
                      bg: view.bg,
                      fg: view.fg,
                      on: values[resource.id] === option,
                      off: !has,
                    };
                  })}
                />
                <div className="vpa-hubuse">
                  <small>Lo usan</small>
                  <div className="vpa-uses">
                    {users.map((user) => (
                      <span key={user} className="vpa-usec" style={active[user] ? { background: PRODUCTS[user].bg, color: PRODUCTS[user].fg } : { background: "var(--soft)", color: "var(--mut)" }}>
                        {PRODUCTS[user].short}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {message ? (
          <p role="status" className="vpa-mut" style={{ margin: 0, fontSize: 12.5, color: message.ok ? undefined : "var(--red)" }}>
            {message.text}
          </p>
        ) : null}
        {!canEdit ? <p className="vpa-mut" style={{ margin: 0, fontSize: 12.5 }}>Solo el Dueño puede cambiarlo.</p> : null}

        {external.length ? (
          <div className="vpa-hubext">
            <div className="vpa-hubexth">
              <div className="vpa-g1">
                <b>Tu sistema externo</b>
                <span>Aparece porque elegiste tu sistema para {list(external.map((item) => lower(item.title)))}.</span>
              </div>
              <div style={{ width: 240 }}>
                <SourceSelect
                  label="Cuál es tu sistema"
                  value={{ label: system, mark: "", bg: "", fg: "" }}
                  disabled={!canEdit || pending}
                  onPick={pickSystem}
                  options={EXTERNAL_SYSTEMS.map((name) => ({ id: name, label: name, hint: "", on: name === system, off: false }))}
                />
              </div>
            </div>
            <div className="vpa-hubsend">
              <b>Qué manda tu sistema y quién lo usa</b>
              {DATA_RESOURCES.map((resource) => {
                const from = values[resource.id];
                const isExt = from === "EXTERNAL";
                const toWhom = resource.users.filter((user) => user !== "rest" || active.rest).map((user) => PRODUCTS[user].short);
                return (
                  <div className="vpa-hubsendi" key={resource.id}>
                    <span className={isExt ? "vpa-hubck" : "vpa-hubck off"} aria-hidden="true">
                      {isExt ? "✓" : "–"}
                    </span>
                    <span className="vpa-g1">
                      <b>{resource.id === "ORDERS" && isExt ? "Recibe los pedidos" : resource.title}</b>
                      <span>
                        {isExt
                          ? resource.id === "ORDERS"
                            ? `Vase le manda las compras de ${list(toWhom)}`
                            : `Lo usan ${list(toWhom)}`
                          : `No: sale de ${sourceView(from).label}`}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            {connection}
          </div>
        ) : null}
      </div>
    </details>
  );
}
