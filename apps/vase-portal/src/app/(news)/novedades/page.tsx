import type { Metadata } from "next";
import { ArrowDown } from "lucide-react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { NEWS_ARTICLES, formatNewsDate, newsUrl, type NewsArticle } from "@/config/news";
import { NewsFooter } from "../news-footer";
import { NewsRail } from "../news-rail";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo nuevo de Vase: qué cambió en app, Business, Labs y el resto de los productos, con capturas reales.",
  alternates: { canonical: newsUrl() },
  openGraph: { title: "Novedades de Vase", url: newsUrl() },
};

function Meta({ article }: { article: NewsArticle }) {
  return (
    <span className="vn-meta">
      <time dateTime={article.date}>{formatNewsDate(article.date, "short")}</time>
      <i aria-hidden="true" />
      {article.readingMinutes} min de lectura
    </span>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="vn-cat">
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export default function NewsIndexPage() {
  const [featured, ...others] = NEWS_ARTICLES;
  if (!featured) return null;
  const heroImage = featured.changes.find((change) => change.cardImage)?.cardImage ?? featured.cover.src;

  return (
    <>
      <div className="vn-hero-pad">
        <section className="vn-hero framed">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bg vn-zoom" src={heroImage} alt="" width={2000} height={1250} />
          <div className="vn-hero-body">
            <div>
              <div className="vn-in" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <span className="vn-chip">Novedades</span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>Última nota: {formatNewsDate(featured.date)}</span>
              </div>
              <h1 className="vn-in" style={{ ["--d" as string]: "120ms" }}>
                Lo nuevo de Vase, <strong>contado claro.</strong>
              </h1>
              <div className="vn-in" style={{ ["--d" as string]: "240ms", marginTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
                <p className="vn-hero-text">Qué cambió en app, Business, Labs y el resto de los productos, con capturas reales y cómo aprovecharlo.</p>
                <a href="#notas" className="vn-btn">
                  Ver las notas
                  <ArrowDown className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="vn-wrap" id="notas" style={{ scrollMarginTop: 96 }}>
        <section className="vn-news">
          <ScrollReveal variant="card" className="vn-news-main">
            <a href={newsUrl(featured.slug)} className="vn-feature">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured.cover.src} alt="" width={featured.cover.width} height={featured.cover.height} />
              <span className="vn-feature-body">
                <Chip>{featured.category}</Chip>
                <b>{featured.title}</b>
                <Meta article={featured} />
              </span>
            </a>
          </ScrollReveal>

          <ScrollReveal variant="text" delay={0.12} className="vn-news-side">
            <h2>Últimas notas</h2>
            <div className="vn-latest-list">
              {others.slice(0, 4).map((article) => (
                <a key={article.slug} href={newsUrl(article.slug)} className="vn-li">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={article.cover.src} alt="" width={160} height={160} loading="lazy" />
                  <span>
                    <b>{article.title}</b>
                    <Meta article={article} />
                  </span>
                </a>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <hr className="vn-hr" />

        <ScrollReveal variant="section">
          <NewsRail title="Por producto">
            {NEWS_ARTICLES.map((article) => (
              <a key={article.slug} href={newsUrl(article.slug)} className="vn-post">
                <span className="vn-post-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={article.cover.src} alt="" width={article.cover.width} height={article.cover.height} loading="lazy" />
                </span>
                <span className="vn-post-body">
                  <Chip>{article.category}</Chip>
                  <b>{article.title}</b>
                  <small>{article.excerpt}</small>
                  <Meta article={article} />
                </span>
              </a>
            ))}
          </NewsRail>
        </ScrollReveal>
      </div>

      <NewsFooter />
    </>
  );
}
