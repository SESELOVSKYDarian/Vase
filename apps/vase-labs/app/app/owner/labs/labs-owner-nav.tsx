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
    <nav className="rail-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as never}
            aria-current={active ? "page" : undefined}
            className="owner-rail-link"
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
