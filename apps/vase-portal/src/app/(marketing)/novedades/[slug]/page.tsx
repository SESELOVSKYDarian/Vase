import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { NEWS_ARTICLES, formatNewsDate, getNewsArticle, newsUrl } from "@/config/news";

export function generateStaticParams() {
  return NEWS_ARTICLES.map((article) => ({ slug: article.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getNewsArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: newsUrl(article.slug) },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url: newsUrl(article.slug),
      publishedTime: article.date,
      images: [{ url: article.cover.src, width: 1200, height: 500, alt: article.cover.alt }],
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getNewsArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto w-full max-w-[46rem] pt-8 pb-16 md:pt-14">
      <a href={newsUrl()} className="inline-flex items-center gap-2 text-sm font-semibold text-[#3c4a40] transition hover:text-[#006d43]">
        <ArrowLeft className="size-4" />
        Todas las novedades
      </a>

      <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5b6660]">
        {article.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[rgba(59,99,61,0.08)] px-2.5 py-1 text-[#2f5c34]">
            {tag}
          </span>
        ))}
        <time dateTime={article.date}>{formatNewsDate(article.date)}</time>
        <span>· {article.readingMinutes} min de lectura</span>
      </div>

      <h1 className="mt-4 text-4xl leading-[1.08] tracking-[-0.04em] text-[#191c1b] sm:text-5xl">{article.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-[#3c4a40] sm:text-xl">{article.excerpt}</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={article.cover.src}
        alt={article.cover.alt}
        className="mt-10 aspect-[12/5] w-full rounded-[1.75rem] border border-white/70 object-cover shadow-[0_28px_70px_rgba(25,28,27,0.1)] md:-mx-10 md:w-[calc(100%+5rem)] md:max-w-none"
      />

      <div className="mt-12 flex flex-col gap-12">
        {article.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold leading-snug tracking-[-0.02em] text-[#191c1b] sm:text-[1.7rem]">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[1.0625rem] leading-[1.75] text-[#2f3a33]">
                {paragraph}
              </p>
            ))}
            {section.items?.length ? (
              <ul className="flex flex-col gap-3 rounded-[1.5rem] border border-[rgba(59,99,61,0.1)] bg-white/75 p-5 md:p-6">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-[1rem] leading-relaxed text-[#2f3a33]">
                    <span aria-hidden="true" className="mt-[0.6rem] h-1.5 w-1.5 flex-none rounded-full bg-[#18c37e]" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {article.cta ? (
        <div className="mt-14 flex flex-col items-start gap-4 rounded-[2rem] bg-[linear-gradient(135deg,#0a3d2b_0%,#0b6b4a_60%,#16a36f_100%)] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-semibold">¿Ya lo viste?</p>
            <p className="mt-1 text-sm text-[#d6f5e4]">Entrá a tu cuenta y recorré el panel nuevo.</p>
          </div>
          <a
            href={article.cta.href}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#0b6b4a] transition hover:opacity-90"
          >
            {article.cta.label}
            <ArrowRight className="size-4" />
          </a>
        </div>
      ) : null}
    </article>
  );
}
