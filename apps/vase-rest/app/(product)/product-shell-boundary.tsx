"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { restStaffRoleSchema, type RestStaffRole } from "@vase/contracts";
import { RestShell } from "./rest-shell";

type Identity = {
  role: RestStaffRole;
  actorName: string;
  branchName: string;
  branches?: Array<{ id: string; name: string }>;
  branchId?: string;
};

function localStaffIdentity(): Identity | null {
  try {
    const session = JSON.parse(
      sessionStorage.getItem("vase-rest-staff-session") ?? "{}",
    ) as {
      branchId?: string;
      staff?: {
        displayName?: string;
        roles?: Array<{ branchId: string; role: string }>;
      };
    };
    const assignment = session.staff?.roles?.find((role) =>
      role.branchId === session.branchId);
    if (!session.staff?.displayName || !assignment) return null;
    return {
      role: restStaffRoleSchema.parse(assignment.role),
      actorName: session.staff.displayName,
      branchName: "Sucursal operativa",
      branchId: session.branchId,
    };
  } catch {
    return null;
  }
}

export function ProductShellBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const isLogin = pathname === "/staff/login";
  const ownerRoute = pathname.startsWith("/owner");

  useEffect(() => {
    if (isLogin) return;
    const staff = localStaffIdentity();
    if (!ownerRoute && staff) {
      setIdentity(staff);
      return;
    }
    let active = true;
    void fetch("/api/v1/context", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        const branchId = search.get("branch") ??
          localStorage.getItem("vase-rest-owner-branch") ??
          payload.branches[0]?.id;
        const branch = payload.branches.find((item: { id: string }) =>
          item.id === branchId) ?? payload.branches[0];
        if (active) setIdentity({
          role: "OWNER",
          actorName: payload.actor.displayName,
          branchName: branch?.name ?? "Sin sucursal",
          branchId: branch?.id,
          branches: payload.branches,
        });
      })
      .catch(() => {
        if (staff && active) setIdentity(staff);
        else if (active) router.replace("/staff/login");
      });
    return () => { active = false; };
  }, [isLogin, ownerRoute, pathname, router, search]);

  if (isLogin) return children;
  if (!identity) return <main className="staff-login"><p>Validando accesoâ€¦</p></main>;
  return (
    <RestShell
      role={identity.role}
      actorName={identity.actorName}
      branchName={identity.branchName}
      branches={identity.branches}
      activeBranchId={identity.branchId}
      onBranchChange={(branchId) => {
        localStorage.setItem("vase-rest-owner-branch", branchId);
        const parameters = new URLSearchParams(search.toString());
        parameters.set("branch", branchId);
        router.replace(`${pathname}?${parameters.toString()}`);
      }}
    >
      {children}
    </RestShell>
  );
}
