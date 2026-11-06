import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SECTIONS, guidesOf, sectionBySlug } from "../../../lib/guides";
import { GuideList } from "../../_components/ui";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ slug: section.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = sectionBySlug((await params).slug);
  return section ? { title: section.label, description: section.description } : {};
}

export default async function Page({ params }: Props) {
  const section = sectionBySlug((await params).slug);
  if (!section) notFound();
  const guides = guidesOf(section.slug);

  return (
    <main className="wrap narrow">
      <nav className="crumb"><Link href="/">Ayuda</Link>›<span>{section.label}</span></nav>
      <header className="art-head">
        <h1>{section.label}</h1>
        <p>{section.description}</p>
      </header>
      {guides.length ? <GuideList guides={guides} /> : (
        <div className="soon"><b>Estamos armando esta sección.</b>Mientras tanto, escribinos y te ayudamos.</div>
      )}
    </main>
  );
}
