const MAX_UPLOAD_URL_LENGTH = 2048;

export function uploadsOrigin() {
  return new URL(process.env.UPLOADS_BASE_URL || "https://uploads.vase.ar").origin;
}

/** Solo se guardan imágenes servidas por uploads.vase.ar, nunca una dirección cualquiera. */
export function isVaseUploadUrl(value: unknown, origin: string = uploadsOrigin()) {
  if (typeof value !== "string" || value.length > MAX_UPLOAD_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === new URL(origin).origin;
  } catch {
    return false;
  }
}
