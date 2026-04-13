import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { getTenantModulesAccess } from "@/server/queries/modules";

export async function GET() {
  try {
    const session = await requireUser();
    const membership = await getTenantMembership(session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
    }

    const payload = await getTenantModulesAccess(membership.tenantId);

    if (!payload) {
      return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

