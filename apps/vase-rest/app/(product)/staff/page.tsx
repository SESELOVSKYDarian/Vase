"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { RestStaffRole } from "@vase/contracts";
import { navigationForRole } from "../navigation";
import { NAV_ICONS } from "../nav-icons";
import { ROLE_LABELS } from "../rest-shell";

type Session = {
  branchId?: string;
  staff: {
    displayName: string;
    roles: Array<{ branchId: string; role: RestStaffRole }>;
  };
};

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function StaffHomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("vase-rest-staff-session");
    if (!raw) {
      location.replace("/staff/login");
      return;
    }
    try {
      setSession(JSON.parse(raw));
      setNow(new Date());
    } catch {
      sessionStorage.removeItem("vase-rest-staff-session");
      location.replace("/staff/login");
    }
  }, []);
  if (!session) return <main className="vr-loading"><span className="vr-spinner" aria-hidden="true" /><p>Validando acceso…</p></main>;

  const role = session.staff.roles.find((item) => item.branchId === session.branchId)?.role ??
    session.staff.roles[0]?.role;
  const shortcuts = role
    ? navigationForRole(role).filter((item) => item.key !== "home" && item.key !== "support")
    : [];

  return (
    <main className="product-content with-head">
      <p className="eyebrow">Turno activo{role ? ` · ${ROLE_LABELS[role]}` : ""}</p>
      <h1>{now ? greeting(now) : "Hola"}, {session.staff.displayName}</h1>
      <p className="lede">Elegí por dónde empezar. Todo lo que hagas queda guardado en la sucursal, aunque se corte internet.</p>

      <div className="vr-grp-title">Tus accesos</div>
      <div className="vr-shortcuts">
        {shortcuts.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <a key={item.key} className="vr-shortcut" href={item.href}>
              <span className="vr-kic"><Icon size={20} aria-hidden="true" /></span>
              <span className="g"><b>{item.label}</b><span>{item.subtitle}</span></span>
              <ChevronRight size={16} className="go" aria-hidden="true" />
            </a>
          );
        })}
      </div>

      <a className="vr-arow" href="/support">
        <span className="g"><b>¿Algo no anda?</b><span>Escribinos desde Ayuda y soporte y te respondemos.</span></span>
        <ChevronRight size={16} aria-hidden="true" />
      </a>
    </main>
  );
}
