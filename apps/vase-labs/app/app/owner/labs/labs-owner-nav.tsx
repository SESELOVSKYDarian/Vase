"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Cable,
  MessageSquare,
  LayoutDashboard,
  Settings2,
  Sparkles,
} from "lucide-react";

const navItems = [
  { id: "panel", href: "/app/owner/labs", label: "Panel", icon: LayoutDashboard },
  { id: "automatizacion", href: "/app/owner/labs/automation", label: "Automatizacion", icon: Cable },
  { id: "chatbots", href: "/app/owner/labs/chatbots", label: "Chatbots", icon: Bot },
  { id: "inbox", href: "/app/owner/labs/inbox", label: "Inbox", icon: MessageSquare },
  { id: "integraciones", href: "/app/owner/labs/integrations", label: "Integraciones", icon: Cable },
  { id: "herramientas-ia", href: "/app/owner/labs/ai-tools", label: "Herramientas IA", icon: Bot },
  { id: "configuracion", href: "/app/owner/labs/settings", label: "Configuracion", icon: Settings2 },
  { id: "actividad", href: "/app/owner/labs/activity", label: "Actividad", icon: Activity },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app/owner/labs") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LabsOwnerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as never}
            data-labs-tour={item.id}
            aria-current={active ? "page" : undefined}
            className={[
              "labs-organic-nav-link",
              active ? "is-active" : "",
            ].join(" ")}
          >
            <Icon className="size-4" />
            <span className="font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LabsOwnerMobileNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 lg:hidden">
      <nav className="flex gap-2 overflow-x-auto pb-1 labs-scrollbar">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href as never}
              aria-current={active ? "page" : undefined}
              className={[
                "labs-organic-mobile-link",
                active ? "is-active" : "",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/app/owner/labs"
        aria-label="Volver al Panel de Vase Labs"
        className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-strong)] text-[var(--accent-contrast)]">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-soft)]">El Atrio Organico</p>
          <p className="text-sm font-semibold italic text-[var(--accent-strong)]">Vase Labs</p>
        </div>
      </Link>
    </div>
  );
}
