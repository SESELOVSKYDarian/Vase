"use client";

import { Check, ChevronRight, PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { LabsCatalogRecord } from "../../../lib/catalog-service";

type Filter = "all" | "offered" | "excluded" | "out-of-stock";

function formatPrice(value: number | null) {
  if (value === null) return "Consultar";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export function CatalogWorkspace({ initialProducts }: { initialProducts: LabsCatalogRecord[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<LabsCatalogRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku ?? ""} ${product.aiAlias ?? ""}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "offered") return product.offeredByChatbot && product.active && product.stock > 0;
    if (filter === "excluded") return !product.offeredByChatbot;
    if (filter === "out-of-stock") return product.stock <= 0;
    return true;
  }), [products, query, filter]);

  async function persist(items: LabsCatalogRecord[]) {
    setSaving(true);
    const response = await fetch("/api/labs/catalog", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(items.map((product) => ({
        externalProductId: product.externalProductId,
        offeredByChatbot: product.offeredByChatbot,
        aiAlias: product.aiAlias,
        aiDescription: product.aiDescription,
        aiInstructions: product.aiInstructions,
      }))),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(payload.products)) {
      const updated = new Map<string, LabsCatalogRecord>((payload.products as LabsCatalogRecord[]).map((product) => [product.externalProductId, product]));
      setProducts((current) => current.map((product) => updated.get(product.externalProductId) ?? product));
    }
    setSaving(false);
    return response.ok;
  }

  async function bulkOffer(offeredByChatbot: boolean) {
    const updates = products.filter((product) => selected.has(product.externalProductId)).map((product) => ({ ...product, offeredByChatbot }));
    if (await persist(updates)) setSelected(new Set());
  }

  const offeredCount = products.filter((product) => product.offeredByChatbot && product.active && product.stock > 0).length;
  const lastSync = products.reduce((latest, product) => product.sourceUpdatedAt > latest ? product.sourceUpdatedAt : latest, "");

  return (
    <div className="labs-catalog-workspace">
      <header className="labs-catalog-heading">
        <div><span className="labs-modal-kicker">Conocimiento comercial</span><h1>Catalogo del chatbot</h1><p>Decidi que productos puede recomendar. Precio, stock y datos fuente siempre llegan desde Vase Business.</p></div>
        <div className="labs-catalog-sync"><span>Ultima sincronizacion</span><strong>{lastSync ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSync)) : "Sin datos"}</strong></div>
      </header>

      <section className="labs-catalog-stats">
        <article><span>Productos recibidos</span><strong>{products.length}</strong></article>
        <article><span>Disponibles para IA</span><strong>{offeredCount}</strong></article>
        <article><span>Sin stock</span><strong>{products.filter((product) => product.stock <= 0).length}</strong></article>
      </section>

      <div className="labs-catalog-toolbar">
        <label><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por producto, SKU o alias" /></label>
        <div className="labs-filter-row"><SlidersHorizontal className="size-4" />{(["all", "offered", "excluded", "out-of-stock"] as Filter[]).map((value) => <button key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "Todos" : value === "offered" ? "Ofrecidos" : value === "excluded" ? "Excluidos" : "Sin stock"}</button>)}</div>
      </div>

      {selected.size ? <div className="labs-bulk-bar"><strong>{selected.size} seleccionados</strong><button onClick={() => bulkOffer(true)} disabled={saving}>Ofrecer</button><button onClick={() => bulkOffer(false)} disabled={saving}>Excluir</button><button onClick={() => setSelected(new Set())}>Cancelar</button></div> : null}

      {visible.length ? (
        <div className="labs-catalog-table" role="table">
          <div className="labs-catalog-row labs-catalog-table-head" role="row"><span /><span>Producto</span><span>Precio</span><span>Stock</span><span>Chatbot</span><span /></div>
          {visible.map((product) => (
            <div className="labs-catalog-row" role="row" key={product.externalProductId}>
              <button className={`labs-check ${selected.has(product.externalProductId) ? "is-selected" : ""}`} onClick={() => setSelected((current) => { const next = new Set(current); if (next.has(product.externalProductId)) next.delete(product.externalProductId); else next.add(product.externalProductId); return next; })} aria-label={`Seleccionar ${product.name}`}>{selected.has(product.externalProductId) ? <Check className="size-3" /> : null}</button>
              <div className="labs-product-main">{product.imageUrl ? <Image src={product.imageUrl} alt="" width={44} height={44} unoptimized /> : <span><PackageSearch className="size-5" /></span>}<div><strong>{product.aiAlias || product.name}</strong><small>{product.sku || "Sin SKU"} · {product.categories.join(", ") || "Sin categoría"}</small></div></div>
              <strong className="labs-product-price">{formatPrice(product.price)}</strong>
              <span className={product.stock > 0 ? "labs-stock-ok" : "labs-stock-empty"}>{product.stock}</span>
              <button className={`labs-offer-switch ${product.offeredByChatbot ? "is-on" : ""}`} disabled={!product.active || product.stock <= 0 || saving} onClick={() => persist([{ ...product, offeredByChatbot: !product.offeredByChatbot }])}><span />{product.offeredByChatbot ? "Ofrecer" : "Excluido"}</button>
              <button className="labs-icon-button" onClick={() => setEditing(product)} aria-label={`Editar ${product.name}`}><ChevronRight className="size-4" /></button>
            </div>
          ))}
        </div>
      ) : <div className="labs-catalog-empty"><PackageSearch className="size-7" /><h2>No encontramos productos</h2><p>Ajusta la busqueda o espera la primera sincronizacion desde Business.</p></div>}

      {editing ? <CatalogDrawer product={editing} saving={saving} onClose={() => setEditing(null)} onSave={async (product) => { if (await persist([product])) setEditing(null); }} /> : null}
    </div>
  );
}

function CatalogDrawer({ product, saving, onClose, onSave }: { product: LabsCatalogRecord; saving: boolean; onClose(): void; onSave(product: LabsCatalogRecord): void }) {
  const [draft, setDraft] = useState(product);
  return <div className="labs-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="labs-catalog-drawer"><header><div><span className="labs-modal-kicker">Producto sincronizado</span><h2>{product.name}</h2></div><button className="labs-icon-button" onClick={onClose}><X className="size-4" /></button></header><section><div className="labs-source-panel"><strong>Datos de Vase Business</strong><dl><div><dt>SKU</dt><dd>{product.sku || "—"}</dd></div><div><dt>Precio</dt><dd>{formatPrice(product.price)}</dd></div><div><dt>Stock</dt><dd>{product.stock}</dd></div><div><dt>Descripcion</dt><dd>{product.description || "—"}</dd></div></dl><small>Estos campos se actualizan automaticamente y no pueden editarse aca.</small></div><div className="labs-ai-fields"><strong>Como lo presenta el chatbot</strong><label>Alias comercial<input value={draft.aiAlias ?? ""} onChange={(event) => setDraft({ ...draft, aiAlias: event.target.value || null })} /></label><label>Descripcion para IA<textarea rows={4} value={draft.aiDescription ?? ""} onChange={(event) => setDraft({ ...draft, aiDescription: event.target.value || null })} /></label><label>Instrucciones<textarea rows={4} value={draft.aiInstructions ?? ""} onChange={(event) => setDraft({ ...draft, aiInstructions: event.target.value || null })} /></label><label className="labs-offer-checkbox"><input type="checkbox" checked={draft.offeredByChatbot} disabled={draft.stock <= 0 || !draft.active} onChange={(event) => setDraft({ ...draft, offeredByChatbot: event.target.checked })} /> Permitir que el chatbot lo ofrezca</label></div></section><footer><button className="labs-button labs-button-secondary" onClick={onClose}>Cancelar</button><button className="labs-button labs-button-primary" disabled={saving} onClick={() => onSave(draft)}>{saving ? "Guardando..." : "Guardar cambios"}</button></footer></aside></div>;
}
