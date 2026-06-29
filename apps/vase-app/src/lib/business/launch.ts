import { SignJWT } from "jose";
import { BUSINESS_EDITOR_ORIGIN } from "@/lib/business/links";

type LaunchMembership = {
  role: string;
  tenantId: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
};

type LaunchSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    platformRole?: string | null;
    isEmailVerified?: boolean;
  };
};

const BRIDGE_ISSUER = process.env.VASE_BUSINESS_SSO_ISSUER ?? "vase-app";
const BRIDGE_AUDIENCE = process.env.VASE_BUSINESS_SSO_AUDIENCE ?? "vase-business";
const ALLOWED_ROLES = new Set(["OWNER", "MANAGER"]);

function getBusinessLaunchSecret() {
  const secret = String(process.env.VASE_BUSINESS_SSO_SECRET ?? "").trim();

  if (!secret) {
    throw new Error("BUSINESS_SSO_SECRET_MISSING");
  }

  return secret;
}

function getBusinessEditorUrl() {
  const configured = String(process.env.BUSINESS_EDITOR_URL ?? "").trim();

  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production"
    ? `${BUSINESS_EDITOR_ORIGIN}/admin/evolution`
    : "http://localhost:5173/admin/evolution";
}

export async function createBusinessLaunchUrl({
  session,
  membership,
}: {
  session: LaunchSession;
  membership: LaunchMembership;
}) {
  if (!session?.user?.id || !session.user.email) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!session.user.isEmailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  if (!membership?.tenantId || !membership.tenant?.id || !ALLOWED_ROLES.has(String(membership.role))) {
    throw new Error("FORBIDDEN");
  }

  if (membership.tenant.status === "SUSPENDED") {
    throw new Error("TENANT_SUSPENDED");
  }

  const secret = new TextEncoder().encode(getBusinessLaunchSecret());
  const token = await new SignJWT({
    email: session.user.email,
    name: session.user.name ?? "",
    platform_role: session.user.platformRole ?? "USER",
    email_verified: true,
    tenant_id: membership.tenantId,
    tenant_slug: membership.tenant.slug,
    tenant_name: membership.tenant.name,
    tenant_role: membership.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(BRIDGE_ISSUER)
    .setAudience(BRIDGE_AUDIENCE)
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  const editorUrl = new URL(getBusinessEditorUrl());
  editorUrl.searchParams.set("vase_token", token);
  return editorUrl.toString();
}
