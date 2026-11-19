// Pago por transferencia a Vase: los datos de la cuenta salen de variables de entorno y el comprobante
// que sube el cliente se valida por su contenido real, no por lo que dice el navegador.

export type TransferDetails = {
  alias: string | null;
  cbu: string | null;
  holder: string | null;
  bank: string | null;
  taxId: string | null;
};

const clean = (value: string | undefined) => value?.trim() || null;

/** null si no hay alias ni CBU cargados: entonces no se ofrece pagar por transferencia. */
export function getTransferDetails(env: Record<string, string | undefined> = process.env): TransferDetails | null {
  const details = {
    alias: clean(env.VASE_TRANSFER_ALIAS),
    cbu: clean(env.VASE_TRANSFER_CBU),
    holder: clean(env.VASE_TRANSFER_HOLDER),
    bank: clean(env.VASE_TRANSFER_BANK),
    taxId: clean(env.VASE_TRANSFER_CUIT),
  };
  return details.alias || details.cbu ? details : null;
}

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** El tipo real del archivo según sus primeros bytes. Solo fotos (JPG, PNG, WebP) y PDF. */
export function sniffReceiptType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (bytes.length < 12) return null;
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  return null;
}

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Nombre seguro para guardar y descargar: sin rutas ni caracteres raros, con la extensión del tipo real. */
export function safeReceiptName(original: string, contentType: string) {
  const base = original
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._ -]+/g, "")
    .trim()
    .slice(0, 80);
  return `${base || "comprobante"}.${EXTENSION[contentType] ?? "bin"}`;
}
