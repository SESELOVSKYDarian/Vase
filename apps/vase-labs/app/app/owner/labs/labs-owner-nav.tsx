"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Cable,
  MessageSquare,
  LayoutDashboard,
  ShoppingBag,
  Settings2,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/owner", label: "Panel", icon: LayoutDashboard },
  { href: "/owner/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/owner/activity", label: "Actividad", icon: Activity },
  { href: "/owner/orders", label: "Pedidos", icon: ShoppingBag },
  { href: "/owner/knowledge", label: "Conocimiento", icon: Bot },
  { href: "/owner/channels", label: "Canales", icon: Cable },
  { href: "/owner/settings", label: "Ajustes", icon: Settings2 },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/owner") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LabsOwnerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as never}
            className={[
              "labs-owner-nav-link flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm transition-all duration-200",
              active
                ? "is-active font-semibold"
                : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]",
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
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href as never}
              className={[
                "labs-owner-mobile-nav-link inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors",
                active ? "is-active" : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="labs-sidebar-brand mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <div className="labs-sidebar-mark grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent-strong)] text-[var(--accent-contrast)]">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Vase Labs</p>
          <p className="font-[family-name:var(--font-newsreader)] text-xl font-semibold italic leading-none text-[var(--foreground)]">Gestion avanzada</p>
        </div>
      </div>
    </div>
  );
}
