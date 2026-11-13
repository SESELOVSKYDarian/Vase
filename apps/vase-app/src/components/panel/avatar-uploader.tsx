"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeAvatarAction, saveAvatarAction } from "@/app/(platform)/app/settings/actions";
import { MAX_IMAGE_INPUT_BYTES, toSquareWebp, uploadPublicImage } from "@/components/panel/upload-image";

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_INPUT_BYTES) {
      setError("Elegí una imagen de hasta 8 MB.");
      return;
    }
    startTransition(async () => {
      try {
        const url = await uploadPublicImage(await toSquareWebp(file, 256, "cover", "perfil"));
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
