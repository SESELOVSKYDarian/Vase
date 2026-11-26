import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../lib/db";
import { decryptChannelSecret } from "../../../../lib/channel-secrets";
import { fetchBusinessProfile, formatBusinessProfileContext } from "../../../../lib/business-profile";
import { labsEntitlementsService } from "../../../../lib/labs-entitlements-service";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import {
  MARKETING_MAX_PROMPT,
  buildMarketingPrompt,
  generateMarketingImage,
  publicImageUrl,
  marketingErrorCode,
  MarketingImageError,
  isMarketingFormat,
} from "../../../../lib/marketing-images";

export const dynamic = "force-dynamic";
export const maxDuration = 150;

// Cada imagen cuesta: como mucho 20 por hora por cuenta, para que un clic repetido no gaste el plan.
const HOURLY_LIMIT = 20;
const recent = new Map<string, number[]>();

function allow(tenantId: string) {
  const now = Date.now();
  const list = (recent.get(tenantId) ?? []).filter((at) => now - at < 60 * 60_000);
  if (list.length >= HOURLY_LIMIT) return false;
  list.push(now);
  recent.set(tenantId, list);
  return true;
}

/** Marketing: crea una imagen con IA a partir de lo que pide el dueño (y, si quiere, un producto). */
export async function POST(request: Request) {
  let context;
  try {
    context = await resolveLabsRequestContext(request.headers.get("cookie"));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { assistant } = context;
  const globalTenantId = assistant.globalTenantId;

  const body = (await request.json().catch(() => null)) as { prompt?: unknown; format?: unknown; productId?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 3) return NextResponse.json({ error: "PROMPT_REQUIRED" }, { status: 400 });
  if (prompt.length > MARKETING_MAX_PROMPT) return NextResponse.json({ error: "PROMPT_TOO_LONG" }, { status: 400 });
  const format = isMarketingFormat(body?.format) ? body.format : "post";
  const productId = typeof body?.productId === "string" && /^[A-Za-z0-9_-]{6,40}$/.test(body.productId) ? body.productId : null;

  const entitlement = await labsEntitlementsService.getEntitlement(globalTenantId).catch(() => null);
  const budget = (entitlement?.aiBudgetMicros ?? 0) + (entitlement?.extraAiBudgetMicros ?? 0);
  if (
    entitlement
    && (!["ACTIVE", "TRIAL"].includes(entitlement.status) || (budget > 0 && (entitlement.aiBudgetUsedMicros ?? 0) >= budget))
  ) {
    return NextResponse.json({ error: "AI_BUDGET_UNAVAILABLE" }, { status: 402 });
  }
  if (!allow(globalTenantId)) return NextResponse.json({ error: "TOO_MANY_IMAGES" }, { status: 429 });

  let apiKey = process.env.OPENAI_API_KEY ?? "";
  const secret = await labsPrisma.assistantSecret.findUnique({
    where: { assistantId_kind: { assistantId: assistant.id, kind: "OPENAI_API_KEY" } },
    select: { encryptedValue: true },
  });
  if (secret?.encryptedValue && process.env.TOKEN_ENCRYPTION_SECRET?.trim()) {
    try {
      apiKey = decryptChannelSecret(secret.encryptedValue, process.env.TOKEN_ENCRYPTION_SECRET.trim());
    } catch {
      // queda la clave general
    }
  }
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY_MISSING" }, { status: 503 });

  const product = productId
    ? await labsPrisma.catalogProduct.findFirst({
        where: { id: productId, globalTenantId, active: true },
        select: { name: true, price: true, description: true, aiDescription: true, imageUrl: true },
      })
    : null;

  // Foto real del producto y logo del negocio: van como imágenes de referencia para que la pieza los respete.
  const profile = await fetchBusinessProfile(globalTenantId).catch(() => null);
  const productImage = publicImageUrl(product?.imageUrl);
  const logo = publicImageUrl(profile?.logoUrl);

  try {
    const image = await generateMarketingImage({
      apiKey,
      format,
      referenceImages: [productImage, logo].filter((url): url is string => Boolean(url)),
      prompt: buildMarketingPrompt({
        request: prompt,
        format,
        businessName: context.context.tenantName,
        businessContext: formatBusinessProfileContext(profile),
        product: product
          ? { name: product.name, price: product.price == null ? null : Number(product.price), description: product.aiDescription ?? product.description }
          : null,
        hasProductImage: Boolean(productImage),
        hasLogo: Boolean(logo),
      }),
    });
    await labsEntitlementsService.registerTokenUsage(globalTenantId, {
      channel: "WHATSAPP",
      inputTokens: image.inputTokens,
      outputTokens: image.outputTokens,
      assistantId: assistant.id,
      model: image.model,
      source: `openai:${image.model}:marketing-image`,
    }).catch(() => undefined);
    return NextResponse.json({ image: image.dataUrl, format });
  } catch (error) {
    // El motivo real queda en el registro del servicio; a la pantalla va un código que sabe explicar.
    const code = marketingErrorCode(error);
    const detail = error instanceof MarketingImageError ? `status=${error.status} code=${error.code ?? "-"} ${error.detail ?? ""}` : error instanceof Error ? error.message : String(error);
    console.error(`[marketing-image:failed] tenant=${globalTenantId} ${code} ${detail}`.slice(0, 600));
    return NextResponse.json({ error: code }, { status: 502 });
  }
}
