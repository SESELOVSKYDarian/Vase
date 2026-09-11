"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priceList } from "@/lib/mock-data";
import { formatARS, formatDate } from "@/lib/format";
import { Plus, History, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

export default function PreciosPage() {
  const [products, setProducts] = useState(priceList);
  const [history, setHistory] = useState<Record<string, Array<(typeof priceList)[number]>>>({});
  const [historyProduct, setHistoryProduct] = useState<(typeof priceList)[number] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof priceList)[number] | null>(null);
  const [form, setForm] = useState({ nombre: "", categoria: "SIMPLE", precioM2: "", precioMl: "", vigenteDesde: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<string[]>(["SIMPLE", "DVH", "TEMPLADO", "PULIDO", "SOLO_CORTE", "DISTRIBUCION"]);
  useEffect(() => { fetch("/api/industria/categories").then((r) => r.json()).then((payload) => { if (payload.data?.length) setCategories(payload.data.map((item: { nombre: string }) => item.nombre)); }).catch(() => {}); }, []);
  function startEdit(p: (typeof priceList)[number]) { setEditing(p); setForm({ nombre: p.producto, categoria: p.categoria, precioM2: String(p.precioM2), precioMl: p.precioMl ? String(p.precioMl) : "", vigenteDesde: p.vigenteDesde }); setOpen(true); }
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(""); const payload = { ...form, precioM2: Number(form.precioM2), precioMl: form.precioMl ? Number(form.precioMl) : "" }; const response = await fetch("/api/industria/products", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload) }); if (!response.ok) { setError((await response.json()).error ?? "No se pudo guardar"); return; } if (editing) setHistory((items) => ({ ...items, [editing.id]: [...(items[editing.id] ?? []), editing] })); setProducts((items) => editing ? items.map((item) => item.id === editing.id ? { ...item, producto: form.nombre, categoria: form.categoria as any, precioM2: Number(form.precioM2), precioMl: form.precioMl ? Number(form.precioMl) : undefined, vigenteDesde: form.vigenteDesde } : item) : [...items, { id: `local-${Date.now()}`, producto: form.nombre, categoria: form.categoria as any, precioM2: Number(form.precioM2), precioMl: form.precioMl ? Number(form.precioMl) : undefined, vigenteDesde: form.vigenteDesde }]); setSaved(true); setTimeout(() => { setOpen(false); setSaved(false); setEditing(null); }, 700); }
  async function remove(id: string) { if (!window.confirm("¿Eliminar este producto de la lista?")) return; const response = await fetch(`/api/industria/products?id=${id}`, { method: "DELETE" }); if (!response.ok) { setError("No se pudo eliminar el producto"); return; } setProducts((items) => items.filter((item) => item.id !== id)); }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Lista de precios</h1>
          <p className="text-sm text-muted-foreground">Los presupuestos guardan un snapshot: cambiar acá nunca afecta presupuestos históricos</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuevo producto</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Precio / m²</th>
              <th className="px-4 py-3 text-right">Precio / ml (pulido)</th>
              <th className="px-4 py-3">Vigente desde</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-secondary/40"
              >
                <td className="px-4 py-3 font-medium">{p.producto}</td>
                <td className="px-4 py-3"><Badge variant="outline">{p.categoria}</Badge></td>
                <td className="px-4 py-3 text-right tabular-nums">{formatARS(p.precioM2)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.precioMl ? formatARS(p.precioMl) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.vigenteDesde)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => startEdit(p)} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-vase-green/30 bg-vase-green-soft px-3 text-xs font-medium text-vase-green transition-colors hover:bg-vase-green hover:text-white"><Pencil className="h-3.5 w-3.5" /> Editar</button><button type="button" onClick={() => remove(p.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" /> Borrar</button><button type="button" onClick={() => setHistoryProduct(p)} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><History className="h-3.5 w-3.5" /> Historial</button></div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo producto" description="Sumá un producto a la lista de precios activa." size="md" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button form="product-form" type="submit" disabled={saved}>{saved ? "Guardado" : "Guardar producto"}</Button></>}>
        <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="product-name">Nombre</Label><Input id="product-name" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Float 8mm" /></div>
          <div><Label htmlFor="product-category">Categoría</Label><Select id="product-category" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</Select></div>
          <div><Label htmlFor="product-date">Vigente desde</Label><Input id="product-date" type="date" required value={form.vigenteDesde} onChange={(e) => setForm({ ...form, vigenteDesde: e.target.value })} /></div>
          <div><Label htmlFor="product-m2">Precio por m²</Label><Input id="product-m2" type="number" min="0" step="0.01" required value={form.precioM2} onChange={(e) => setForm({ ...form, precioM2: e.target.value })} /></div>
          <div><Label htmlFor="product-ml">Precio por ml (opcional)</Label><Input id="product-ml" type="number" min="0" step="0.01" value={form.precioMl} onChange={(e) => setForm({ ...form, precioMl: e.target.value })} /></div>
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        </form>
      </Modal>
      <Modal open={!!historyProduct} onClose={() => setHistoryProduct(null)} title={`Historial · ${historyProduct?.producto ?? "Producto"}`} description="Versiones anteriores de precios y categoría." size="lg">
        {historyProduct && <div className="space-y-3"><div className="rounded-lg border border-vase-green/30 bg-vase-green-soft/40 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Versión actual</p><span className="rounded-full bg-vase-green px-2 py-0.5 text-[10px] font-medium text-white">Actual</span></div><div className="mt-3 grid gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Producto</p><p className="font-medium">{historyProduct.producto}</p></div><div><p className="text-xs text-muted-foreground">Categoría</p><p className="font-medium">{historyProduct.categoria}</p></div><div><p className="text-xs text-muted-foreground">Precio / m²</p><p className="font-medium">{formatARS(historyProduct.precioM2)}</p></div><div><p className="text-xs text-muted-foreground">Precio / ml</p><p className="font-medium">{historyProduct.precioMl ? formatARS(historyProduct.precioMl) : "—"}</p></div></div></div>{(history[historyProduct.id] ?? []).length > 0 ? history[historyProduct.id].slice().reverse().map((version, index) => <div key={`${version.id}-${index}`} className="rounded-lg border border-border p-4"><p className="text-sm font-semibold">Versión anterior {index + 1}</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Producto</p><p>{version.producto}</p></div><div><p className="text-xs text-muted-foreground">Categoría</p><p>{version.categoria}</p></div><div><p className="text-xs text-muted-foreground">Precio / m²</p><p>{formatARS(version.precioM2)}</p></div><div><p className="text-xs text-muted-foreground">Precio / ml</p><p>{version.precioMl ? formatARS(version.precioMl) : "—"}</p></div></div></div>) : <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No hay versiones anteriores registradas para este producto.</p>}</div>}
      </Modal>
    </div>
  );
}
