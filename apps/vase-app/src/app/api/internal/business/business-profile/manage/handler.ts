import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { notifyBusinessProfileChanged } from "@/server/services/business-profile";
import {
  deleteBusinessBranch,
  saveBusinessBranch,
  updateBusinessContact,
  type BusinessEditResult,
} from "@/server/services/business-profile-edit";

// Editar Mi negocio desde otro producto (Labs). Solo con el token interno y solo si quien lo pide
// es Dueño activo de esa cuenta: el producto no decide permisos, los decide app.

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("contact"), data: z.record(z.string(), z.unknown()) }),
  z.object({
    action: z.literal("saveBranch"),
    data: z.object({
      id: z.string().max(40).optional(),
      name: z.string().max(200),
      address: z.string().max(300),
      phone: z.string().max(80).default(""),
      hours: z.string().max(200).default(""),
      isMain: z.boolean().default(false),
    }),
  }),
  z.object({ action: z.literal("deleteBranch"), data: z.object({ id: z.string().min(1).max(40) }) }),
]);

const envelopeSchema = z.object({
  globalTenantId: z.string().trim().min(1).max(64),
  actorUserId: z.string().trim().min(1).max(64),
});

type Dependencies = {
  authorize(authorization: string | null): void;
  isOwner(tenantId: string, userId: string): Promise<boolean>;
  run(tenantId: string, request: z.infer<typeof requestSchema>): Promise<BusinessEditResult>;
  afterChange(tenantId: string, userId: string, action: string): Promise<void>;
};

export function createBusinessProfileManageHandler(dependencies: Dependencies) {
  return async function POST(request: Request) {
    try {
      dependencies.authorize(request.headers.get("authorization"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "FORBIDDEN";
      return NextResponse.json(
        { error: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? message : "FORBIDDEN" },
        { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const envelope = envelopeSchema.safeParse(body);
    const parsed = requestSchema.safeParse(body);
    if (!envelope.success || !parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const { globalTenantId, actorUserId } = envelope.data;
    if (!(await dependencies.isOwner(globalTenantId, actorUserId))) {
      return NextResponse.json({ error: "OWNER_REQUIRED", message: "Solo el Dueño puede cambiar Mi negocio." }, { status: 403 });
    }

    try {
      const result = await dependencies.run(globalTenantId, parsed.data);
      if (result.ok) await dependencies.afterChange(globalTenantId, actorUserId, parsed.data.action);
      return NextResponse.json(result, { status: result.ok ? 200 : 422, headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ ok: false, message: "No pudimos guardar. Probá de nuevo." }, { status: 500 });
    }
  };
}

export const POST = createBusinessProfileManageHandler({
  authorize: (authorization) => assertServiceToken(authorization, process.env.SERVICE_TO_SERVICE_TOKEN),
  isOwner: async (tenantId, userId) =>
    Boolean(
      await prisma.membership.findFirst({
        where: { tenantId, userId, role: "OWNER", status: "ACTIVE" },
        select: { id: true },
      }),
    ),
  run: (tenantId, request) => {
    if (request.action === "contact") return updateBusinessContact(tenantId, request.data);
    if (request.action === "saveBranch") return saveBusinessBranch(tenantId, request.data);
    return deleteBusinessBranch(tenantId, request.data.id);
  },
  afterChange: async (tenantId, userId, action) => {
    notifyBusinessProfileChanged(tenantId);
    await createAuditLog({
      action: "tenant.business_profile_updated",
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      actorUserId: userId,
      metadata: { from: "labs", change: action },
    });
  },
});
