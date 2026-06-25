import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import {
  handleWhatsAppMetaWebhook,
  PrismaWhatsAppWebhookRepository,
  verifyWhatsAppWebhookSubscription,
} from "../../../../../../../lib/whatsapp-webhook-service";

export const dynamic = "force-dynamic";

const repository = new PrismaWhatsAppWebhookRepository(labsPrisma);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const result = await verifyWhatsAppWebhookSubscription({
    repository,
    tenantSlug,
    url: request.url,
  });

  return new NextResponse(result.body, { status: result.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const rawBody = await request.text();
  const result = await handleWhatsAppMetaWebhook({
    repository,
    tenantSlug,
    rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256"),
  });

  return NextResponse.json(result.body, { status: result.status });
}
