import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole, platformRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { updateAdminModuleSchema } from "@/lib/validators/admin";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = updateAdminModuleSchema.safeParse({
      moduleId: id,
      name: body.name,
      description: body.description,
      route: body.route,
      isActive: body.isActive,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updatedModule = await prisma.module.update({
      where: { id: parsed.data.moduleId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    return NextResponse.json({ module: updatedModule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
