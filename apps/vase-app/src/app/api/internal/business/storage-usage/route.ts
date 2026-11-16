import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { recordStorageUsage } from "@/server/services/business-storage";

// Ruta interna: Vase Business informa cuánto ocupa la web de una cuenta. La respuesta le dice
// si la web llegó al tope del plan, para que deje de aceptar subidas.
const size = z.number().finite().min(0);
const bodySchema = z.object({
  tenantId: z.string().trim().min(1).max(64),
  imageCount: size,
  totalBytes: size,
  breakdown: z.object({ images: size, catalog: size, orders: size, design: size }),
  lastBackupAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastBackupBytes: size.optional(),
});

export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const body = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: body.tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });

  const result = await recordStorageUsage(tenant.id, {
    imageCount: Math.round(body.imageCount),
    totalBytes: body.totalBytes,
    breakdown: body.breakdown,
    lastBackupAt: body.lastBackupAt ? new Date(body.lastBackupAt) : null,
    lastBackupBytes: body.lastBackupBytes ?? 0,
  });
  return NextResponse.json({ ok: true, ...result });
}
