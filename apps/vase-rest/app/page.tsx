import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChefHat,
  CloudCog,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveRestOwnerRequest } from "@/lib/request-context";

const capabilities = [
  {
    icon: ChefHat,
    label: "Operación",
    title: "Salón, cocina y caja en el mismo pulso.",
    body: "Cada rol ve el flujo que necesita, con trazabilidad por persona, dispositivo y sucursal.",
  },
  {
    icon: Building2,
    label: "Multi-sucursal",
    title: "Compartí exactamente lo que conviene.",
    body: "Catálogos, recetas, precios, depósitos y proveedores pueden heredarse o administrarse por separado.",
  },
  {
    icon: RadioTower,
    label: "Continuidad Edge",
    title: "La sucursal sigue trabajando.",
    body: "La operación local conserva pedidos, cocina e impresión y sincroniza de forma durable al recuperar internet.",
  },
] as const;

export default async function RestHomePage() {
  try {
    const requestHeaders = await headers();
    await resolveRestOwnerRequest({ cookieHeader: requestHeaders.get("cookie") });
    redirect("/owner");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("SESSION")) throw error;
  }

  return (
    <main className="rest-shell">
      <nav className="topbar" aria-label="Navegación principal">
        <a className="brand" href="/" aria-label="Vase Rest, inicio">
          <span className="brand-mark"><span /></span>
          <span>vase</span>
          <em>rest</em>
        </a>
        <div className="topbar-meta">
          <span className="system-state"><i /> Infraestructura híbrida</span>
          <a className="access-link" href="#capacidades">
            Conocer Rest <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Operación gastronómica · por Vase</p>
          <h1>Tu restaurante,<br /><span>siempre en servicio.</span></h1>
          <p className="hero-lede">
            Una plataforma para dirigir cada sucursal con precisión, sin perder el ritmo cuando la conexión se corta.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#capacidades">
              Explorar capacidades <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a className="button button-secondary" href="#arquitectura">
              Ver arquitectura operativa
            </a>
          </div>
          <div className="trust-row" aria-label="Características de seguridad">
            <span><ShieldCheck size={16} /> Datos aislados por organización</span>
            <span><BadgeCheck size={16} /> Acciones auditables</span>
          </div>
        </div>

        <aside id="arquitectura" className="signal-panel" aria-label="Arquitectura operativa Vase Rest">
          <div className="signal-head">
            <span>Red operativa</span>
            <strong>Cloud + Edge</strong>
          </div>
          <div className="signal-core">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="core-node">
              <CloudCog size={29} />
              <span>Vase Rest</span>
              <small>CANONICAL</small>
            </div>
            <span className="branch-node branch-a">Centro</span>
            <span className="branch-node branch-b">Norte</span>
            <span className="branch-node branch-c">Depósito</span>
          </div>
          <div className="signal-foot">
            <span><i /> Sincronización durable</span>
            <code>POSTGRES · EDGE WAL</code>
          </div>
        </aside>
      </section>

      <section id="capacidades" className="capability-grid" aria-label="Capacidades">
        {capabilities.map(({ icon: Icon, label, title, body }, index) => (
          <article key={label} style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
            <div className="card-top">
              <span className="card-index">0{index + 1}</span>
              <Icon size={20} aria-hidden="true" />
            </div>
            <p className="card-label">{label}</p>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
