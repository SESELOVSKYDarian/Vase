/* eslint-disable @next/next/no-img-element */
import { clsx } from "clsx";
import type { BuilderDocument } from "@/lib/business/builder";

type PublicStorefrontProps = {
  document: BuilderDocument;
};

const paletteClassMap = {
  linen: {
    shell: "bg-[#F7F2EA] text-[#1B1714]",
    surface: "bg-[#FFFFFF] border-[var(--border-subtle)]",
    accent: "bg-[#1B1714] text-white",
    muted: "text-[#665F57]",
  },
  graphite: {
    shell: "bg-[#1A1817] text-[#F7F2EA]",
    surface: "bg-[#262321] border-white/10",
    accent: "bg-[#D6CDC2] text-[#16120F]",
    muted: "text-[#D6CDC2]/70",
  },
  forest: {
    shell: "bg-[#F3F6F1] text-[#182117]",
    surface: "bg-white border-[#D5DDCF]",
    accent: "bg-[#203625] text-white",
    muted: "text-[#51604F]",
  },
  midnight: {
    shell: "bg-[#10131A] text-white",
    surface: "bg-[#1C212E] border-white/10",
    accent: "bg-[#D7C4A8] text-[#16120F]",
    muted: "text-[#D3D9E4]/70",
  },
} as const;

export function PublicStorefront({ document }: PublicStorefrontProps) {
  const palette = paletteClassMap[document.theme.palette];
  const spacingClass =
    document.theme.sectionSpacing === "compact"
      ? "gap-8"
      : document.theme.sectionSpacing === "spacious"
        ? "gap-24"
        : "gap-16";

  return (
    <div className={clsx("min-h-screen font-sans antialiased", palette.shell)}>
      <main className={clsx("mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-24 grid", spacingClass)}>
        {document.blocks.filter((block) => block.enabled).map((block) => {
          if (block.type === "hero") {
            return (
              <section key={block.id} className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div className="space-y-8">
                  {block.eyebrow ? (
                    <p className="text-sm font-bold tracking-[0.3em] uppercase opacity-60">
                      {block.eyebrow}
                    </p>
                  ) : null}
                  <div className="space-y-6">
                    <h1 className="text-5xl font-bold tracking-tight md:text-7xl leading-[1.1]">
                      {block.title}
                    </h1>
                    {block.description ? (
                      <p className={clsx("max-w-xl text-lg leading-relaxed md:text-xl", palette.muted)}>
                        {block.description}
                      </p>
                    ) : null}
                  </div>
                  {block.ctaLabel ? (
                    <a
                      href={block.ctaHref ?? "#"}
                      className={clsx(
                        "inline-flex h-14 items-center rounded-full px-10 text-base font-bold shadow-xl transition-transform hover:scale-105 active:scale-95",
                        palette.accent,
                      )}
                    >
                      {block.ctaLabel}
                    </a>
                  ) : null}
                </div>
                <div className="aspect-[4/5] overflow-hidden rounded-[40px] shadow-2xl md:aspect-square">
                  {block.imageUrl ? (
                    <img
                      src={block.imageUrl}
                      alt={block.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/5 text-sm opacity-40">
                      Placeholder Image
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (block.type === "rich-text") {
            return (
              <section key={block.id} className="max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
                <div className={clsx("mt-6 text-lg leading-relaxed space-y-4", palette.muted)}>
                  {block.body.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "feature-list") {
            return (
              <section key={block.id} className="space-y-10">
                <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
                <div className="grid gap-6 md:grid-cols-3">
                  {block.items.map((item) => (
                    <div
                      key={item}
                      className={clsx("rounded-[32px] border p-8 transition-colors", palette.surface)}
                    >
                      <p className="text-lg font-medium leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "gallery") {
            return (
              <section key={block.id} className="space-y-10">
                <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {block.images.map((image, index) => (
                    <div key={`${image.src}-${index}`} className="aspect-square overflow-hidden rounded-[32px] shadow-lg">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-full w-full object-cover transition-transform hover:scale-110 duration-700"
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "faq") {
            return (
              <section key={block.id} className="space-y-10">
                <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
                <div className="grid gap-4 max-w-3xl">
                  {block.items.map((item, index) => (
                    <div
                      key={`${item.question}-${index}`}
                      className={clsx("rounded-[28px] border p-6 md:p-8", palette.surface)}
                    >
                      <p className="text-xl font-bold">{item.question}</p>
                      <p className={clsx("mt-4 text-base leading-relaxed", palette.muted)}>
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return (
            <section key={block.id} className={clsx("rounded-[40px] border p-10 md:p-16 text-center space-y-8", palette.surface)}>
              <div className="mx-auto max-w-2xl space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">{block.title}</h2>
                {block.description ? (
                  <p className={clsx("text-lg", palette.muted)}>
                    {block.description}
                  </p>
                ) : null}
              </div>
              <a
                href={block.ctaHref}
                className={clsx(
                  "inline-flex h-14 items-center rounded-full px-12 text-base font-bold shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1",
                  palette.accent,
                )}
              >
                {block.ctaLabel}
              </a>
            </section>
          );
        })}
      </main>
      
      <footer className="border-t border-black/5 py-12 text-center opacity-40">
        <p className="text-xs font-bold tracking-widest uppercase">
          Build with Vase Platform
        </p>
      </footer>
    </div>
  );
}
