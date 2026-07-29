import { labsAdminTenantControlSchema } from "@vase/contracts";
import { LabsAdminWorkspace } from "./labs-admin-workspace";
import {
  RestAdminWorkspace,
  type RestOperationsView,
  type RestPricingView,
} from "./rest-admin-workspace";

export const dynamic = "force-dynamic";

export default async function Page() {
  let controls = [];
  let restVersions: RestPricingView[] = [];
  let restHealth: "ok" | "degraded" | "unavailable" = "unavailable";
  let restOperations: RestOperationsView = { tenants: [], edges: [] };
  try {
    const response = await fetch(new URL("/api/internal/admin/labs/tenants", process.env.APP_INTERNAL_URL ?? "http://app-vase:3002"), {
      headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "x-vase-admin-user-id": process.env.ADMIN_ACTOR_USER_ID ?? "" },
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
  return <div className="admin-composite"><RestAdminWorkspace initialVersions={restVersions} initialHealth={restHealth} initialOperations={restOperations} /><LabsAdminWorkspace initialControls={controls} /></div>;
}
