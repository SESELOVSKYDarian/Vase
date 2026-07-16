import { createHash, randomBytes } from "node:crypto";
import { createManagementSsoTicket } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedUser();
    const tenantSlug = new URL(request.url).searchParams.get("tenant") ?? undefined;
    const membership = await getTenantMembership(session.user.id, tenantSlug);
    if (!membership || membership.tenant.status === "SUSPENDED") throw new Error("FORBIDDEN");
    const [tenantModule, userAccess, identityLink] = await Promise.all([
      prisma.tenantModule.findUnique({ where: { tenantId_moduleId: { tenantId: membership.tenantId, moduleId: "vase_management" } } }),
      prisma.userModuleAccess.findUnique({ where: { userId_moduleId: { userId: session.user.id, moduleId: "vase_management" } } }),
      prisma.managementIdentityLink.findUnique({ where: { tenantId_userId: { tenantId: membership.tenantId, userId: session.user.id } } }),
    ]);
    if (!tenantModule?.isActive || userAccess?.isActive === false || identityLink?.isActive === false) throw new Error("MANAGEMENT_NOT_ENTITLED");

    const nonce = randomBytes(24).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 90;
    const email = session.user.email;
    if (!email) throw new Error("VERIFIED_EMAIL_REQUIRED");
    const name = session.user.name?.trim() || email;
    await prisma.managementSsoNonce.create({ data: { nonceHash: createHash("sha256").update(nonce).digest("hex"), tenantId: membership.tenantId, userId: session.user.id, expiresAt: new Date(expiresAt * 1000) } });
    const ticket = createManagementSsoTicket({ nonce, globalTenantId: membership.tenantId, tenantName: membership.tenant.name, globalUserId: session.user.id, email, name, role: membership.role, issuedAt: now, expiresAt }, process.env.MANAGEMENT_SSO_SECRET ?? "");
    const destination = new URL("/auth/sso", process.env.MANAGEMENT_INTERNAL_URL ?? "http://localhost:3004");
    destination.searchParams.set("ticket", ticket);
    return NextResponse.redirect(destination);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    return NextResponse.json({ error: message }, { status: message === "SSO_SECRET_NOT_CONFIGURED" ? 503 : 403 });
  }
}
