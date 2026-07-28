import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { encryptSecret } from "@/lib/secrets/encryption";
import { readSecretKeyring } from "@/lib/secrets/keyring";
import { mercadoPagoOAuthFromEnvironment } from "@/lib/payments/mercado-pago-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const oauth = mercadoPagoOAuthFromEnvironment();
    const state = oauth.verifyState(url.searchParams.get("state") ?? "");
    const context = await resolveRestOwnerRequest({
      cookieHeader: request.headers.get("cookie"),
    });
    if (context.globalTenantId !== state.tenant) throw new Error("REST_MP_OAUTH_TENANT_MISMATCH");
    const verifier = request.headers.get("cookie")?.match(
      /(?:^|;\s*)vase-rest-mp-pkce=([^;]+)/,
    )?.[1];
    if (!verifier) throw new Error("REST_MP_OAUTH_VERIFIER_MISSING");
    const token = await oauth.exchange({
      code: url.searchParams.get("code") ?? "",
      verifier: decodeURIComponent(verifier),
      sandbox: state.environment === "SANDBOX",
    });
    const tenant = await db.restTenant.findUniqueOrThrow({
      where: { globalTenantId: state.tenant },
    });
    const keyring = readSecretKeyring();
    const secret = (value: string, field: string) => encryptSecret({
      plaintext: value,
      context: `${state.tenant}:${state.branch}:mercado-pago:${field}`,
      keyVersion: keyring.activeVersion,
      key: keyring.keys[keyring.activeVersion]!,
    });
    await db.paymentProviderConnection.upsert({
      where: { branchId_provider: { branchId: state.branch, provider: "MERCADO_PAGO" } },
      create: {
        restTenantId: tenant.id,
        globalTenantId: state.tenant,
        branchId: state.branch,
        provider: "MERCADO_PAGO",
        status: state.environment === "SANDBOX" ? "SANDBOX" : "ACTIVE",
        environment: state.environment,
        providerAccountId: String(token.user_id),
        accessTokenCiphertext: secret(token.access_token, "access"),
        refreshTokenCiphertext: token.refresh_token ? secret(token.refresh_token, "refresh") : null,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        config: {},
      },
      update: {
        status: state.environment === "SANDBOX" ? "SANDBOX" : "ACTIVE",
        environment: state.environment,
        providerAccountId: String(token.user_id),
        accessTokenCiphertext: secret(token.access_token, "access"),
        refreshTokenCiphertext: token.refresh_token ? secret(token.refresh_token, "refresh") : null,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    });
    const response = NextResponse.redirect(new URL("/owner/settings/payments?connected=1", url));
    response.cookies.delete("vase-rest-mp-pkce");
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "REST_MP_OAUTH_FAILED",
    }, { status: 400 });
  }
}
