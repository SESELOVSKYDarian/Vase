import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { LabsOwnerNav } from "./labs-owner-nav";

function tenantInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function LabsOwnerLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error) {
      const authErrors = [
        "LABS_SESSION_REQUIRED",
        "LABS_SESSION_INVALID",
        "LABS_SESSION_EXPIRED",
        "LABS_AUTH_SECRET_MISSING",
      ];
      if (authErrors.includes(error.message)) {
        redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs");
      }
      if (error.message === "LABS_TENANT_FORBIDDEN") {
        redirect("https://app.vase.ar/app?labs=required");
      }
    }
    redirect("https://app.vase.ar/app");
  }

  const status = resolved.context.entitlement.status;
  const tenantName = resolved.context.tenantName;
  const initials = tenantInitials(tenantName) || "VL";

  return (
    <div className="labs-shell">
      <aside className="labs-rail" aria-label="Navegacion principal de Vase Labs">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {initials}
          </span>
          <div>
            <p className="eyebrow">Vase Platform</p>
            <strong>Labs</strong>
          </div>
        </div>

        <LabsOwnerNav />

        <div className="rail-card">
          <p>Estado del servicio</p>
          <strong>{status === "ACTIVE" || status === "TRIAL" ? "IA activa" : "IA pausada"}</strong>
          <span>{tenantName}</span>
        </div>
      </aside>

      <section className="labs-stage">{children}</section>
    </div>
  );
}
