"use client";

import { CircleHelp, FileText, PlayCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

// Ayuda de Labs, igual que la de Business: guías cortas de cada pantalla (videos y artículos) y el
// manual completo en help.vase.ar. Las guías sin video o artículo todavía dicen "En proceso".

type Guide = { title: string; kind: "video" | "articulo"; time: string; href?: string };

const HELP_URL = "https://help.vase.ar";

export const LABS_HELP: Record<string, { title: string; guides: Guide[] }> = {
  inicio: {
    title: "Inicio",
    guides: [
      { title: "Entender el inicio de Labs", kind: "video", time: "1 min" },
      { title: "Qué significa cada número", kind: "articulo", time: "2 min" },
    ],
  },
  conversaciones: {
    title: "Conversaciones",
    guides: [
      { title: "Atender una conversación vos", kind: "video", time: "1 min" },
      { title: "Devolverle la charla a la IA", kind: "video", time: "30 s" },
      { title: "Ver la bandeja en pantalla completa", kind: "video", time: "30 s" },
      { title: "Cuándo el asistente te pasa una charla", kind: "articulo", time: "2 min" },
    ],
  },
  pedidos: {
    title: "Pedidos",
    guides: [
      { title: "Cambiar el estado de un pedido", kind: "video", time: "30 s" },
      { title: "Qué le llega al cliente en cada paso", kind: "articulo", time: "2 min" },
    ],
  },
  asistente: {
    title: "Asistente",
    guides: [
      { title: "Elegir el tono y las reglas", kind: "video", time: "1 min" },
      { title: "Probar el asistente antes de usarlo", kind: "video", time: "30 s" },
      { title: "Qué sabe y de dónde lo saca", kind: "articulo", time: "3 min" },
      { title: "Enseñarle por WhatsApp", kind: "video", time: "1 min" },
    ],
  },
  ajustes: {
    title: "Ajustes",
    guides: [
      { title: "Conectar WhatsApp, Instagram y Messenger", kind: "articulo", time: "3 min" },
      { title: "Cargar la clave de OpenAI", kind: "articulo", time: "2 min" },
    ],
  },
};

function GuideRow({ guide }: { guide: Guide }) {
  const Icon = guide.kind === "video" ? PlayCircle : FileText;
  const body = (
    <>
      <span className="lx-hic" aria-hidden="true"><Icon size={18} /></span>
      <span className="vpa-g1">
        <b>{guide.title}</b>
        <span>{guide.kind === "video" ? "Video" : "Artículo"} · {guide.time}</span>
      </span>
      {guide.href ? null : <span className="vpa-tag">En proceso</span>}
    </>
  );
  return guide.href ? (
    <a className="lx-hrow" href={guide.href} target="_blank" rel="noreferrer">{body}</a>
  ) : (
    <div className="lx-hrow off" aria-disabled="true">{body}</div>
  );
}

export function LabsHelpButton({ section }: { section: string }) {
  const [open, setOpen] = useState<"seccion" | "todo" | null>(null);
  const current = LABS_HELP[section] ?? LABS_HELP.inicio;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const all = Object.values(LABS_HELP);

  return (
    <>
      <button type="button" className="vpa-ib" onClick={() => setOpen("seccion")} aria-label="Ayuda de esta sección" title="Ayuda de esta sección">
        <CircleHelp size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div className="vpa-ov lx-help-ov" onClick={() => setOpen(null)}>
          <div className="vpa-dr" role="dialog" aria-label="Ayuda" onClick={(event) => event.stopPropagation()}>
            <div className="vpa-mh">
              <div>
                <h3>{open === "seccion" ? `Ayuda · ${current.title}` : "Ayuda y soporte"}</h3>
                <p>{open === "seccion" ? "Videos y artículos cortos de lo que podés hacer en esta pantalla." : "Todos los videos, artículos y novedades de Labs."}</p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setOpen(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lx-help">
              {open === "seccion" ? (
                <>
                  {current.guides.map((guide) => <GuideRow key={guide.title} guide={guide} />)}
                  <button type="button" className="vpa-btn soft" onClick={() => setOpen("todo")}>Ver toda la ayuda</button>
                </>
              ) : (
                <>
                  <div className="lx-help-note">Las guías de Labs se están grabando. El manual completo va a estar en help.vase.ar.</div>
                  {all.map((group) => (
                    <section key={group.title} className="lx-help-grp">
                      <h4>{group.title}</h4>
                      {group.guides.map((guide) => <GuideRow key={guide.title} guide={guide} />)}
                    </section>
                  ))}
                  <section className="lx-help-grp">
                    <h4>Novedades y publicaciones</h4>
                    <a className="lx-hrow" href={HELP_URL} target="_blank" rel="noreferrer">
                      <span className="lx-hic" aria-hidden="true"><FileText size={18} /></span>
                      <span className="vpa-g1"><b>Novedades de Vase</b><span>Lo último que sumamos, en help.vase.ar</span></span>
                    </a>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
