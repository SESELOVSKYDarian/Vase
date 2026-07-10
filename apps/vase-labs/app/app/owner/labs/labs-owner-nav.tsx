"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Cable,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/app/owner/labs", label: "Panel", icon: LayoutDashboard },
  { href: "/app/owner/labs/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/app/owner/labs/activity", label: "Actividad", icon: Activity },
  { href: "/app/owner/labs/chatbots", label: "Conocimiento", icon: Bot },
  { href: "/app/owner/labs/integrations", label: "Canales", icon: Cable },
  { href: "/app/owner/labs/settings", label: "Ajustes", icon: Settings2 },
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
    <nav className="flex-1 space-y-1" aria-label="Secciones de Labs">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as never}
            aria-current={active ? "page" : undefined}
            data-labs-tour={item.label.toLowerCase()}
            className={[
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[var(--muted)] transition-colors duration-200",
              active
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <Icon aria-hidden="true" className="size-4" />
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
      <nav className="labs-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Secciones de Labs">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href as never}
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-xs font-bold transition-colors",
                active
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-strong)] text-[var(--accent-contrast)]">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Vase Labs</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">Gestion avanzada</p>
        </div>
      </div>
    </div>
  );
}
