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

/**
 * Modelo de OpenAI que arma la imagen. Se usa la API de Responses con la herramienta de imágenes:
 * así anda con la misma clave y no depende de un modelo de imágenes que OpenAI dé de baja
 * (gpt-image-1 dejó de existir). Se puede cambiar con OPENAI_MARKETING_MODEL.
 */
export function marketingImageModel(env: NodeJS.ProcessEnv = process.env) {
  return env.OPENAI_MARKETING_MODEL?.trim() || "gpt-5-mini";
}

/** Tokens que se anotan por cada imagen mediana (la herramienta de imágenes no los informa aparte). */
const IMAGE_OUTPUT_TOKENS_ESTIMATE = 1056;

/** Error de OpenAI al crear la imagen, con el código HTTP y el motivo que devolvió. */
export class MarketingImageError extends Error {
  constructor(readonly status: number, readonly code: string | null, readonly detail: string | null) {
    super(`OPENAI_IMAGE_${status}`);
  }
}

/** Traduce el error de OpenAI a un código que la pantalla sabe explicar. */
export function marketingErrorCode(error: unknown) {
  if (error instanceof MarketingImageError) {
    if (error.status === 401) return "OPENAI_KEY_INVALID";
    if (error.status === 403) return "OPENAI_IMAGES_NOT_ALLOWED";
    if (error.status === 429) return "OPENAI_QUOTA";
    if (error.status === 400 && /safety|moderation|content_policy/i.test(`${error.code} ${error.detail}`)) return "CONTENT_BLOCKED";
  }
  if (error instanceof Error && error.name === "TimeoutError") return "IMAGE_TIMEOUT";
  return "MARKETING_IMAGE_FAILED";
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
  const response = await (input.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      input: input.prompt,
      tools: [{ type: "image_generation", size: MARKETING_FORMATS[input.format].size, quality: "medium" }],
      // Siempre tiene que devolver una imagen, no una respuesta de texto.
      tool_choice: { type: "image_generation" },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    // Guardamos el motivo que da OpenAI (sin la clave) para saber qué pasó: permisos, saldo, contenido…
    const detail = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | null;
    throw new MarketingImageError(response.status, detail?.error?.code ?? null, detail?.error?.message ?? null);
  }
  const payload = (await response.json()) as {
    output?: Array<{ type?: string; result?: string | null }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const base64 = payload.output?.find((item) => item.type === "image_generation_call" && item.result)?.result;
  if (!base64) throw new Error("OPENAI_IMAGE_EMPTY");
  return {
    dataUrl: `data:image/png;base64,${base64}`,
    // Para el gasto del plan se cuenta como una imagen (precio de imágenes), más el texto que leyó el modelo.
    model: "gpt-image-1",
    inputTokens: Number(payload.usage?.input_tokens ?? 0),
    outputTokens: Number(payload.usage?.output_tokens ?? 0) + IMAGE_OUTPUT_TOKENS_ESTIMATE,
  };
}
