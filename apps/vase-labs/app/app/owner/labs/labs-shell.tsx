"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PanelAccountMenu, PanelBrandLogo, PanelShell, type PanelNavGroup } from "@vase/ui/panel";
import { labsNavigationGroups, labsSectionTitles, resolveLabsSection } from "./labs-owner-nav";
import "./labs-panel.css";
import { VaseNotificationsBell } from "./vase-notifications-bell";
import { LabsHelpButton } from "./labs-help";

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
          <PanelBrandLogo />
          <b>vase</b>
          <span className="vase-pill">Labs</span>
        </>
      }
      groups={groups}
      activeId={section}
      flush={section === "conversaciones"}
      title={title}
      subtitle={subtitle}
      renderLink={({ href, className, title: hint, onClick, children: content }) => (
        <Link href={href as never} className={className} title={hint} onClick={onClick}>
          {content}
        </Link>
      )}
      account={{ initial: tenantName.slice(0, 1).toUpperCase() || "V", name: tenantName, detail: `Plan ${plan}` }}
      accountMenu={(close) => (
        // Igual en todos los productos: Ajustes, Ayuda y soporte, volver a Vase y salir.
        <PanelAccountMenu
          close={close}
          heading={tenantName}
          settings={{ href: "/owner/settings" }}
          help={{ href: HELP_URL, newTab: true }}
          backToVase={{ href: "https://app.vase.ar/app" }}
          signOut={{ onClick: () => window.location.assign("/api/labs/signout") }}
          renderLink={({ href, className, onClick, children: content }) => (
            <Link href={href as never} className={className} onClick={onClick}>
              {content}
            </Link>
          )}
        />
      )}
      actions={
        <>
          <VaseNotificationsBell />
          <LabsHelpButton section={section} />
        </>
      }
    >
      <div className="lx">{children}</div>
    </PanelShell>
  );
}
