import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma de los avisos (webhooks) de Mercado Pago. El encabezado x-signature trae "ts=<timestamp>,v1=<hmac>".
 * Se firma "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con la clave secreta de Webhooks de la app
 * (no es el Access Token). data.id sale de la URL y, si es alfanumérico, va en minúsculas.
 * Una parte que no vino se omite del texto firmado.
 */
export function parseSignatureHeader(header: string | null | undefined) {
  let ts = "";
  let v1 = "";
  for (const part of String(header ?? "").split(",")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function buildSignatureManifest(input: { dataId?: string | null; requestId?: string | null; ts: string }) {
  const dataId = input.dataId ? (/^[a-z0-9]+$/i.test(input.dataId) ? input.dataId.toLowerCase() : input.dataId) : "";
  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  if (input.requestId) manifest += `request-id:${input.requestId};`;
  manifest += `ts:${input.ts};`;
  return manifest;
}

export function isValidMercadoPagoSignature(input: {
  secret: string;
  signatureHeader: string | null | undefined;
  requestId: string | null | undefined;
  dataId: string | null | undefined;
}) {
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!input.secret || !parsed || !/^[0-9a-f]{64}$/i.test(parsed.v1)) return false;

  const manifest = buildSignatureManifest({ dataId: input.dataId, requestId: input.requestId, ts: parsed.ts });
  const expected = createHmac("sha256", input.secret).update(manifest).digest();
  const received = Buffer.from(parsed.v1, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
