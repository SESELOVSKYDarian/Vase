/* eslint-disable @next/next/no-img-element */
import { clsx } from "clsx";
import type { BuilderDocument } from "@/lib/business/builder";

type StorefrontPreviewProps = {
  document: BuilderDocument;
  viewport: "desktop" | "mobile";
};

const paletteClassMap = {
  linen: {
    shell: "bg-[#F7F2EA] text-[#1B1714]",
    surface: "bg-[color-mix(in_srgb,var(--surface-strong)_90%,transparent)] border-[var(--border-subtle)]",
    accent: "bg-[#1B1714] text-[var(--accent-contrast)]",
    muted: "text-[#665F57]",
  },
  graphite: {
    shell: "bg-[#1A1817] text-[var(--accent-contrast)]",
    surface: "bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] border-white/10",
    accent: "bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] text-[#16120F]",
    muted: "text-[#D6CDC2]",
  },
  forest: {
    shell: "bg-[#F3F6F1] text-[#182117]",
    surface: "bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/90 border-[#D5DDCF]",
    accent: "bg-[#203625] text-[var(--accent-contrast)]",
    muted: "text-[#51604F]",
  },
  midnight: {
    shell: "bg-[#10131A] text-[var(--accent-contrast)]",
    surface: "bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/7 border-white/10",
    accent: "bg-[#D7C4A8] text-[#16120F]",
    muted: "text-[#D3D9E4]",
  },
} as const;

export function StorefrontPreview({ document, viewport }: StorefrontPreviewProps) {
  const palette = paletteClassMap[document.theme.palette];
  const spacingClass =
    document.theme.sectionSpacing === "compact"
      ? "gap-4"
      : document.theme.sectionSpacing === "spacious"
        ? "gap-8"
        : "gap-6";

  return (
    <div
      className={clsx(
        "mx-auto overflow-hidden rounded-[32px] border shadow-[0_24px_90px_rgba(15,23,42,0.16)]",
        viewport === "mobile" ? "max-w-[390px]" : "w-full",
        palette.shell,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-4 text-xs font-semibold tracking-[0.22em] uppercase opacity-80">
        Vista previa {viewport === "mobile" ? "mobile" : "desktop"}
      </div>

      <div className={clsx("grid px-5 py-5", spacingClass)}>
        {document.blocks.filter((block) => block.enabled).map((block) => {
          if (block.type === "hero") {
            return (
              <section
                key={block.id}
                className={clsx("rounded-[28px] border p-6", palette.surface)}
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                  <div className="space-y-4">
                    {block.eyebrow ? (
                      <p className="text-xs font-semibold tracking-[0.24em] uppercase opacity-70">
                        {block.eyebrow}
                      </p>
                    ) : null}
                    <div className="space-y-3">
                      <h2 className="text-3xl font-semibold tracking-tight">{block.title}</h2>
                      {block.description ? (
                        <p className={clsx("max-w-xl text-sm leading-7", palette.muted)}>
                          {block.description}
                        </p>
                      ) : null}
                    </div>
                    {block.ctaLabel ? (
                      <a
                        href={block.ctaHref ?? "#"}
                        className={clsx(
                          "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold",
                          palette.accent,
                        )}
                      >
                        {block.ctaLabel}
                      </a>
                    ) : null}
                  </div>
                  <div className="overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-black/5">
                    {block.imageUrl ? (
                      <img
                        src={block.imageUrl}
                        alt={block.title}
                        className="h-full min-h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex min-h-56 items-center justify-center text-sm opacity-60">
                        Imagen principal
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === "rich-text") {
            return (
              <section
                key={block.id}
                className={clsx("rounded-[28px] border p-6", palette.surface)}
              >
                <h3 className="text-xl font-semibold tracking-tight">{block.title}</h3>
                <p className={clsx("mt-3 text-sm leading-7", palette.muted)}>{block.body}</p>
              </section>
            );
          }

          if (block.type === "feature-list") {
            return (
              <section
                key={block.id}
                className={clsx("rounded-[28px] border p-6", palette.surface)}
              >
                <h3 className="text-xl font-semibold tracking-tight">{block.title}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {block.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/50 p-4 text-sm leading-6"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "gallery") {
            return (
              <section
                key={block.id}
                className={clsx("rounded-[28px] border p-6", palette.surface)}
              >
                <h3 className="text-xl font-semibold tracking-tight">{block.title}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {block.images.map((image, index) => (
                    <div key={`${image.src}-${index}`} className="overflow-hidden rounded-[22px]">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "faq") {
            return (
              <section
                key={block.id}
                className={clsx("rounded-[28px] border p-6", palette.surface)}
              >
                <h3 className="text-xl font-semibold tracking-tight">{block.title}</h3>
                <div className="mt-4 grid gap-3">
                  {block.items.map((item, index) => (
                    <div
                      key={`${item.question}-${index}`}
                      className="rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/50 p-4"
                    >
                      <p className="font-semibold">{item.question}</p>
                      <p className={clsx("mt-2 text-sm leading-7", palette.muted)}>
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return (
            <section
              key={block.id}
              className={clsx("rounded-[28px] border p-6", palette.surface)}
            >
              <h3 className="text-xl font-semibold tracking-tight">{block.title}</h3>
              {block.description ? (
                <p className={clsx("mt-3 text-sm leading-7", palette.muted)}>
                  {block.description}
                </p>
              ) : null}
              <a
                href={block.ctaHref}
                className={clsx(
                  "mt-5 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold",
                  palette.accent,
                )}
              >
                {block.ctaLabel}
              </a>
            </section>
          );
        })}
      </div>
    </div>
  );
}
