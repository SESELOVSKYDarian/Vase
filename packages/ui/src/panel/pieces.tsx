import type { ReactNode } from "react";

// Piezas del panel de Vase. Todas usan las clases de panel.css (dentro de .vpa).

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

export type PanelTone = "g" | "y" | "r" | "b" | "n";

/** Etiqueta de estado con un punto de color: g verde, y amarillo, r rojo, b azul, n gris. */
export function PanelTag({ tone = "n", children }: { tone?: PanelTone; children: ReactNode }) {
  return (
    <span className={cx("vpa-tag", tone !== "n" && tone)}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

/** Tarjeta con título, bajada y acciones opcionales. */
export function PanelCard({
  title,
  description,
  actions,
  className,
  id,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cx("vpa-card", className)} id={id}>
      {title || description || actions ? (
        <div className="vpa-sech">
          <div className="vpa-g1">
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="vpa-cacts">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Sección que se abre y se cierra (como en Mi negocio). */
export function PanelSection({
  title,
  summary,
  badge,
  defaultOpen = false,
  id,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <details className="vpa-acc2" open={defaultOpen} id={id}>
      <summary>
        <span className="vpa-g1">
          <b>{title}</b>
          {summary ? <span>{summary}</span> : null}
        </span>
        {badge}
        <svg className="vpa-chev2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="vpa-acc2-body">{children}</div>
    </details>
  );
}

export function PanelSections({ children }: { children: ReactNode }) {
  return <div className="vpa-acclist">{children}</div>;
}

/** Fila de números grandes. */
export function PanelKpis({ items }: { items: Array<{ label: ReactNode; value: ReactNode; detail?: ReactNode }> }) {
  return (
    <div className="vpa-kpis">
      {items.map((item, index) => (
        <div className="vpa-kpi" key={index}>
          <small>{item.label}</small>
          <b>{item.value}</b>
          {item.detail ? <span>{item.detail}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** Datos sueltos en grilla (dato chico arriba, valor abajo). */
export function PanelFacts({ items }: { items: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <div className="vpa-facts2">
      {items.map((item, index) => (
        <div key={index}>
          <small>{item.label}</small>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

/** Aviso verde de una línea. */
export function PanelNotice({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="vpa-notice2">
      <b>{title}</b>
      {children ? <span>{children}</span> : null}
    </div>
  );
}

/** Aviso que pide algo: ícono, texto y un botón. */
export function PanelAlert({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="vpa-alert">
      {icon ? <span className="ic" aria-hidden="true">{icon}</span> : null}
      <div className="vpa-g1">
        <b>{title}</b>
        {children ? <span className="t">{children}</span> : null}
      </div>
      {action}
    </div>
  );
}

export function PanelEmpty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="vpa-empty">
      <div>{children}</div>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

/** Barra de uso (0 a 100). */
export function PanelMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="vpa-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Fila de lista: algo a la izquierda, texto, y lo que vaya a la derecha. */
export function PanelRow({ lead, title, detail, children }: { lead?: ReactNode; title: ReactNode; detail?: ReactNode; children?: ReactNode }) {
  return (
    <div className="vpa-row">
      {lead}
      <div className="vpa-g1">
        <b>{title}</b>
        {detail ? <span>{detail}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** Pestañas como links (cada una es una página). */
export function PanelTabs({
  items,
  activeHref,
  renderLink,
}: {
  items: Array<{ href: string; label: ReactNode }>;
  activeHref: string;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
}) {
  const link = renderLink ?? (({ href, className, children }) => <a href={href} className={className}>{children}</a>);
  return (
    <nav className="vpa-seg" aria-label="Secciones">
      {items.map((item) => (
        <span key={item.href} style={{ display: "contents" }}>
          {link({ href: item.href, className: item.href === activeHref ? "on" : "", children: item.label })}
        </span>
      ))}
    </nav>
  );
}
