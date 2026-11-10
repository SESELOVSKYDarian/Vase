"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeAvatarAction, saveAvatarAction } from "@/app/(platform)/app/settings/actions";

const AVATAR_SIZE = 256;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

type UploadsSession = { token: string; uploads_base_url: string };

/** Achica la foto a un cuadrado de 256 px: pesa poco y no lleva los datos ocultos de la cámara. */
async function toSquareWebp(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("ENCODE_FAILED");
  return new File([blob], `perfil-${Date.now()}.webp`, { type: "image/webp" });
}

async function uploadAvatar(file: File) {
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

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
      setError("Elegí una imagen de hasta 8 MB.");
      return;
    }
    startTransition(async () => {
      try {
        const url = await uploadAvatar(await toSquareWebp(file));
        const result = await saveAvatarAction(url);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.refresh();
      } catch {
        setError("No pudimos subir la foto. Probá de nuevo.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  return (
    <div className="vpa-avrow">
      <span className="vpa-avatar" aria-hidden="true">
        {avatarUrl ? (
          // La foto vive en uploads.vase.ar, fuera de las imágenes que optimiza Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      <div className="vpa-g1">
        <b>Foto de perfil</b>
        <span>La ven las personas de tu equipo.</span>
        {error ? <span role="alert" style={{ color: "var(--red)" }}>{error}</span> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <button type="button" className="vpa-btn line sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
        {isPending ? "Subiendo..." : avatarUrl ? "Cambiar foto" : "Subir foto"}
      </button>
      {avatarUrl ? (
        <button
          type="button"
          className="vpa-btn soft sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await removeAvatarAction();
              router.refresh();
            })
          }
        >
          Quitar
        </button>
      ) : null}
    </div>
  );
}
