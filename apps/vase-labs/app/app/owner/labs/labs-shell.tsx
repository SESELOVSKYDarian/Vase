"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { PanelShell, type PanelNavGroup } from "@vase/ui/panel";
import { labsNavigationGroups, labsSectionTitles, resolveLabsSection } from "./labs-owner-nav";

const HELP_URL = "https://help.vase.ar";

/** Marco de Vase Labs: el mismo menú, barra y piezas que el panel de Vase. */
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
  const pathname = usePathname() ?? "/owner";
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/vasecolorlogo.png" alt="Vase" width={26} height={26} />
          <b>vase</b>
          <span className="vpa-pbadge">Labs</span>
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
          <Link href="/owner/settings" className="vpa-am" onClick={close}>
            Ajustes de Labs
          </Link>
          <a href="https://app.vase.ar/app" className="vpa-am">
            Volver a Vase
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
      {children}
    </PanelShell>
  );
}
