"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, ImageOff, Loader2, Search, Upload } from "lucide-react";
import { MAX_IMAGE_INPUT_BYTES, uploadPublicImage } from "@/components/panel/upload-image";
import type { SharedImages } from "@/server/services/business-shared";

type Image = SharedImages["items"][number];
type GroupId = "todas" | "productos" | "paginas" | "marca" | "subidas";

const GROUPS: Array<{ id: GroupId; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "productos", label: "Productos" },
  { id: "paginas", label: "Páginas" },
  { id: "marca", label: "Logo y colores" },
  { id: "subidas", label: "Subidas ahora" },
];

const PAGE_SIZE = 60;

function fileName(src: string) {
  try {
    return decodeURIComponent(src.split("?")[0].split("/").filter(Boolean).pop() || "imagen");
  } catch {
    return "imagen";
  }
}

// Las fotos de producto se llaman por el producto, no por el archivo.
function imageTitle(image: Image) {
  return image.productId && image.where[0] ? image.where[0] : fileName(image.src);
}

export function ImagesBoard({ images }: { images: Image[] }) {
  const [group, setGroup] = useState<GroupId>("todas");
  const [query, setQuery] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo<Array<Image & { fresh?: boolean }>>(
    () => [...uploaded.map((src) => ({ src, groups: [], where: ["Recién subida"], productId: null, fresh: true })), ...images],
    [images, uploaded],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        GROUPS.map(({ id }) => [
          id,
          id === "todas" ? all.length : id === "subidas" ? uploaded.length : all.filter((image) => image.groups.includes(id)).length,
        ]),
      ) as Record<GroupId, number>,
    [all, uploaded.length],
  );
  const q = query.trim().toLowerCase();
  const rows = all
    .filter((image) => group === "todas" || (group === "subidas" ? image.fresh : image.groups.includes(group)))
    .filter((image) => !q || `${fileName(image.src)} ${image.where.join(" ")}`.toLowerCase().includes(q));
  const shown = rows.slice(0, limit);

  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;
    const tooBig = list.find((file) => file.size > MAX_IMAGE_INPUT_BYTES);
    if (tooBig) {
      setMessage({ kind: "error", text: `“${tooBig.name}” pesa más de 8 MB. Probá con una más liviana.` });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const urls: string[] = [];
      for (const file of list) urls.push(await uploadPublicImage(file));
      setUploaded((current) => [...urls.reverse(), ...current]);
      setGroup("subidas");
      setMessage({ kind: "ok", text: list.length > 1 ? `Subiste ${list.length} imágenes. Copiá el link para usarlas.` : "Imagen subida. Copiá el link para usarla." });
    } catch {
      setMessage({ kind: "error", text: "No pudimos subir la imagen. Probá de nuevo en un rato." });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const copy = async (src: string) => {
    try {
      await navigator.clipboard.writeText(src);
      setCopied(src);
      window.setTimeout(() => setCopied((current) => (current === src ? null : current)), 1600);
    } catch {
      setMessage({ kind: "error", text: "No pudimos copiar el link. Abrí la imagen y copialo desde ahí." });
    }
  };

  return (
    <div className="vpa-stack" style={{ gap: 16 }}>
      <div
        className={dragOver ? "vpa-imgdrop on" : "vpa-imgdrop"}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(event.dataTransfer.files);
        }}
      >
        <span className="vpa-g1">
          <b>Subí fotos nuevas</b>
          <span>Arrastralas acá o elegilas. Te queda el link listo para usar en tu tienda.</span>
        </span>
        <button type="button" className="vpa-btn acc" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="vpa-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
          {uploading ? "Subiendo..." : "Subir imágenes"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => void upload(event.target.files)} />
      </div>
      {message ? (
        <p className={message.kind === "ok" ? "vpa-note ok" : "vpa-note err"} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      <div className="vpa-filt">
        <label className="vpa-search">
          <Search size={16} aria-hidden="true" />
          <input
            className="vpa-inp"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Buscar por producto o archivo"
            aria-label="Buscar imágenes"
          />
        </label>
        <nav className="vpa-seg" aria-label="Filtrar imágenes">
          {GROUPS.filter(({ id }) => id !== "subidas" || uploaded.length > 0).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={group === id ? "on" : undefined}
              aria-pressed={group === id}
              onClick={() => {
                setGroup(id);
                setLimit(PAGE_SIZE);
              }}
            >
              {label} {counts[id].toLocaleString("es-AR")}
            </button>
          ))}
        </nav>
      </div>

      {shown.length === 0 ? (
        <div className="vpa-empty">{q ? `No encontramos imágenes con “${query.trim()}”.` : "Todavía no hay fotos en esta parte."}</div>
      ) : (
        <ul className="vpa-imggrid">
          {shown.map((image) => (
            <li key={image.src} className="vpa-imgcard">
              <a href={image.src} target="_blank" rel="noreferrer" className="vpa-imgthumb" aria-label={`Abrir ${imageTitle(image)}`}>
                {/* Fotos de otros dominios (tienda, uploads): sin optimizar a propósito. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    event.currentTarget.parentElement?.classList.add("broken");
                  }}
                />
                <ImageOff size={22} className="vpa-imgoff" aria-hidden="true" />
              </a>
              <div className="vpa-imgmeta">
                <b title={imageTitle(image)}>{imageTitle(image)}</b>
                <span>{image.productId ? "Producto" : image.where[0] ?? "—"}</span>
              </div>
              <button type="button" className="vpa-btn line sm" onClick={() => void copy(image.src)}>
                {copied === image.src ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied === image.src ? "Copiado" : "Copiar link"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows.length > shown.length ? (
        <button type="button" className="vpa-btn line" style={{ alignSelf: "center" }} onClick={() => setLimit((value) => value + PAGE_SIZE)}>
          Ver más ({(rows.length - shown.length).toLocaleString("es-AR")})
        </button>
      ) : null}
    </div>
  );
}
