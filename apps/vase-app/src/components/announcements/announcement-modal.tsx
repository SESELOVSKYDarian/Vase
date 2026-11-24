"use client";

import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Gift, Heart, Info, Megaphone, PartyPopper, Rocket, Sparkles, Star, X, Zap, type LucideProps } from "lucide-react";
import { dismissAnnouncementsAction } from "@/app/(platform)/app/announcement-actions";
import { accentOf, type AnnouncementView } from "@/lib/announcements";
import "./announcement-modal.css";

const ICONS: Record<string, ComponentType<LucideProps>> = {
  sparkles: Sparkles,
  rocket: Rocket,
  gift: Gift,
  megaphone: Megaphone,
  party: PartyPopper,
  star: Star,
  zap: Zap,
  bell: Bell,
  heart: Heart,
  info: Info,
};

/** Ícono del anuncio (para la vista previa de Admin también). */
export function AnnouncementIcon({ name, size = 28 }: { name: string | null | undefined; size?: number }) {
  const Icon = ICONS[name ?? "sparkles"] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

type Props = {
  items: AnnouncementView[];
  /** Vista previa: no guarda nada al cerrar. */
  preview?: boolean;
  /** Guarda que la persona lo cerró. Por defecto sí, salvo en la vista previa. */
  save?: boolean;
  /** Base para links internos cuando se muestra embebido en otro producto. */
  linkBase?: string;
  onClose?: () => void;
};

/** Ventana de anuncios: uno o varios, se pasan con flechas o puntitos y se cierra con la cruz. */
export function AnnouncementModal({ items, preview = false, save = !preview, linkBase = "", onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();
  const startX = useRef<number | null>(null);
  const count = items.length;
  const current = items[Math.min(index, count - 1)];

  const close = () => {
    if (preview) return;
    setOpen(false);
    if (save) startTransition(() => void dismissAnnouncementsAction(items.map((item) => item.id)));
    onClose?.();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setIndex((value) => Math.min(count - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, count]);

  if (!open || !current) return null;
  const accent = accentOf(current.accent);
  const last = index >= count - 1;
  const href = current.ctaUrl ? (current.ctaUrl.startsWith("/") ? `${linkBase}${current.ctaUrl}` : current.ctaUrl) : null;

  return (
    <div className={`vann${preview ? " is-preview" : ""}`} role="presentation" onClick={preview ? undefined : close}>
      <section
        className="vann-box"
        role="dialog"
        aria-modal={!preview}
        aria-labelledby={`vann-t-${current.id}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current === null) return;
          const delta = event.clientX - startX.current;
          startX.current = null;
          if (delta < -50) setIndex((value) => Math.min(count - 1, value + 1));
          if (delta > 50) setIndex((value) => Math.max(0, value - 1));
        }}
      >
        <button type="button" className="vann-x" onClick={close} aria-label="Cerrar anuncios">
          <X size={18} aria-hidden="true" />
        </button>

        <div key={current.id} className="vann-slide">
          <div className="vann-hero" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
            {current.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.imageUrl} alt="" className="vann-img" />
            ) : (
              <span className="vann-ico">
                <AnnouncementIcon name={current.icon} size={34} />
              </span>
            )}
            {count > 1 ? (
              <span className="vann-count">
                {index + 1} de {count}
              </span>
            ) : null}
          </div>
          <div className="vann-body">
            <h2 id={`vann-t-${current.id}`}>{current.title}</h2>
            {current.body.split(/\n+/).filter(Boolean).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>

        <footer className="vann-foot">
          {count > 1 ? (
            <div className="vann-dots" role="tablist" aria-label="Anuncios">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Anuncio ${i + 1}`}
                  className={i === index ? "on" : undefined}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className="vann-actions">
            {count > 1 && index > 0 ? (
              <button type="button" className="vann-btn ghost icon" onClick={() => setIndex(index - 1)} aria-label="Anterior">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            ) : null}
            {href && current.ctaLabel ? (
              <a
                className="vann-btn primary"
                href={href}
                target={/^https?:/.test(current.ctaUrl ?? "") ? "_blank" : linkBase ? "_top" : undefined}
                rel="noreferrer"
                style={{ background: accent.from }}
                onClick={() => {
                  if (save) startTransition(() => void dismissAnnouncementsAction([current.id]));
                }}
              >
                {current.ctaLabel}
              </a>
            ) : null}
            {last ? (
              <button type="button" className={`vann-btn ${href ? "ghost" : "primary"}`} style={href ? undefined : { background: accent.from }} onClick={close}>
                Entendido
              </button>
            ) : (
              <button type="button" className="vann-btn ghost" onClick={() => setIndex(index + 1)}>
                Siguiente
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

/** Para el panel de app: no se muestra en Admin, Workspace ni en páginas embebidas. */
export function AppAnnouncements({ items }: { items: AnnouncementView[] }) {
  const pathname = usePathname() ?? "";
  if (!items.length || /^\/app\/(admin|workspace|embed)(\/|$)/.test(pathname)) return null;
  return <AnnouncementModal items={items} />;
}

/** Dentro del iframe que ponen Business, Labs, Management y Rest. Avisa al producto cuándo mostrarse y cuándo cerrarse. */
export function EmbeddedAnnouncements({ items, linkBase, theme }: { items: AnnouncementView[]; linkBase: string; theme: "light" | "dark" }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    root.style.background = "transparent";
    document.body.style.background = "transparent";
    if (window.parent !== window) window.parent.postMessage({ type: "vase-announcements", count: items.length }, "*");
  }, [items.length, theme]);
  if (!items.length) return null;
  return (
    <AnnouncementModal
      items={items}
      linkBase={linkBase}
      onClose={() => {
        if (window.parent !== window) window.parent.postMessage({ type: "vase-announcements-close" }, "*");
      }}
    />
  );
}
