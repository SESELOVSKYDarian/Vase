"use client";

import { useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Fila de tarjetas que se desliza con las flechas (y con el dedo en el celular).
export function NewsRail({ title, children }: { title: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const move = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <section className="vn-railbox">
      <div className="vn-railhead">
        <h2>{title}</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="vn-round" onClick={() => move(-1)} aria-label="Anteriores">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="vn-round" onClick={() => move(1)} aria-label="Siguientes">
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="vn-track" ref={trackRef}>
        {children}
      </div>
    </section>
  );
}
