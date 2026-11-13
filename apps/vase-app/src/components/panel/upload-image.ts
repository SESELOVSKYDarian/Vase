"use client";

type UploadsSession = { token: string; uploads_base_url: string };

export const MAX_IMAGE_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Pasa la imagen a un cuadrado WebP: "cover" recorta (fotos de perfil), "contain" la entra entera
 * con fondo transparente (logos). Pesa poco y no lleva los datos ocultos de la cámara.
 */
export async function toSquareWebp(file: File, size: number, mode: "cover" | "contain", name: string) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");

  if (mode === "cover") {
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  } else {
    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error("ENCODE_FAILED");
  return new File([blob], `${name}-${Date.now()}.webp`, { type: "image/webp" });
}

/** Sube a uploads.vase.ar y devuelve la dirección pública de la imagen. */
export async function uploadPublicImage(file: File) {
  const sessionResponse = await fetch("/api/uploads/token", { cache: "no-store" });
  if (!sessionResponse.ok) throw new Error("UPLOADS_UNAVAILABLE");
  const session = (await sessionResponse.json()) as UploadsSession;

  const form = new FormData();
  form.append("file", file);
  const upload = await fetch(`${session.uploads_base_url}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: form,
  });
  if (!upload.ok) throw new Error("UPLOAD_FAILED");
  const uploaded = (await upload.json().catch(() => ({}))) as { filename?: string; file?: { filename?: string } };
  const filename = uploaded.filename ?? uploaded.file?.filename ?? file.name;

  const link = await fetch(`${session.uploads_base_url}/files/${encodeURIComponent(filename)}/public-url`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!link.ok) throw new Error("LINK_FAILED");
  const { public_url: publicUrl } = (await link.json()) as { public_url?: string };
  if (!publicUrl) throw new Error("LINK_FAILED");
  return publicUrl;
}
