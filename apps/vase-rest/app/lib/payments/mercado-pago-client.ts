import { z } from "zod";

const orderSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  status_detail: z.string().optional(),
  type_response: z.object({ qr_data: z.string().optional() }).passthrough().optional(),
  transactions: z.object({
    payments: z.array(z.object({
      id: z.string().min(1),
      amount: z.string(),
      status: z.string(),
    }).passthrough()).optional(),
  }).passthrough().optional(),
}).passthrough();

export function createMercadoPagoClient(input: {
  accessToken: string;
  fetcher?: typeof fetch;
  baseUrl?: string;
}) {
  if (!input.accessToken) throw new Error("REST_MP_ACCESS_TOKEN_REQUIRED");
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = input.baseUrl ?? "https://api.mercadopago.com";
  async function request(path: string, options?: {
    method?: string;
    idempotencyKey?: string;
    body?: unknown;
  }) {
    let response: Response;
    try {
      response = await fetcher(new URL(path, baseUrl), {
        method: options?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
          ...(options?.idempotencyKey
            ? { "X-Idempotency-Key": options.idempotencyKey }
            : {}),
        },
        body: options?.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error("REST_MP_RESPONSE_AMBIGUOUS");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = typeof payload?.code === "string" ? payload.code : String(response.status);
      throw new Error(`REST_MP_PROVIDER_ERROR:${code}`);
    }
    return orderSchema.parse(payload);
  }
  return {
    createPointOrder(order: {
      idempotencyKey: string;
      externalReference: string;
      amount: string;
      terminalId: string;
      description: string;
    }) {
      return request("/v1/orders", {
        method: "POST",
        idempotencyKey: order.idempotencyKey,
        body: {
          type: "point",
          external_reference: order.externalReference,
          expiration_time: "PT16M",
          transactions: { payments: [{ amount: order.amount }] },
          config: {
            point: {
              terminal_id: order.terminalId,
              print_on_terminal: "no_ticket",
            },
          },
          description: order.description.slice(0, 150),
        },
      });
    },
    createQrOrder(order: {
      idempotencyKey: string;
      externalReference: string;
      amount: string;
      mode: "dynamic" | "hybrid" | "static";
      externalPosId?: string;
      description: string;
    }) {
      return request("/v1/orders", {
        method: "POST",
        idempotencyKey: order.idempotencyKey,
        body: {
          type: "qr",
          total_amount: order.amount,
          external_reference: order.externalReference,
          description: order.description.slice(0, 150),
          config: {
            qr: {
              mode: order.mode,
              ...(order.externalPosId ? { external_pos_id: order.externalPosId } : {}),
            },
          },
          transactions: { payments: [{ amount: order.amount }] },
        },
      });
    },
    getOrder(orderId: string) {
      return request(`/v1/orders/${encodeURIComponent(orderId)}`);
    },
    cancelOrder(orderId: string, idempotencyKey: string) {
      return request(`/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        idempotencyKey,
        body: {},
      });
    },
    refundOrder(orderId: string, idempotencyKey: string, body?: unknown) {
      return request(`/v1/orders/${encodeURIComponent(orderId)}/refund`, {
        method: "POST",
        idempotencyKey,
        body: body ?? {},
      });
    },
  };
}

