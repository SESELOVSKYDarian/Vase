import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { autoAssignSupportTicket } from "@/server/services/support-queue";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tenantId?: string;
      subject?: string;
      customerName?: string;
      customerContact?: string;
      summary?: string;
    };

    if (!body.tenantId || !body.subject) {
      return NextResponse.json({ error: "tenantId y subject son requeridos." }, { status: 400 });
    }

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
