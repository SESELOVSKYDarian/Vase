import { NextResponse } from "next/server";
import { appConfig } from "@/config/app";
import { tenantRoles, requireTenantRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createProjectSchema } from "@/lib/validators/project";
import { createAuditLog } from "@/server/services/audit-log";
import { createSecurityEvent } from "@/server/services/security-events";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    const { membership } = await requireTenantRole(tenantRoles.MEMBER, tenantSlug);

    const projects = await prisma.project.findMany({
      where: {
        tenantId: membership.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  let tenantSlug = "unknown";

  try {
    ({ tenantSlug } = await context.params);
    const verifiedSession = await requireVerifiedUser();
    const { session, membership } = await requireTenantRole(tenantRoles.MANAGER, tenantSlug);

    assertSameOrigin(request);

    if (verifiedSession.user.id !== session.user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await enforceRateLimit({
      scope: "project:create",
      key: `${membership.tenantId}:${session.user.id}`,
      limit: appConfig.security.rateLimitMaxRequests,
      windowSeconds: appConfig.security.rateLimitWindowSeconds,
    });

    const json = await request.json();
    const parsed = createProjectSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const name = sanitizeText(parsed.data.name);
    const description = sanitizeNullableText(parsed.data.description);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const project = await prisma.project.create({
      data: {
        tenantId: membership.tenantId,
        name,
        slug,
        description,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    await createAuditLog({
      action: "project.created",
      targetType: "project",
      targetId: project.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        tenantSlug,
        projectSlug: project.slug,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message === "UNAUTHENTICATED") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      if (error.message === "EMAIL_NOT_VERIFIED") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message === "CSRF_VALIDATION_FAILED") {
        await createSecurityEvent({
          event: "csrf_validation_failed",
          severity: "high",
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent"),
          metadata: {
            tenantSlug,
            path: request.url,
          },
        });
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message === "RATE_LIMIT_EXCEEDED") {
        await createSecurityEvent({
          event: "project_create_rate_limited",
          severity: "medium",
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent"),
          metadata: {
            tenantSlug,
          },
        });
        return NextResponse.json({ error: error.message }, { status: 429 });
      }

      if (error.message === "TENANT_SUSPENDED") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
