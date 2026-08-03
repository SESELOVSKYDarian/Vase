import { labsAdminTenantControlSchema } from "@vase/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LabsAdminWorkspace } from "./labs-admin-workspace";
import {
  RestAdminWorkspace,
  type RestContractTenantView,
  type RestOperationsView,
  type RestPricingView,
} from "./rest-admin-workspace";
import { adminSignInUrl, requireAdminSession } from "./lib/admin-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const requestHeaders = await headers();
  let actor: Awaited<ReturnType<typeof requireAdminSession>>;
  try {
    actor = await requireAdminSession(requestHeaders.get("cookie"));
  } catch {
    redirect(adminSignInUrl());
  }
  let controls = [];
  let restVersions: RestPricingView[] = [];
  let restContractTenants: RestContractTenantView[] = [];
  let restHealth: "ok" | "degraded" | "unavailable" = "unavailable";
  let restOperations: RestOperationsView = { tenants: [], edges: [] };
  const advancedUsersUrl = new URL(
    "/app/admin/users",
    process.env.VASE_APP_PUBLIC_URL ?? "https://app.vase.ar",
  ).toString();
  try {
    const response = await fetch(new URL("/api/internal/admin/labs/tenants", process.env.APP_INTERNAL_URL ?? "http://app-vase:3002"), {
      headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "x-vase-admin-user-id": actor.id },
      cache: "no-store",
    });
    const payload = await response.json();
    controls = Array.isArray(payload.tenants) ? payload.tenants.map((item: unknown) => labsAdminTenantControlSchema.parse(item)) : [];
  } catch { controls = []; }
  try {
    const [plansResponse, healthResponse, tenantsResponse, edgesResponse] = await Promise.all([
      fetch(new URL("/api/internal/admin/rest/plans", process.env.APP_INTERNAL_URL ?? "http://app-vase:3002"), {
        headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}` },
        cache: "no-store",
      }),
      fetch(new URL("/api/internal/admin/health", process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009"), {
        headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}` },
        cache: "no-store",
      }),
      fetch(new URL("/api/internal/admin/tenants", process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009"), {
        headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}` },
        cache: "no-store",
      }),
      fetch(new URL("/api/internal/admin/edges", process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009"), {
        headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}` },
        cache: "no-store",
      }),
    ]);
    const plansPayload = await plansResponse.json();
    const healthPayload = await healthResponse.json();
    const tenantsPayload = await tenantsResponse.json();
    const edgesPayload = await edgesResponse.json();
    restVersions = Array.isArray(plansPayload.versions) ? plansPayload.versions : [];
    restContractTenants = Array.isArray(plansPayload.contractTenants)
      ? plansPayload.contractTenants : [];
    restHealth = healthPayload.status === "ok" ? "ok" : "degraded";
    if (tenantsResponse.ok && edgesResponse.ok) {
      restOperations = {
        tenants: Array.isArray(tenantsPayload.tenants) ? tenantsPayload.tenants : [],
        edges: Array.isArray(edgesPayload.edges) ? edgesPayload.edges : [],
      };
    }
  } catch {
    restVersions = [];
    restHealth = "unavailable";
  }
  return <div className="admin-composite">
    <header className="admin-session-bar">
      <div><strong>Vase Admin</strong><span>{actor.name} · {actor.email}</span></div>
      <a href={advancedUsersUrl}>Administración avanzada de usuarios</a>
    </header>
    <RestAdminWorkspace
      initialVersions={restVersions}
      initialHealth={restHealth}
      initialOperations={restOperations}
      initialContractTenants={restContractTenants}
    />
    <LabsAdminWorkspace initialControls={controls} />
  </div>;
}
