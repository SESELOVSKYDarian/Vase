"use client";

import { useState, useTransition } from "react";
import {
  setProductSourceAction,
  type ProductSource,
} from "@/app/(platform)/app/settings/product-source-actions";

const OPTIONS: Array<{ value: ProductSource; title: string; text: string }> = [
  { value: "EXTERNAL_API", title: "Tu sistema de gestión", text: "Tu sistema manda productos, precios y stock a Vase." },
  { value: "VASE_MANAGEMENT", title: "Vase Management", text: "Gestionás todo desde Vase, sin sistema externo." },
];

// Ajustes › Mi negocio: de dónde salen productos, precios y stock para todos tus productos de Vase.
export function ProductSourceCard({
  source,
  managementAvailable,
  canEdit,
  businessSettingsUrl,
}: {
  source: ProductSource;
  managementAvailable: boolean;
  canEdit: boolean;
  businessSettingsUrl: string;
}) {
  const [current, setCurrent] = useState<ProductSource>(source);
  const [asking, setAsking] = useState<ProductSource | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    if (!asking) return;
    const target = asking;
    startTransition(async () => {
      const result = await setProductSourceAction(target);
      setAsking(null);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok && result.source) setCurrent(result.source);
    });
  };

  return (
    <section className="vpa-card stack">
      <div className="vpa-sech">
        <div className="vpa-g1">
          <h3>Cómo se conectan tus productos</h3>
          <p>De dónde salen tus productos, precios y stock. Lo usan tu tienda y el resto de tus productos de Vase.</p>
        </div>
      </div>
      <div className="vpa-two" role="radiogroup" aria-label="De dónde vienen tus productos">
        {OPTIONS.map((option) => {
          const on = current === option.value;
          const locked = option.value === "VASE_MANAGEMENT" && !managementAvailable;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              className={on ? "vpa-choice on" : "vpa-choice"}
              disabled={!canEdit || pending || (!on && locked)}
              onClick={() => {
                if (on) return;
                setMessage(null);
                setAsking(option.value);
              }}
            >
              <b>{option.title}</b>
              <span>
                {option.text}
                {locked ? " Requiere contratación." : ""}
              </span>
              {on ? <span><b>En uso</b></span> : null}
            </button>
          );
        })}
      </div>
      {asking ? (
        <div className="vpa-hrow">
          <div className="vpa-g1">
            <b>{asking === "VASE_MANAGEMENT" ? "¿Pasar a Vase Management?" : "¿Volver a tu sistema de gestión?"}</b>
            <span>Los productos, precios y stock pasan a venir de la nueva fuente. Vase revisa y acomoda los datos, puede tardar unos minutos.</span>
          </div>
          <button type="button" className="vpa-btn soft sm" disabled={pending} onClick={() => setAsking(null)}>
            Cancelar
          </button>
          <button type="button" className="vpa-btn acc sm" disabled={pending} onClick={confirm}>
            {pending ? "Cambiando…" : "Cambiar"}
          </button>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="vpa-mut" style={{ margin: 0, color: message.ok ? undefined : "var(--red)" }}>
          {message.text}
        </p>
      ) : null}
      {current === "EXTERNAL_API" ? (
        <p className="vpa-mut" style={{ margin: 0, fontSize: 12.5 }}>
          La dirección y la clave que necesita quien programa tu sistema están en{" "}
          <a href={businessSettingsUrl}>Vase Business › Ajustes › Sistema de gestión</a>.
        </p>
      ) : null}
      {!canEdit ? <p className="vpa-mut" style={{ margin: 0, fontSize: 12.5 }}>Solo el Dueño puede cambiarlo.</p> : null}
    </section>
  );
}
