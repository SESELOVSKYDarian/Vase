import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { NEWS_ARTICLES, formatNewsDate, newsUrl } from "@/config/news";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo nuevo de Vase: cambios en app, Business, Labs y el resto de los productos.",
  alternates: { canonical: newsUrl() },
  openGraph: { title: "Novedades de Vase", url: newsUrl() },
};

export default function NewsIndexPage() {
  const [featured, ...rest] = NEWS_ARTICLES;

  return (
    <div className="mx-auto w-full max-w-[68rem] pb-16">
      <header className="pt-10 pb-10 md:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(181,236,200,0.35)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#1c5036]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#18c37e]" />
          news.vase.ar
        </div>
        <h1 className="mt-5 text-5xl leading-[1.05] tracking-[-0.05em] text-[#191c1b] sm:text-6xl">
          Novedades de{" "}
          <span className="font-[family-name:var(--font-newsreader)] font-normal italic text-[#006d43]">Vase</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#3c4a40]">
          Qué cambió, qué llegó y cómo aprovecharlo. Todo lo nuevo de app, Business, Labs y el resto de Vase.
        </p>
      </header>

      {featured ? (
        <a
          href={newsUrl(featured.slug)}
          className="group block overflow-hidden rounded-[2rem] border border-[rgba(59,99,61,0.12)] bg-white/80 shadow-[0_24px_70px_rgba(25,28,27,0.06)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_30px_80px_rgba(25,28,27,0.1)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.cover.src} alt={featured.cover.alt} className="aspect-[12/5] w-full object-cover" />
          <div className="flex flex-col gap-4 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5b6660]">
              {featured.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[rgba(59,99,61,0.08)] px-2.5 py-1 text-[#2f5c34]">
                  {tag}
                </span>
              ))}
              <span>{formatNewsDate(featured.date)}</span>
              <span>· {featured.readingMinutes} min de lectura</span>
            </div>
            <h2 className="text-3xl leading-tight tracking-[-0.03em] text-[#191c1b] md:text-4xl">{featured.title}</h2>
            <p className="max-w-3xl text-base leading-relaxed text-[#3c4a40] md:text-lg">{featured.excerpt}</p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#006d43]">
              Leer la nota
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </a>
      ) : null}

      {rest.length ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {rest.map((article) => (
            <a
              key={article.slug}
              href={newsUrl(article.slug)}
              className="group block overflow-hidden rounded-[1.75rem] border border-[rgba(59,99,61,0.12)] bg-white/80 transition hover:-translate-y-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover.src} alt={article.cover.alt} className="aspect-[12/5] w-full object-cover" />
              <div className="flex flex-col gap-2 p-5">
                <span className="text-xs font-semibold text-[#5b6660]">
                  {article.tags.join(" · ")} · {formatNewsDate(article.date)}
                </span>
                <h2 className="text-xl font-semibold leading-snug text-[#191c1b]">{article.title}</h2>
                <p className="text-sm leading-relaxed text-[#3c4a40]">{article.excerpt}</p>
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
