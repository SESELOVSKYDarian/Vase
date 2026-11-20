import { POST as handleMercadoPagoNotification } from "../../../webhooks/mercadopago/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMercadoPagoNotification(request);
}
