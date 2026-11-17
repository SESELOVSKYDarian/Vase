// Presupuestos que arma la IA en una conversación: precios del catálogo, link firmado al PDF y el texto del chat.
import { createHmac, timingSafeEqual } from "node:crypto";

export const QUOTE_VALID_DAYS = 7;

export type QuoteCatalogProduct = {
  externalProductId: string;
  sku: string | null;
  name: string;
  price: unknown;
};

export type QuoteLine = {
  productId: string;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type BuiltQuote = {
  lines: QuoteLine[];
  /** Productos pedidos que no están en el catálogo o no tienen precio cargado. */
  missing: string[];
  subtotal: number;
  total: number;
};

/** Lo que se guarda en el mensaje de la IA para mostrar el presupuesto en Conversaciones. */
export type QuoteMessageMeta = {
  id: string;
  number: number;
  currency: string;
  total: number;
  validUntil: string;
  url: string;
  lines: Array<{ name: string; quantity: number; total: number }>;
};

function toAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value?.toString?.() ?? value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

export function buildQuoteLines(
  items: Array<{ productId: string; quantity: number }>,
  products: QuoteCatalogProduct[],
): BuiltQuote {
  const byId = new Map(products.map((product) => [product.externalProductId, product]));
  const merged = new Map<string, number>();
  for (const item of items) {
    const quantity = Math.max(1, Math.min(9999, Math.floor(item.quantity)));
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + quantity);
  }
  const lines: QuoteLine[] = [];
  const missing: string[] = [];
  for (const [productId, quantity] of merged) {
    const product = byId.get(productId);
    const unitPrice = product ? toAmount(product.price) : null;
    if (!product || unitPrice === null) {
      // Nunca se le muestra al cliente un ID interno.
      missing.push(product?.name ?? "un producto que no está en el catálogo");
      continue;
    }
    lines.push({
      productId,
      sku: product.sku,
      name: product.name,
      quantity,
      unitPrice,
      total: Math.round(unitPrice * quantity * 100) / 100,
    });
  }
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.total, 0) * 100) / 100;
  return { lines, missing, subtotal, total: subtotal };
}

export function formatQuoteMoney(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

function quoteSecret(env: NodeJS.ProcessEnv) {
  const secret = env.TOKEN_ENCRYPTION_SECRET?.trim() || env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("QUOTE_SIGNING_SECRET_MISSING");
  return secret;
}

function signature(id: string, env: NodeJS.ProcessEnv) {
  return createHmac("sha256", quoteSecret(env)).update(`vase-labs-quote:${id}`).digest("base64url").slice(0, 32);
}

/** Token público del PDF: el id del presupuesto y una firma. Sin la firma no se puede ver. */
export function signQuoteToken(id: string, env: NodeJS.ProcessEnv = process.env) {
  return `${id}.${signature(id, env)}`;
}

export function verifyQuoteToken(token: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const [id, provided, ...rest] = token.split(".");
  if (!id || !provided || rest.length || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  let expected: string;
  try {
    expected = signature(id, env);
  } catch {
    return null;
  }
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right) ? id : null;
}

export function quotePublicUrl(input: { id: string; number: number }, env: NodeJS.ProcessEnv = process.env) {
  let origin = "https://labs.vase.ar";
  try {
    const configured = env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured) origin = new URL(configured).origin;
  } catch {
    // queda el dominio de Labs
  }
  return `${origin}/api/public/quotes/${signQuoteToken(input.id, env)}/presupuesto-${input.number}.pdf`;
}

export function quoteFileName(number: number) {
  return `Presupuesto ${String(number).padStart(4, "0")}.pdf`;
}

/** Texto que acompaña al PDF en el chat. */
export function quoteChatText(input: {
  number: number;
  total: number;
  currency: string;
  validUntil: Date;
  missing: string[];
  includesLink: boolean;
  url: string;
}) {
  const until = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(input.validUntil);
  return [
    `Te paso el presupuesto N.º ${String(input.number).padStart(4, "0")}. Total: ${formatQuoteMoney(input.total, input.currency)}. Vale hasta el ${until}.`,
    input.missing.length
      ? `De ${input.missing.join(", ")} no tengo el precio cargado: ya le aviso al equipo para que te lo confirme.`
      : null,
    input.includesLink ? `Podés verlo acá: ${input.url}` : null,
    "Si querés avanzar, decime cómo lo recibís (envío o retiro) y te lo dejo listo.",
  ].filter(Boolean).join("\n");
}

/** Cuando ningún producto tiene precio cargado no se arma un PDF vacío. */
export function quoteUnavailableText(missing: string[]) {
  const named = missing.filter((name) => !name.startsWith("un producto que no"));
  return named.length
    ? `No tengo cargado el precio de ${named.join(", ")}. Ya le aviso al equipo para que te pase el presupuesto enseguida.`
    : "No encontré esos productos en el catálogo. Ya le aviso al equipo para que te pase el presupuesto enseguida.";
}

export function readQuoteMessageMeta(metadata: unknown): QuoteMessageMeta | null {
  const quote = (metadata as { quote?: unknown } | null)?.quote as Partial<QuoteMessageMeta> | undefined;
  if (!quote || typeof quote.id !== "string" || typeof quote.number !== "number" || typeof quote.url !== "string") return null;
  return {
    id: quote.id,
    number: quote.number,
    currency: typeof quote.currency === "string" ? quote.currency : "ARS",
    total: typeof quote.total === "number" ? quote.total : 0,
    validUntil: typeof quote.validUntil === "string" ? quote.validUntil : "",
    url: quote.url,
    lines: Array.isArray(quote.lines)
      ? quote.lines.flatMap((line) =>
          line && typeof line.name === "string" && typeof line.quantity === "number" && typeof line.total === "number"
            ? [{ name: line.name, quantity: line.quantity, total: line.total }]
            : [])
      : [],
  };
}
