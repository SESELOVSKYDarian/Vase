import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { NEWS_ARTICLES, NEWS_ORIGIN, changeAnchor, formatNewsDate, getNewsArticle, newsUrl, type NewsArticle, type NewsFigure } from "@/config/news";
import { portalOrigins } from "@/config/origins";
import { NewsFooter } from "../../news-footer";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

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
      images: [{ url: `${NEWS_ORIGIN}${article.cover.src}`, width: article.cover.width, height: article.cover.height, alt: article.cover.alt }],
    },
    twitter: { card: "summary_large_image", images: [`${NEWS_ORIGIN}${article.cover.src}`] },
  };
}

function articleJsonLd(article: NewsArticle) {
  const site = portalOrigins.publicSite;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: `${article.date}T12:00:00-03:00`,
    dateModified: `${article.date}T12:00:00-03:00`,
    inLanguage: "es-AR",
    mainEntityOfPage: newsUrl(article.slug),
    image: [`${NEWS_ORIGIN}${article.cover.src}`, ...article.changes.map((change) => `${NEWS_ORIGIN}${change.figure.src}`)],
    keywords: article.tags.join(", "),
    author: { "@type": "Organization", name: "Vase", url: site },
    publisher: { "@type": "Organization", name: "Vase", url: site, logo: { "@type": "ImageObject", url: `${site}/vasecolorlogo.png` } },
  };
}

function Shot({ figure }: { figure: NewsFigure }) {
  return (
    <div className="vn-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} loading="lazy" />
    </div>
  );
}

const pad = (index: number) => String(index + 1).padStart(2, "0");

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getNewsArticle(slug);
  if (!article) notFound();

  return (
    <article>
      <JsonLd data={articleJsonLd(article)} />
      <div className="vn-hero-pad">
        <section className="vn-hero side">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bg vn-zoom" src={article.cover.src} alt="" width={article.cover.width} height={article.cover.height} />
          <div className="vn-hero-body">
            <h1 className="vn-in">{article.title}</h1>
            <div className="vn-in" style={{ ["--d" as string]: "180ms", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 20, minWidth: 260 }}>
              <a href={article.cta.href} className="vn-btn">
                Probarlo ahora
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <div className="vn-hero-meta">
                <span>{article.tags.join(" · ")}</span>
                <time dateTime={article.date}>{formatNewsDate(article.date)}</time>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="vn-wrap">
        <section className="vn-split" style={{ paddingTop: 112 }}>
          <div className="a" style={{ flexBasis: 180 }}>
            <a href={newsUrl()} className="vn-link-u">
              Todas las novedades
            </a>
            <p className="vn-small">
              {article.readingMinutes} minutos de lectura.
              <br />
              Escrito por el equipo de Vase.
            </p>
          </div>
          <div className="b" style={{ maxWidth: 680 }}>
            <p className="vn-big">{article.lede}</p>
            <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ flex: 1, borderTop: "1px solid var(--tx)" }} />
              <a href="#cambios" className="vn-btn line">
                Ver los cambios
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section id="cambios" style={{ paddingTop: 144, scrollMarginTop: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
            <div>
              <div className="vn-label">(01)</div>
              <h2 style={{ marginTop: 6, maxWidth: 560, fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, letterSpacing: "-0.035em", lineHeight: 1.12 }}>
                {article.changesTitle}
              </h2>
            </div>
            <a href={article.cta.href} className="vn-btn line">
              Entrar y probarlo
            </a>
          </div>

          <ScrollReveal variant="card" className="vn-cards vn-cards-gap" amount={0.1}>
            {article.changes.map((change, index) => (
              <a key={change.title} href={`#${changeAnchor(index)}`} className={`vn-card${change.wide ? " wide" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={change.cardImage ?? change.figure.src} alt="" width={2000} height={1250} loading="lazy" />
                <span className="vn-card-top">
                  <span>({pad(index)})</span>
                  <span className="vn-tag">{change.where}</span>
                </span>
                <span className="vn-card-bottom">
                  <span>
                    <b>{change.title}</b>
                    <small>{change.short}</small>
                  </span>
                  <span className="vn-ghost">
                    Ver detalle
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </span>
                </span>
              </a>
            ))}
          </ScrollReveal>

          <div style={{ marginTop: 120, display: "flex", flexDirection: "column", gap: 96 }}>
            {article.changes.map((change, index) => (
              <ScrollReveal key={change.title} variant="section" amount={0.15}>
              <section id={changeAnchor(index)} className={`vn-detail${index % 2 ? " rev" : ""}`}>
                <div className="t">
                  <div className="vn-label">
                    ({pad(index)}) · {change.where}
                  </div>
                  <h3>{change.title}</h3>
                  {change.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <figure>
                  <Shot figure={change.figure} />
                  {change.figure.caption ? <figcaption>{change.figure.caption}</figcaption> : null}
                </figure>
              </section>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {article.highlight ? (
          <ScrollReveal variant="section" amount={0.15}>
          <section style={{ paddingTop: 120 }}>
            <figure style={{ margin: 0 }}>
              <Shot figure={article.highlight} />
              <figcaption>
                <span>{article.highlight.caption}</span>
                <span>{article.highlight.tag}</span>
              </figcaption>
            </figure>
          </section>
          </ScrollReveal>
        ) : null}

        {article.closing ? (
          <section className="vn-split" style={{ paddingTop: 144 }}>
            <div className="a" style={{ flexBasis: 180, justifyContent: "flex-start" }}>
              <span className="vn-link-u">Lo que viene.</span>
            </div>
            <div className="b">
              <h2 style={{ fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, letterSpacing: "-0.035em", lineHeight: 1.12, textAlign: "right" }}>
                {article.closing.title}
              </h2>
              <div className="vn-cols">
                {article.closing.columns.map((column) => (
                  <div key={column.title}>
                    <h3>{column.title}</h3>
                    <p>{column.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <ScrollReveal variant="section" className="vn-endbox">
          <div className="vn-end">
            <h2>{article.cta.title}</h2>
            <a href={article.cta.href} className="vn-btn">
              {article.cta.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </ScrollReveal>
      </div>

      <NewsFooter />
    </article>
  );
}
