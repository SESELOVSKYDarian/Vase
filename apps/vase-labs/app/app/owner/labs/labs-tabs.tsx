"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PanelTabs } from "@vase/ui/panel";

// Pestañas de las secciones que juntan varias pantallas.
export const CONVERSATION_TABS = [
  { href: "/owner/inbox", label: "Bandeja" },
  { href: "/owner/activity", label: "Quién quiere comprar" },
];

export const ASSISTANT_TABS = [
  { href: "/owner/knowledge", label: "Qué sabe y cómo responde" },
  { href: "/owner/knowledge/catalog", label: "Catálogo" },
  { href: "/owner/inbox/trainer", label: "Lo que le enseñaron" },
];

export function LabsTabs({ tabs, aside }: { tabs: Array<{ href: string; label: string }>; aside?: ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`));
  return (
    <div className="labs-tabs-row">
      <PanelTabs
        items={tabs}
        activeHref={active?.href ?? tabs[0].href}
        renderLink={({ href, className, children }) => (
          <Link href={href as never} className={className}>
            {children}
          </Link>
        )}
      />
      {aside ? <div className="vpa-cacts">{aside}</div> : null}
    </div>
  );
}
