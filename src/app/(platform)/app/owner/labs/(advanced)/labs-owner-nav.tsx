"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  BrainCircuit,
  Cable,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";

const navItems = [
  { href: "/app/owner/labs", label: "Panel", icon: LayoutDashboard },
  { href: "/app/owner/labs/automation", label: "Automatizacion", icon: Workflow },
  { href: "/app/owner/labs/chatbots", label: "Chatbots", icon: Bot },
  { href: "/app/owner/labs/integrations", label: "Integraciones", icon: Cable },
  { href: "/app/owner/labs/ai-tools", label: "Herramientas IA", icon: BrainCircuit },
  { href: "/app/owner/labs/settings", label: "Configuracion", icon: Settings2 },
  { href: "/app/owner/labs/activity", label: "Actividad", icon: Activity },
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
            href={item.href}
            className={[
              "mx-2 flex items-center gap-3 rounded-full px-4 py-3 text-[#191c1b] transition-all duration-300",
              active
                ? "bg-gradient-to-r from-[#006d43] to-[#18c37e] text-white shadow-[0px_18px_36px_rgba(0,109,67,0.18)]"
                : "hover:bg-[#f2f4f2] hover:translate-x-1",
            ].join(" ")}
          >
            <Icon className="size-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{item.label}</span>
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
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "mr-2 inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                active ? "bg-[#006d43] text-white" : "bg-[#f2f4f2] text-[#34423a] hover:bg-[#e8ece9]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#dbe3de] bg-white p-4">
        <div className="grid h-10 w-10 place-items-center rounded-[0.9rem] bg-[#006d43] text-white">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6c7b70]">Vase Labs</p>
          <p className="text-sm font-semibold text-[#191c1b]">Gestion avanzada</p>
        </div>
      </div>
    </div>
  );
}
