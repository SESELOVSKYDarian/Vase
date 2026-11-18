"use client";

import Link from "next/link";
import type { Route } from "next";
import { type ReactNode, useState, useTransition } from "react";
import { ChevronRight, FileSpreadsheet, Layers, PlugZap, Store, X } from "lucide-react";
import { setDataSourceAction } from "@/app/(platform)/app/settings/product-source-actions";
import { EXTERNAL_SYSTEMS } from "@/lib/business/data-sources";

/**
 * Catálogo vacío: "¿De dónde sacás tus productos?". Desde Vase (Vase Management o subir tu Excel/PDF)
 * o desde tu sistema de gestión, que abre cómo conectarlo. `connection` es el estado de la conexión
 * (lo arma el servidor con los datos de Business); `canEdit`: solo el Dueño elige y ve las claves.
 */
export function CatalogSource({
  hasManagement,
  canEdit,
  currentSystem,
  connection,
}: {
  hasManagement: boolean;
  canEdit: boolean;
  currentSystem: string | null;
  connection: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState<string>(currentSystem ?? EXTERNAL_SYSTEMS[0]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = () =>
    startTransition(async () => {
      const result = await setDataSourceAction({ resource: "CATALOG", source: "EXTERNAL", externalSystem: system as (typeof EXTERNAL_SYSTEMS)[number] });
      if (result.ok) await setDataSourceAction({ resource: "STOCK", source: "EXTERNAL", externalSystem: system as (typeof EXTERNAL_SYSTEMS)[number] });
      setMessage({ ok: result.ok, text: result.ok ? `Listo: tus productos van a salir de ${system}.` : result.message });
    });

  return (
    <>
      <section className="vpa-where" aria-label="De dónde sacás tus productos">
        <header>
          <span className="ic" aria-hidden="true">
            <Layers size={24} />
          </span>
          <h2>¿De dónde sacás tus productos?</h2>
          <p>Cargalos una sola vez y aparecen en todos tus productos de Vase: en tu tienda, en lo que responde la IA y en tu gestión.</p>
        </header>
        <div className="vpa-wopts">
          <div className="vpa-wopt">
            <span className="tag">Desde Vase</span>
            <h3>Los cargamos y los manejás en Vase</h3>
            <p>Ideal si hoy los tenés en una planilla o no usás ningún sistema.</p>
            <Link href={"/app/products" as Route} className="vpa-wchoice">
              <span className="ic" aria-hidden="true">
                <Store size={19} />
              </span>
              <span className="vpa-g1">
                <b>{hasManagement ? "Usar Vase Management" : "Sumar Vase Management"}</b>
                <span>Precios, stock y ventas en un solo lugar</span>
              </span>
              <ChevronRight size={18} className="go" aria-hidden="true" />
            </Link>
            <Link href={"/app/archivos" as Route} className="vpa-wchoice">
              <span className="ic" aria-hidden="true">
                <FileSpreadsheet size={19} />
              </span>
              <span className="vpa-g1">
                <b>Subir tu Excel o PDF</b>
                <span>Mandanos tu lista y la cargamos por vos</span>
              </span>
              <ChevronRight size={18} className="go" aria-hidden="true" />
            </Link>
          </div>
          <div className="vpa-wopt">
            <span className="tag">Desde tu sistema de gestión</span>
            <h3>Se actualizan solos desde tu sistema</h3>
            <p>Si ya usás Tango, Bejerman, Contabilium u otro, tu sistema manda precios y stock a Vase.</p>
            <button type="button" className="vpa-wchoice" onClick={() => setOpen(true)}>
              <span className="ic" aria-hidden="true">
                <PlugZap size={19} />
              </span>
              <span className="vpa-g1">
                <b>Conectar mi sistema</b>
                <span>{currentSystem ? `Elegiste ${currentSystem}` : "Te mostramos cómo, paso a paso"}</span>
              </span>
              <ChevronRight size={18} className="go" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {open ? (
        <div className="vpa-ov" onClick={() => setOpen(false)}>
          <div className="vpa-dr" role="dialog" aria-label="Conectar tu sistema de gestión" onClick={(event) => event.stopPropagation()}>
            <div className="vpa-mh">
              <div>
                <h3>Conectar tu sistema de gestión</h3>
                <p>Tu sistema manda los productos a Vase. No tenés que cargar nada a mano.</p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="vpa-drb">
              <ol className="vpa-steps">
                <li>Elegí qué sistema usás.</li>
                <li>Pasale la dirección y la clave de abajo a quien programa tu sistema.</li>
                <li>Cuando tu sistema mande el primer envío, tus productos aparecen en el Catálogo.</li>
              </ol>
              {canEdit ? (
                <div className="vpa-fld">
                  <span>Tu sistema</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select className="vpa-inp" value={system} onChange={(event) => setSystem(event.target.value)} style={{ flex: "1 1 200px" }} aria-label="Tu sistema">
                      {EXTERNAL_SYSTEMS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="vpa-btn acc sm" disabled={pending} onClick={choose}>
                      {pending ? "Guardando…" : "Usar este sistema"}
                    </button>
                  </div>
                  {message ? (
                    <small role="status" className="vpa-mut" style={{ fontSize: 12.5, color: message.ok ? undefined : "var(--red)" }}>
                      {message.text}
                    </small>
                  ) : null}
                </div>
              ) : (
                <p className="vpa-note">Solo el Dueño de la cuenta puede conectar el sistema de gestión.</p>
              )}
              {connection}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
