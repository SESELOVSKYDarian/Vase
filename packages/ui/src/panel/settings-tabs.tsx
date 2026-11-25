// Pestañas de Ajustes, iguales en app y en cada producto: ícono, nombre y una línea de qué hay adentro.
// Una pestaña puede llevar un ícono "i" con una aclaración (por ejemplo, Mi negocio).
import type { ReactNode } from "react";

export type SettingsTabItem = {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  href: string;
  /** Aclaración que aparece al pasar el mouse o tocar la "i". */
  info?: string;
};

type LinkRenderer = (props: { href: string; className: string; children: ReactNode; ariaCurrent?: "page" }) => ReactNode;

/** Link común, para cuando la app no pasa el suyo (por ejemplo el Link de Next). */
const defaultLink: LinkRenderer = ({ href, className, children, ariaCurrent }) => (
  <a href={href} className={className} aria-current={ariaCurrent}>
    {children}
  </a>
);

/** Pestañas de la pantalla de ajustes; marca la que está abierta. */
export function PanelSettingsTabs({
  items,
  active,
  renderLink = defaultLink,
}: {
  items: SettingsTabItem[];
  active: string;
  renderLink?: LinkRenderer;
}) {
  return (
    <nav className="vpa-stabs" aria-label="Ajustes">
      {items.map((item) => {
        const on = item.id === active;
        return (
          <div key={item.id} className={on ? "vpa-stab on" : "vpa-stab"}>
            {renderLink({
              href: item.href,
              className: "vpa-stab-link",
              ariaCurrent: on ? "page" : undefined,
              children: (
                <>
                  <span className="vpa-stab-ic" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="vpa-stab-tx">
                    <b>{item.label}</b>
                    {item.hint ? <small>{item.hint}</small> : null}
                  </span>
                </>
              ),
            })}
            {item.info ? (
              <button type="button" className="vpa-stab-info" aria-label={`Sobre ${item.label}: ${item.info}`}>
                i<span role="tooltip">{item.info}</span>
              </button>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
