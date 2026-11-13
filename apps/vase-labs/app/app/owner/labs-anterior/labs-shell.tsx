"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { PanelBrandLogo, PanelShell, type PanelNavGroup } from "@vase/ui/panel";
import { labsNavigationGroups, labsSectionTitles, resolveLabsSection } from "./labs-owner-nav";

const HELP_URL = "https://help.vase.ar";

/** Labs anterior: las pantallas de antes, para usarlas mientras se termina el Labs nuevo. */
export function LabsShell({
  tenantName,
  plan,
  needCount,
  children,
}: {
  tenantName: string;
  plan: string;
  needCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/anterior";
  const section = resolveLabsSection(pathname);
  const { title, subtitle } = labsSectionTitles[section];
  const groups: PanelNavGroup[] = labsNavigationGroups.map((group) => ({
    label: group.label,
    items: group.items.map(({ id, href, label, icon: Icon }) => ({
      id,
      href,
      label,
      icon: <Icon size={18} aria-hidden="true" />,
      badge: id === "conversaciones" && needCount > 0 ? needCount : undefined,
    })),
  }));

  return (
    <PanelShell
      storageKey="vase-labs-mini"
      brand={
        <>
          <PanelBrandLogo />
          <b>vase</b>
          <span className="vase-pill">Labs</span>
        </>
      }
      groups={groups}
      activeId={section}
      title={title}
      subtitle={subtitle}
      renderLink={({ href, className, title: hint, onClick, children: content }) => (
        <Link href={href as never} className={className} title={hint} onClick={onClick}>
          {content}
        </Link>
      )}
      account={{ initial: tenantName.slice(0, 1).toUpperCase() || "V", name: tenantName, detail: `Plan ${plan}` }}
      accountMenu={(close) => (
        <>
          {/* Igual en todos los productos: Ajustes, Ayuda y soporte, volver a Vase, el panel anterior y salir. */}
          <Link href="/anterior/settings" className="vpa-am" onClick={close}>
            Ajustes
          </Link>
          <a href={HELP_URL} className="vpa-am" target="_blank" rel="noreferrer" onClick={close}>
            Ayuda y soporte
          </a>
          <a href="https://app.vase.ar/app" className="vpa-am">
            ← Volver a Vase
          </a>
          <a href="/owner" className="vpa-am">
            Volver al Labs nuevo
          </a>
          <a href="/api/labs/signout" className="vpa-am out">
            Cerrar sesión
          </a>
        </>
      )}
      actions={
        <a className="vpa-ib" href={HELP_URL} target="_blank" rel="noreferrer" aria-label="Ayuda y guías" title="Ayuda y guías">
          <CircleHelp size={18} aria-hidden="true" />
        </a>
      }
    >
      <div className="vpa-notice2" style={{ marginBottom: 18 }}>
        <b>Estás en el Labs anterior.</b>
        <span>
          Son las pantallas de antes, para usarlas mientras se termina el nuevo. <a href="/owner">Volver al Labs nuevo</a>
        </span>
      </div>
      {children}
    </PanelShell>
  );
}
