import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug, guidesOf, sectionBySlug } from "../../../lib/guides";
import { Blocks, StatusTag } from "../../_components/ui";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.summary,
    openGraph: guide.video ? { images: [guide.video.posterLight] } : undefined,
  };
}

export default async function Page({ params }: Props) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const section = sectionBySlug(guide.section);
  const siblings = guidesOf(guide.section).filter((item) => item.slug !== guide.slug && item.status === "listo").slice(0, 2);

  return (
    <main className="wrap narrow">
      <nav className="crumb">
        <Link href="/">Ayuda</Link>›
        {section ? <><Link href={`/seccion/${section.slug}`}>{section.label}</Link>›</> : null}
        <span>{guide.title}</span>
      </nav>
      <header className="art-head">
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
        <div className="meta">
          <span className="tag">{guide.screen}</span>
          <StatusTag guide={guide} />
          <span className="time">{guide.video ? `Video de ${guide.video.seconds} s` : guide.time === "FAQ" ? "Preguntas frecuentes" : guide.time}</span>
        </div>
      </header>

      {guide.status === "borrador" ? (
        <div className="soon">
          <b>Esta guía está en preparación.</b>
          Pronto vas a tener acá el paso a paso y un video corto. Si lo necesitás ya, escribinos y te ayudamos.
        </div>
      ) : (
        <>
          {guide.video ? (
            <div className="video">
              <video className="v-dark" controls preload="none" playsInline poster={guide.video.poster} src={guide.video.src}>
                Tu navegador no puede reproducir este video.
              </video>
              <video className="v-light" controls preload="none" playsInline poster={guide.video.posterLight} src={guide.video.srcLight}>
                Tu navegador no puede reproducir este video.
              </video>
            </div>
          ) : null}
          <article className="prose"><Blocks blocks={guide.body} /></article>
        </>
      )}

      {siblings.length ? (
        <div className="next">
          {siblings.map((item) => (
            <Link key={item.slug} href={`/guias/${item.slug}`} className="card">
              <small>También en {section?.label}</small>
              <b>{item.title}</b>
              <span>{item.summary}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </main>
  );
}
