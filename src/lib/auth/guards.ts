import { auth } from "@/auth";
import {
  hasPlatformRole,
  hasTenantRole,
  type PlatformRole,
  type TenantRole,
} from "@/lib/auth/roles";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  return session;
}

export async function requirePlatformRole(requiredRole: PlatformRole) {
  const session = await requireUser();

  if (!hasPlatformRole(session.user.platformRole, requiredRole)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}

export async function requireVerifiedPlatformRole(requiredRole: PlatformRole) {
  const session = await requirePlatformRole(requiredRole);

  if (!session.user.isEmailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  return session;
}

export async function requireVerifiedUser() {
  const session = await requireUser();

  if (!session.user.isEmailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  return session;
}

export async function requireTenantRole(requiredRole: TenantRole, tenantSlug?: string) {
  const session = await requireUser();
  const membership = await getTenantMembership(session.user.id, tenantSlug);

  if (!membership || !hasTenantRole(membership.role, requiredRole)) {
    throw new Error("FORBIDDEN");
  }

  if (membership.tenant.status === "SUSPENDED") {
    throw new Error("TENANT_SUSPENDED");
  }

  return { session, membership };
}

export const platformRoles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPPORT: "SUPPORT",
  USER: "USER",
} as const;

export const tenantRoles = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
} as const;
