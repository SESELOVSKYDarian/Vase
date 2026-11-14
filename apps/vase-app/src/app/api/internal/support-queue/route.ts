import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { autoAssignSupportTicket } from "@/server/services/support-queue";

// Ruta interna: crea un ticket en la cola de soporte de una cuenta. Solo con el token de servicio,
// porque antes cualquiera podía crear tickets en cualquier cuenta sin iniciar sesión.
const bodySchema = z.object({
  tenantId: z.string().trim().min(1).max(64),
  subject: z.string().trim().min(1).max(200),
  customerName: z.string().trim().max(160).optional(),
  customerContact: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "tenantId y subject son requeridos." }, { status: 400 });
    }
    const body = parsed.data;
    const tenant = await prisma.tenant.findUnique({ where: { id: body.tenantId }, select: { id: true } });
    if (!tenant) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });

    const created = await prisma.supportTicket.create({
      data: {
        tenantId: body.tenantId,
        source: "MANUAL",
        assignmentMode: "AUTOMATIC",
        status: "QUEUED",
        subject: body.subject,
        customerName: body.customerName ?? null,
        customerContact: body.customerContact ?? null,
        aiSummary: body.summary ?? null,
      },
    });

    const assignment = await autoAssignSupportTicket(created.id, body.tenantId);
    return NextResponse.json({
      ticketId: created.id,
      assigned: assignment.assigned,
      assignedUserId: assignment.assigned ? assignment.assignedUserId : null,
    });
  } catch {
    return NextResponse.json({ error: "No pudimos crear el ticket de cola." }, { status: 500 });
  }
}
