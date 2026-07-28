import { NextResponse } from "next/server";
import { prismaDeliveryWebhookRepository } from "@/lib/delivery/delivery-repository";
import { createDeliveryWebhookService } from "@/lib/delivery/webhook-service";

const service = createDeliveryWebhookService(prismaDeliveryWebhookRepository);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  try {
    const { connectionId } = await params;
    const result = await service.accept({
      connectionId,
      rawBody: await request.text(),
      headers: Object.fromEntries(request.headers.entries()),
    });
    return NextResponse.json({ result });
  } catch (error) {
    const code = error instanceof Error
      ? error.message : "REST_DELIVERY_WEBHOOK_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("INACTIVE") || code.includes("CERTIFICATION") ? 409
        : code.includes("SIGNATURE") || code.includes("STALE") ? 401 : 400,
    });
  }
}
