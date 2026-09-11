"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { computeSimpleGlassQuote } from "@/lib/calculations/simple-glass";
import type { SimpleGlassItemInput } from "@/lib/calculations/types";
import { clients, priceList } from "@/lib/mock-data";
import { formatARS, formatM2, formatNumber } from "@/lib/format";

function emptyItem(id: string): SimpleGlassItemInput {
  const p = priceList.find((p) => p.categoria === "SIMPLE")!;
  return {
    id,
    producto: p.producto,
    cantidad: 1,
    anchoMm: 1000,
    altoMm: 1000,
    carasPulidasAncho: 0,
    carasPulidasAlto: 0,
    precioM2: p.precioM2,
    precioPulidoMl: p.precioMl ?? 0,
    bonificacionPct: 0,
  };
}

export default function NuevoPresupuestoSimplePage() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [availableClients, setAvailableClients] = useState(clients);
  const [clienteId, setClienteId] = useState(clients[0].id);
  const [obra, setObra] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const nextItemId = useRef(2);
  const [items, setItems] = useState<SimpleGlassItemInput[]>([emptyItem("item-1")]);
  useEffect(() => { fetch("/api/industria/clients").then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.data?.length) { setAvailableClients(payload.data); setClienteId(payload.data[0].id); } }).catch(() => {}); }, []);

  const simpleProducts = priceList.filter((p) => p.categoria === "SIMPLE" || p.categoria === "TEMPLADO");

  const { items: computed, totals } = useMemo(() => computeSimpleGlassQuote(items), [items]);

  function updateItem(id: string, patch: Partial<SimpleGlassItemInput>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem(`item-${nextItemId.current++}`)]);
  }
  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }
  function onProductChange(id: string, productoNombre: string) {
    const p = simpleProducts.find((p) => p.producto === productoNombre);
    if (!p) return;
    updateItem(id, { producto: p.producto, precioM2: p.precioM2, precioPulidoMl: p.precioMl ?? 0 });
  }
  async function saveQuote(estado: "BORRADOR" | "ENVIADO") { setSaveError(""); if (!fechaEntrega) { setSaveError("Seleccioná una fecha de entrega."); return; } setSaving(true); try { const response = await fetch("/api/industria/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "SIMPLE", clienteId, obra, fechaEntrega, estado, totals: { cantidad: totals.cantidadTotalVidrios, m2: totals.m2Total, subtotalBruto: totals.subtotalBruto, bonificacion: totals.montoBonificacion, subtotalNeto: totals.subtotalNeto, iva: totals.iva, total: totals.total }, items: computed }) }); if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "No se pudo guardar el presupuesto."); window.location.href = "/dashboard/industria/presupuestos"; } catch (error: any) { setSaveError(error.message); } finally { setSaving(false); } }

  return (
    <div className="space-y-6 pb-24">
      <Link href="/dashboard/industria/presupuestos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a presupuestos
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vase-green-soft text-vase-green-dark">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nuevo presupuesto — Vidrio simple</h1>
          <p className="text-sm text-muted-foreground">Los cálculos se generan en tiempo real con el motor de vidrio simple</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Cliente</Label>
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {availableClients.map((c) => (
                <option key={c.id} value={c.id}>{c.razonSocial}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Obra</Label>
            <Input value={obra} onChange={(e) => setObra(e.target.value)} placeholder="Nombre de la obra" />
          </div>
          <div>
            <Label>Fecha de entrega</Label>
            <Input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
          </div>
          <div>
            <Label>Código cliente</Label>
            <Input value={availableClients.find((c) => c.id === clienteId)?.codigoCliente ?? ""} disabled />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Ítems</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Agregar ítem
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <AnimatePresence initial={false}>
            {computed.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Ítem {idx + 1}</p>
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  <div className="col-span-2">
                    <Label>Producto</Label>
                    <Select value={item.producto} onChange={(e) => onProductChange(item.id, e.target.value)}>
                      {simpleProducts.map((p) => (
                        <option key={p.id} value={p.producto}>{p.producto}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min={1} value={item.cantidad} onChange={(e) => updateItem(item.id, { cantidad: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Ancho (mm)</Label>
                    <Input type="number" min={1} value={item.anchoMm} onChange={(e) => updateItem(item.id, { anchoMm: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Alto (mm)</Label>
                    <Input type="number" min={1} value={item.altoMm} onChange={(e) => updateItem(item.id, { altoMm: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Pulido ancho</Label>
                    <Select value={item.carasPulidasAncho} onChange={(e) => updateItem(item.id, { carasPulidasAncho: Number(e.target.value) as 0 | 1 | 2 })}>
                      <option value={0}>0 caras</option>
                      <option value={1}>1 cara</option>
                      <option value={2}>2 caras</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Pulido alto</Label>
                    <Select value={item.carasPulidasAlto} onChange={(e) => updateItem(item.id, { carasPulidasAlto: Number(e.target.value) as 0 | 1 | 2 })}>
                      <option value={0}>0 caras</option>
                      <option value={1}>1 cara</option>
                      <option value={2}>2 caras</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Bonif. %</Label>
                    <Input type="number" min={0} max={100} value={item.bonificacionPct} onChange={(e) => updateItem(item.id, { bonificacionPct: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>m² unitario: <b className="text-foreground">{formatNumber(item.m2Unitario)}</b></span>
                  <span>m² total: <b className="text-foreground">{formatNumber(item.m2Total)}</b></span>
                  <span>ml pulido: <b className="text-foreground">{formatNumber(item.metrosLinealesPulido)}</b></span>
                  <span>{item.observacionesPulido}</span>
                  <span className="ml-auto text-sm font-semibold text-vase-green">{formatARS(item.subtotalNeto)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Sticky totals bar */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-md lg:left-64"
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>{totals.cantidadTotalVidrios} vidrios</span>
            <span>{formatM2(totals.m2Total)}</span>
            <span>Bonif: {formatARS(totals.montoBonificacion)}</span>
            <span>IVA: {formatARS(totals.iva)}</span>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-lg font-bold tabular-nums">{formatARS(totals.total)}</p>
            <Button variant="outline" disabled={saving} onClick={() => saveQuote("BORRADOR")}>{saving ? "Guardando…" : "Guardar borrador"}</Button>
            <Button disabled={saving} onClick={() => saveQuote("ENVIADO")}>Guardar y enviar</Button>
            {saveError && <p className="w-full text-right text-xs text-red-600">{saveError}</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
