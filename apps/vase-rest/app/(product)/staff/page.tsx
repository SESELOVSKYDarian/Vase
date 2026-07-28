"use client";

import { useEffect, useState } from "react";
import type { RestStaffRole } from "@vase/contracts";
import { RestShell } from "../rest-shell";

type Session = {
  staff: {
    displayName: string;
    roles: Array<{ branchId: string; role: RestStaffRole }>;
  };
};

export default function StaffHomePage() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("vase-rest-staff-session");
    if (!raw) {
      location.replace("/staff/login");
      return;
    }
    try {
      setSession(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem("vase-rest-staff-session");
      location.replace("/staff/login");
    }
  }, []);
  if (!session) return <main className="staff-login"><p>Validando acceso…</p></main>;
  const assignment = session.staff.roles[0]!;
  return (
    <RestShell
      role={assignment.role}
      branchName="Sucursal enrolada"
      actorName={session.staff.displayName}
    >
      <main className="product-content">
        <p className="eyebrow">Turno activo</p>
        <h1>Hola, {session.staff.displayName}</h1>
        <p>Elegí una función del menú para comenzar.</p>
      </main>
    </RestShell>
  );
}
