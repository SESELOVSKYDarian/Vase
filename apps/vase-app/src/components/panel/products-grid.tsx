"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PlatformModuleKey } from "@/config/modules";
import { NavLink } from "@/components/layout/nav-link";
import { ProductArt } from "@/components/panel/product-art";
import type { PanelPlan, PanelProduct } from "@/components/panel/products";

export type ProductsGridItem = PanelProduct & {
  isActive: boolean;
  href: string;
  footLabel: string;
  currentPlan: string | null;
  priceLabel: string;
  plans: PanelPlan[];
};

export function ProductsGrid({ items }: { items: ProductsGridItem[] }) {
  const [openKey, setOpenKey] = useState<PlatformModuleKey | null>(null);
  const open = items.find((item) => item.key === openKey) ?? null;

  return (
    <>
      <div className="vpa-pgrid">
        {items.map((item) => (
          <article className="vpa-pcard" key={item.key}>
            <div className="vpa-art" style={{ background: item.artBg }}>
              <ProductArt product={item.key} variant="card" />
              <span className={item.isActive ? "vpa-tag g" : "vpa-tag"}>
                <i />
                {item.isActive ? "Activo" : "Para sumar"}
              </span>
            </div>
            <div className="vpa-pbody">
              <div>
                <h3>{item.name}</h3>
                <p>{item.what}</p>
              </div>
              <div className="vpa-pfoot">
                <small>{item.footLabel}</small>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="vpa-btn line sm" onClick={() => setOpenKey(item.key)}>
                    {item.isActive ? "Ver detalle" : "Conocer"}
                  </button>
                  {item.isActive ? (
                    <NavLink href={item.href} className="vpa-btn acc sm" forceDocumentNavigation={item.key === "management"}>
                      Entrar
                    </NavLink>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {open ? (
        <div className="vpa-ov" onClick={() => setOpenKey(null)}>
          <aside className="vpa-dr" aria-label={`Detalle de ${open.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="vpa-mh">
              <div>
                <h3>{open.name}</h3>
                <p>{open.what}</p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setOpenKey(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="vpa-drb">
              <div className="vpa-hrow">
                <div className="vpa-g1">
                  <b>{open.isActive ? (open.currentPlan ? `Plan ${open.currentPlan}` : "Activo") : "Todavía no lo tenés"}</b>
                  <span>{open.priceLabel}</span>
                </div>
              </div>
              <div>
                <div className="vpa-lab">Qué incluye</div>
                <ul className="vpa-ck">
                  {open.points.map((point) => (
                    <li key={point}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              {open.plans.length > 0 ? (
                <div>
                  <div className="vpa-lab">Planes</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {open.plans.map((plan) => (
                      <div className="vpa-hrow" key={plan.key}>
                        <div className="vpa-g1">
                          <b>
                            {plan.name}
                            {plan.name === open.currentPlan ? " · Tu plan" : ""}
                          </b>
                          <span>{plan.description}</span>
                        </div>
                        <strong style={{ fontWeight: 800 }}>{plan.price}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 10 }}>
                {open.isActive ? (
                  <NavLink href={open.href} className="vpa-btn acc" forceDocumentNavigation={open.key === "management"}>
                    Entrar
                  </NavLink>
                ) : null}
                <NavLink href="/app/help" className="vpa-btn line">
                  {open.isActive ? "Cambiar de plan" : "Hablar con Vase"}
                </NavLink>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
