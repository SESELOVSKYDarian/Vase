import Link from "next/link";
import type { Block, Guide } from "../../lib/guides";

export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form className="search" action="/" method="get" role="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input name="q" defaultValue={defaultValue} placeholder="¿Qué querés hacer? Ej.: subir precios, crear una oferta" aria-label="Buscar en la ayuda" autoFocus={autoFocus} autoComplete="off" />
      <button className="btn" type="submit">Buscar</button>
    </form>
  );
}

export function StatusTag({ guide }: { guide: Guide }) {
  if (guide.status === "borrador") return <span className="tag">En preparación</span>;
  return guide.video ? <span className="tag g">Con video</span> : <span className="tag g">Guía</span>;
}

export function GuideList({ guides }: { guides: Guide[] }) {
  return (
    <div className="list">
      {guides.map((guide, index) => {
        const inner = (
          <>
            <span className="n">{index + 1}</span>
            <span className="t"><b>{guide.title}</b><span>{guide.summary}</span></span>
            <StatusTag guide={guide} />
            <span className="time">{guide.video ? `${guide.video.seconds} s` : guide.time}</span>
          </>
        );
        return (
          <Link key={guide.slug} href={`/guias/${guide.slug}`} className={`gl ${guide.status === "borrador" ? "off" : ""}`}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h": return <h2 key={index}>{block.text}</h2>;
          case "p": return <p key={index}>{block.text}</p>;
          case "steps": return <ol key={index} className="steps">{block.items.map((item) => <li key={item}>{item}</li>)}</ol>;
          case "list": return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
          case "tip": return <div key={index} className="note tip"><b>Tip</b>{block.text}</div>;
          case "warn": return <div key={index} className="note warn"><b>Ojo</b>{block.text}</div>;
          case "faq": return <details key={index} className="faq"><summary>{block.q}</summary><p>{block.a}</p></details>;
        }
      })}
    </>
  );
}
