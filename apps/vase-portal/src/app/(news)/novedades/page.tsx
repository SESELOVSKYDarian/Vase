import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { NEWS_ARTICLES, changeAnchor, formatNewsDate, newsUrl } from "@/config/news";
import { NewsFooter } from "../news-footer";
import { NewsNav } from "../news-nav";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo nuevo de Vase: qué cambió en app, Business, Labs y el resto de los productos, con capturas reales.",
  alternates: { canonical: newsUrl() },
  openGraph: { title: "Novedades de Vase", url: newsUrl() },
};

export default function NewsIndexPage() {
  const latest = NEWS_ARTICLES[0];
  if (!latest) return null;
  const heroImage = latest.changes.find((change) => change.cardImage)?.cardImage ?? latest.cover.src;

  return (
    <div className="vn dark">
      <div className="vn-hero-pad">
        <section className="vn-hero framed">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bg" src={heroImage} alt="" width={2000} height={1250} />
          <NewsNav />
          <div className="vn-hero-body">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <span className="vn-chip">Novedades</span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>Última nota: {formatNewsDate(latest.date)}</span>
              </div>
              <h1>
                Lo nuevo de Vase, <strong>contado claro.</strong>
              </h1>
              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
                <p className="vn-hero-text">Qué cambió en app, Business, Labs y el resto de los productos, con capturas reales y cómo aprovecharlo.</p>
                <a href="#notas" className="vn-btn">
                  Ver las notas
                  <ArrowDown className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
            <a href={newsUrl(latest.slug)} className="vn-latest">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={latest.cover.src} alt="" width={96} height={62} />
              <span style={{ margin: 0, color: "inherit" }}>
                <b>{latest.title}</b>
                <span>Leer la nota →</span>
              </span>
            </a>
          </div>
        </section>
      </div>

      <div className="vn-wrap">
        <section className="vn-split" style={{ paddingTop: 112 }}>
          <div className="a">
            <div>
              <div className="vn-label">(01)</div>
              <h2 className="vn-h">Por qué existe esto</h2>
            </div>
            <p className="vn-small">Cada cambio importante en Vase llega acá primero y te lo avisamos dentro de tu panel con una ventanita.</p>
          </div>
          <div className="b">
            <p className="vn-big">Notas cortas, con capturas de cómo funciona hoy y sin jerga. Leés lo que cambió en tu producto y vas directo a probarlo.</p>
          </div>
        </section>

        <section id="notas" style={{ paddingTop: 128, scrollMarginTop: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="vn-label">(02)</div>
              <h2 className="vn-h">{latest.changesTitle}</h2>
            </div>
            <a href={newsUrl(latest.slug)} className="vn-btn line">
              Leer la nota completa
            </a>
          </div>
          <div className="vn-rail" style={{ marginTop: 32 }}>
            {latest.changes.map((change, index) => (
              <a key={change.title} href={`${newsUrl(latest.slug)}#${changeAnchor(index)}`} className="vn-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={change.cardImage ?? change.figure.src} alt="" width={2000} height={1250} loading="lazy" />
                <span className="vn-card-bottom" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                  <span>
                    <b>{change.title}</b>
                    <span style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      <span className="vn-tag">{change.where}</span>
                      <span className="vn-tag">{String(index + 1).padStart(2, "0")}</span>
                    </span>
                    <small>{change.short}</small>
                  </span>
                  <span className="vn-ghost">Ver cómo funciona</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section style={{ paddingTop: 128 }}>
          <div className="vn-label">(03)</div>
          <h2 className="vn-h">Todas las notas</h2>
          <div style={{ marginTop: 28 }}>
            {NEWS_ARTICLES.map((article) => (
              <a key={article.slug} href={newsUrl(article.slug)} className="vn-row">
                <time dateTime={article.date}>{formatNewsDate(article.date, "short")}</time>
                <b>{article.title}</b>
                <span>{article.tags.join(" · ")}</span>
                <i aria-hidden="true">
                  <ArrowUpRight className="size-4" />
                </i>
              </a>
            ))}
          </div>
        </section>
      </div>

      <div style={{ paddingTop: 48 }}>
        <NewsFooter />
      </div>
    </div>
  );
}
