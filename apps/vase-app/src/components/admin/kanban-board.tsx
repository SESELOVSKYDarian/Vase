"use client";

import { useState, type ReactNode } from "react";
import { AdminModal } from "@/components/admin/client-ficha";

export type KanbanCard = { id: string; title: string; sub?: string; meta?: string; tone?: string; detail: ReactNode; detailTitle?: string; detailSubtitle?: string };
export type KanbanColumn = { id: string; label: string; cards: KanbanCard[] };

/** Tablero de columnas; cada tarjeta abre su detalle en una ventana. */
export function KanbanBoard({ columns, emptyLabel = "Nada acá" }: { columns: KanbanColumn[]; emptyLabel?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = columns.flatMap((column) => column.cards).find((card) => card.id === openId) ?? null;
  return (
    <>
      <div className="adm-kanban">
        {columns.map((column) => (
          <section key={column.id} className="adm-col" aria-label={column.label}>
            <h4>
              {column.label}
              <span className="n">{column.cards.length}</span>
            </h4>
            {column.cards.length === 0 ? <div className="vpa-empty" style={{ padding: "18px 10px", fontSize: 12 }}>{emptyLabel}</div> : null}
            {column.cards.map((card) => (
              <button key={card.id} type="button" className="adm-kcard" onClick={() => setOpenId(card.id)}>
                <b>{card.title}</b>
                {card.sub ? <span>{card.sub}</span> : null}
                {card.meta ? (
                  <span className={`vpa-tag ${card.tone ?? ""}`} style={{ alignSelf: "flex-start" }}>
                    <i />
                    {card.meta}
                  </span>
                ) : null}
              </button>
            ))}
          </section>
        ))}
      </div>
      {open ? (
        <AdminModal title={open.detailTitle ?? open.title} subtitle={open.detailSubtitle ?? open.sub} onClose={() => setOpenId(null)}>
          {open.detail}
        </AdminModal>
      ) : null}
    </>
  );
}
