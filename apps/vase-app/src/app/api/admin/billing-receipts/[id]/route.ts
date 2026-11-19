import { NextResponse } from "next/server";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** El archivo de un comprobante de transferencia. Solo Admin con permiso de facturación. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const { id } = await params;
  if (!id || id.length > 64) return new NextResponse(null, { status: 404 });
  const receipt = await prisma.transferReceipt.findUnique({
    where: { id },
    select: { data: true, contentType: true, fileName: true },
  });
  if (!receipt) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(receipt.data), {
    headers: {
      "Content-Type": receipt.contentType,
      "Content-Disposition": `inline; filename="${receipt.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      // El tipo se validó por el contenido al subirlo (foto o PDF): con nosniff nunca se interpreta como página.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
