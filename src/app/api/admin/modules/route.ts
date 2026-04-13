import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole, platformRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { createAdminModuleSchema } from "@/lib/validators/admin";
import { getAdminModulesCatalog } from "@/server/queries/modules-admin";
import { ensureModuleCatalogSynced } from "@/server/services/modules";

export async function GET() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const modules = await getAdminModulesCatalog();
    return NextResponse.json({ modules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    await ensureModuleCatalogSynced();
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = createAdminModuleSchema.safeParse({
      id: body.id,
      name: body.name,
      description: body.description,
      product: body.product,
      route: body.route,
      isActive: body.isActive,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const createdModule = await prisma.module.create({
      data: parsed.data,
    });

    return NextResponse.json({ module: createdModule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
