import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole, platformRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { updateAdminModulePricingSchema } from "@/lib/validators/admin";
import { normalizePricingType } from "@/server/services/modules";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = updateAdminModulePricingSchema.safeParse({
      moduleId: id,
      price: body.price,
      currency: body.currency,
      type: body.type,
      isActive: body.isActive,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const pricing = await prisma.$transaction(async (tx) => {
      await tx.modulePricing.updateMany({
        where: {
          moduleId: parsed.data.moduleId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.modulePricing.create({
        data: {
          moduleId: parsed.data.moduleId,
          price: parsed.data.price,
          currency: parsed.data.currency,
          type: normalizePricingType(parsed.data.type),
          isActive: parsed.data.isActive,
        },
      });
    });

    return NextResponse.json({ pricing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
