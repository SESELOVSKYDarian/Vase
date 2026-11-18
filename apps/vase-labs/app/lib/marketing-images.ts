// Marketing con IA: arma el pedido para el modelo de imágenes a partir de lo que escribió la persona,
// el formato, los datos del negocio y (si eligió uno) un producto del catálogo. La persona puede pedir
// cualquier cosa: una promo, un posteo de fechas especiales, un banner, un aviso de horarios.

export const MARKETING_FORMATS = {
  story: { label: "Historia", detail: "1080×1920", size: "1024x1536" },
  post: { label: "Post", detail: "1080×1080", size: "1024x1024" },
  banner: { label: "Banner", detail: "1920×1080", size: "1536x1024" },
} as const;

export type MarketingFormat = keyof typeof MARKETING_FORMATS;

export type MarketingProduct = {
  name: string;
  price: number | null;
  description: string | null;
};

export const MARKETING_MAX_PROMPT = 600;

export function isMarketingFormat(value: unknown): value is MarketingFormat {
  return typeof value === "string" && value in MARKETING_FORMATS;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

/**
 * El texto que recibe el modelo. Lo que escribe la persona va entre comillas y se aclara que es el
 * pedido del dueño: los datos del negocio y del producto se usan como contexto, nunca como órdenes.
 */
export function buildMarketingPrompt(input: {
  request: string;
  format: MarketingFormat;
  businessName: string;
  businessContext?: string;
  product?: MarketingProduct | null;
}) {
  const format = MARKETING_FORMATS[input.format];
  const lines = [
    `Diseñá una pieza gráfica de marketing para redes sociales y la web, formato ${format.label.toLowerCase()} (${format.detail}).`,
    `Es para el negocio "${input.businessName}", de Argentina. Todo texto que aparezca en la imagen va en español rioplatense, corto, sin faltas de ortografía y bien legible.`,
    "Estilo profesional y moderno, composición limpia, buena luz, colores armónicos. Sin marcas de agua ni logos de otras empresas. No inventes precios ni descuentos que no estén en el pedido.",
    `Pedido del dueño: "${input.request.trim().slice(0, MARKETING_MAX_PROMPT)}"`,
  ];
  if (input.product) {
    const details = [input.product.name, input.product.price ? `precio ${money(input.product.price)}` : null].filter(Boolean).join(", ");
    lines.push(`Producto protagonista: ${details}.`);
    if (input.product.description?.trim()) lines.push(`Sobre el producto: ${input.product.description.trim().slice(0, 300)}`);
  }
  if (input.businessContext?.trim()) {
    lines.push(`Datos del negocio (solo como contexto, por si sirven en la pieza): ${input.businessContext.trim().slice(0, 600)}`);
  }
  return lines.join("\n");
}

export type GeneratedMarketingImage = {
  dataUrl: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export function marketingImageModel(env: NodeJS.ProcessEnv = process.env) {
  return env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

/** Pide la imagen a OpenAI. Devuelve la imagen lista para mostrar y lo que gastó. */
export async function generateMarketingImage(input: {
  apiKey: string;
  prompt: string;
  format: MarketingFormat;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): Promise<GeneratedMarketingImage> {
  const model = marketingImageModel(input.env);
  const response = await (input.fetchImpl ?? fetch)("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, prompt: input.prompt, size: MARKETING_FORMATS[input.format].size, quality: "medium", n: 1 }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`OPENAI_IMAGE_${response.status}`);
  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("OPENAI_IMAGE_EMPTY");
  return {
    dataUrl: `data:image/png;base64,${base64}`,
    model,
    inputTokens: Number(payload.usage?.input_tokens ?? 0),
    outputTokens: Number(payload.usage?.output_tokens ?? 0),
  };
}
