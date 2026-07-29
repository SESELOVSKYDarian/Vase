import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { prismaFiscalRepository } from "@/lib/fiscal/fiscal-repository";
import { createFiscalService } from "@/lib/fiscal/fiscal-service";
import { fiscalQrUrl } from "@/lib/fiscal/fiscal-mapping";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const service = createFiscalService(prismaFiscalRepository);

export async function GET(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const documents = await db.fiscalDocument.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      documents: documents.map((document) => ({
        ...document,
        total: document.total.toFixed(2),
        net: document.net.toFixed(2),
        vat: document.vat.toFixed(2),
        qrUrl: document.qrPayload
          ? fiscalQrUrl(document.qrPayload as Record<string, unknown>)
          : null,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const input = z.object({
      orderId: z.string().min(1),
      documentType: z.enum([
        "INVOICE_A", "INVOICE_B", "INVOICE_C",
        "CREDIT_NOTE_A", "CREDIT_NOTE_B", "CREDIT_NOTE_C",
        "DEBIT_NOTE_A", "DEBIT_NOTE_B", "DEBIT_NOTE_C",
      ]),
      recipientDocType: z.number().int().positive(),
      recipientDocNumber: z.string().regex(/^\d{1,11}$/),
      commandId: z.string().min(1),
    }).strict().parse(await request.json());
    const document = await service.issue({
      ...input,
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_FISCAL_DOCUMENT_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("PENDING") ? 409 : 400,
  });
}
