"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app/owner/labs", label: "Plan" },
  { href: "/app/owner/labs/integrations", label: "Canales" },
  { href: "/app/owner/labs/settings", label: "Tokens" },
  { href: "/app/owner/labs/inbox", label: "Inbox IA" },
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
    <nav className="rail-nav" aria-label="Secciones de Labs">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as never}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
