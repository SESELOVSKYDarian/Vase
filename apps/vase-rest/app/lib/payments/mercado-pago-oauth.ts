import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

const stateSchema = z.object({
  tenant: z.string().min(1),
  branch: z.string().min(1),
  environment: z.enum(["SANDBOX", "PRODUCTION"]),
  nonce: z.string().min(16),
  exp: z.number().int(),
}).strict();

export function createMercadoPagoOAuth(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  stateSecret: string;
  fetcher?: typeof fetch;
}) {
  if (
    !input.clientId ||
    !input.clientSecret ||
    !input.redirectUri ||
    input.stateSecret.length < 24
  ) throw new Error("REST_MP_OAUTH_NOT_CONFIGURED");
  return {
    authorize(params: {
      tenant: string;
      branch: string;
      environment: "SANDBOX" | "PRODUCTION";
    }) {
      const verifier = randomBytes(48).toString("base64url");
      const statePayload = {
        ...params,
        nonce: randomBytes(18).toString("base64url"),
        exp: Math.floor(Date.now() / 1000) + 10 * 60,
      };
      const encoded = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
      const signature = createHmac("sha256", input.stateSecret)
        .update(encoded).digest("base64url");
      const url = new URL("https://auth.mercadopago.com/authorization");
      url.searchParams.set("client_id", input.clientId);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("platform_id", "mp");
      url.searchParams.set("redirect_uri", input.redirectUri);
      url.searchParams.set("state", `${encoded}.${signature}`);
      url.searchParams.set(
        "code_challenge",
        createHash("sha256").update(verifier).digest("base64url"),
      );
      url.searchParams.set("code_challenge_method", "S256");
      return { url: url.toString(), verifier };
    },
    verifyState(state: string) {
      const [encoded, signature] = state.split(".");
      if (!encoded || !signature) throw new Error("REST_MP_OAUTH_STATE_INVALID");
      const expected = Buffer.from(createHmac("sha256", input.stateSecret)
        .update(encoded).digest("base64url"));
      const received = Buffer.from(signature);
      if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        throw new Error("REST_MP_OAUTH_STATE_INVALID");
      }
      const payload = stateSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString()));
      if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("REST_MP_OAUTH_STATE_EXPIRED");
      return payload;
    },
    async exchange(params: { code: string; verifier: string; sandbox: boolean }) {
      const response = await (input.fetcher ?? fetch)(
        "https://api.mercadopago.com/oauth/token",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_id: input.clientId,
            client_secret: input.clientSecret,
            code: params.code,
            code_verifier: params.verifier,
            grant_type: "authorization_code",
            redirect_uri: input.redirectUri,
            test_token: params.sandbox,
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("REST_MP_OAUTH_EXCHANGE_FAILED");
      return z.object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1).optional(),
        user_id: z.union([z.string(), z.number()]),
        expires_in: z.number().int().positive(),
      }).passthrough().parse(payload);
    },
  };
}

export function mercadoPagoOAuthFromEnvironment() {
  return createMercadoPagoOAuth({
    clientId: process.env.MERCADO_PAGO_CLIENT_ID ?? "",
    clientSecret: process.env.MERCADO_PAGO_CLIENT_SECRET ?? "",
    redirectUri: process.env.MERCADO_PAGO_REDIRECT_URI ?? "",
    stateSecret: process.env.REST_MP_OAUTH_STATE_SECRET ?? "",
  });
}
