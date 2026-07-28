import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { assertServiceToken } from "@vase/internal-api";
import { restSupportRequestSchema } from "@vase/contracts";
import { db } from "../../../../lib/db";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifySignature(input: {
  body: string;
  timestamp: string;
  requestId: string;
  signature: string;
}) {
  const secret = process.env.WORKPLACE_SUPPORT_SIGNING_SECRET ?? "";
  if (secret.length < 24) throw new Error("WORKPLACE_SUPPORT_NOT_CONFIGURED");
  const time = new Date(input.timestamp);
  if (
    Number.isNaN(time.getTime()) ||
    Math.abs(Date.now() - time.getTime()) > 5 * 60_000
  ) throw new Error("WORKPLACE_SUPPORT_TIMESTAMP_INVALID");
  const expected = createHmac("sha256", secret)
    .update(`${input.timestamp}.${input.requestId}.${input.body}`)
    .digest("base64url");
  if (!safeEqual(expected, input.signature)) {
    throw new Error("WORKPLACE_SUPPORT_SIGNATURE_INVALID");
  }
}

export async function POST(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );
    const body = await request.text();
    const requestId = request.headers.get("x-vase-request-id") ?? "";
    verifySignature({
      body,
      requestId,
      timestamp: request.headers.get("x-vase-timestamp") ?? "",
      signature: request.headers.get("x-vase-signature") ?? "",
    });
    const payload = restSupportRequestSchema.parse(JSON.parse(body));
    if (payload.requestId !== requestId) {
      throw new Error("WORKPLACE_SUPPORT_REQUEST_ID_INVALID");
    }
    const existing = await db.supportRequestReceipt.findUnique({
      where: { requestId },
      include: { ticket: { select: { id: true, status: true } } },
    });
    if (existing) return NextResponse.json({
      ticketId: existing.ticket.id,
      status: existing.ticket.status,
    });
    const ticket = await db.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          globalTenantId: payload.globalTenantId,
          title: payload.title,
          description: [
            payload.description,
            "",
            `Producto: Vase Rest`,
            `Categoría: ${payload.category}`,
            `Sucursal: ${payload.branchId ?? "tenant"}`,
            `Solicitante: ${payload.requester.displayName}`,
            `Ruta: ${payload.context.route ?? "no informada"}`,
            `Edge: ${payload.context.edgeInstallationId ?? "no informado"}`,
            `Versión: ${payload.context.appVersion}`,
          ].join("\n"),
          priority: payload.priority,
          source: "VASE_REST",
        },
        select: { id: true, status: true },
      });
      await tx.supportRequestReceipt.create({
        data: { requestId, ticketId: created.id },
      });
      return created;
    });
    return NextResponse.json({
      ticketId: ticket.id,
      status: ticket.status,
    }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error
      ? error.message : "WORKPLACE_SUPPORT_FAILED";
    return NextResponse.json({ error: code }, {
      status: code === "UNAUTHORIZED" ? 401
        : code.includes("SIGNATURE") || code.includes("TIMESTAMP") ? 403
          : code.includes("NOT_CONFIGURED") ? 503 : 400,
    });
  }
}
