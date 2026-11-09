import Link from "next/link";
import { redirect } from "next/navigation";
import { GUIDES, SECTIONS, guideByTitle, guidesOf, searchGuides, sectionByName } from "../lib/guides";
import { GuideList, SearchBox } from "./_components/ui";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || "";

// El panel abre /?q=<guía> y /?seccion=<sección>. Si coincide exacto, va directo a la página.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const seccion = first(params.seccion).trim();

  if (seccion) {
    const section = sectionByName(seccion);
    if (section) redirect(`/seccion/${section.slug}`);
  }
  if (q) {
    const exact = guideByTitle(q);
    if (exact) redirect(`/guias/${exact.slug}`);
    const results = searchGuides(q);
    return (
      <main className="wrap narrow">
        <div style={{ padding: "40px 0 24px" }}><SearchBox defaultValue={q} /></div>
        <h1 className="h2" style={{ marginTop: 8 }}>{results.length ? `Resultados para “${q}”` : `No encontramos guías para “${q}”`}</h1>
        {results.length ? <GuideList guides={results} /> : (
          <div className="empty-state">Probá con otras palabras, como “precio”, “oferta” o “stock”, o mirá las secciones de abajo.</div>
        )}
        <Sections />
      </main>
    );
  }

  const ready = GUIDES.filter((guide) => guide.status === "listo");
  return (
    <main className="wrap">
      <section className="hero narrow">
        <span className="kick"><i />Vase Business</span>
        <h1>¿En qué te ayudamos?</h1>
        <p>Guías cortas, con video, para cada pantalla del panel de tu tienda.</p>
        <SearchBox />
      </section>
      <h2 className="h2">Las más vistas</h2>
      <div className="narrow"><GuideList guides={ready} /></div>
      <Sections />
    </main>
  );
}

function Sections() {
  return (
    <>
      <h2 className="h2">Por sección</h2>
      <div className="grid">
        {SECTIONS.map((section) => {
          const guides = guidesOf(section.slug);
          const ready = guides.filter((guide) => guide.status === "listo").length;
          return (
            <Link key={section.slug} href={`/seccion/${section.slug}`} className="card">
              <b>{section.label}</b>
              <span>{section.description}</span>
              <div className="meta">
                {guides.length ? <span className="tag">{guides.length} {guides.length === 1 ? "guía" : "guías"}</span> : <span className="tag">Próximamente</span>}
                {ready ? <span className="tag g">{ready} con video</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
