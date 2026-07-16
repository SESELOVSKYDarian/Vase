import { labsAdminTenantControlSchema } from "@vase/contracts";
import { LabsAdminWorkspace } from "./labs-admin-workspace";

export const dynamic = "force-dynamic";

export default async function Page() {
  let controls = [];
  try {
    const response = await fetch(new URL("/api/internal/admin/labs/tenants", process.env.APP_INTERNAL_URL ?? "http://app-vase:3002"), {
      headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "x-vase-admin-user-id": process.env.ADMIN_ACTOR_USER_ID ?? "" },
      cache: "no-store",
    });
    const payload = await response.json();
    controls = Array.isArray(payload.tenants) ? payload.tenants.map((item: unknown) => labsAdminTenantControlSchema.parse(item)) : [];
  } catch { controls = []; }
  return <LabsAdminWorkspace initialControls={controls} />;
}
