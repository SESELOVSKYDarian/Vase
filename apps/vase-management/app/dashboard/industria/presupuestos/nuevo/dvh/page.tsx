"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, Trash2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { computeDvhQuote, CAMARA_PRECIOS_ML } from "@/lib/calculations/dvh";
import type { DvhItemInput } from "@/lib/calculations/types";
import { clients } from "@/lib/mock-data";
import { formatARS, formatM2, formatNumber } from "@/lib/format";

const GLASS_OPTIONS = [
  { tipo: "Float 4mm", espesorMm: 4, precioM2: 12000 },
  { tipo: "Float 5mm", espesorMm: 5, precioM2: 14500 },
  { tipo: "Float 6mm", espesorMm: 6, precioM2: 17800 },
  { tipo: "Laminado 3+3", espesorMm: 6, precioM2: 26500 },
  { tipo: "Templado 6mm", espesorMm: 6, precioM2: 28900 },
];

function emptyItem(id: string): DvhItemInput {
  return {
    id,
    composicion: "4/12/4",
    vidrioExterior: GLASS_OPTIONS[0],
    vidrioInterior: GLASS_OPTIONS[0],
    camara: "12mm",
    separador: "ALUMINIO",
    sellado: "SIMPLE",
    cantidad: 1,
    anchoMm: 1000,
    altoMm: 1000,
    precioSeparadorMl: 1500,
    precioSelladoMl: 800,
    precioCamaraMl: CAMARA_PRECIOS_ML["12mm"],
    costoInsumosExtraUnitario: 500,
    costoManoObraM2: 1800,
    margenPct: 30,
    bonificacionPct: 0,
  };
}

export default function NuevoPresupuestoDvhPage() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [availableClients, setAvailableClients] = useState(clients);
  const [clienteId, setClienteId] = useState(clients[0].id);
  const [obra, setObra] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const nextItemId = useRef(2);
  const [items, setItems] = useState<DvhItemInput[]>([emptyItem("item-1")]);
  useEffect(() => { fetch("/api/industria/clients").then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.data?.length) { setAvailableClients(payload.data); setClienteId(payload.data[0].id); } }).catch(() => {}); }, []);

  const { items: computed, totals } = useMemo(() => computeDvhQuote(items), [items]);

  function updateItem(id: string, patch: Partial<DvhItemInput>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem(`item-${nextItemId.current++}`)]);
  }
  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }
  function setGlass(id: string, side: "vidrioExterior" | "vidrioInterior", tipo: string) {
    const g = GLASS_OPTIONS.find((g) => g.tipo === tipo);
    if (!g) return;
    updateItem(id, { [side]: g } as any);
  }
  async function saveQuote(estado: "BORRADOR" | "ENVIADO") { setSaveError(""); if (!fechaEntrega) { setSaveError("Seleccioná una fecha de entrega."); return; } setSaving(true); try { const response = await fetch("/api/industria/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "DVH", clienteId, obra, fechaEntrega, estado, totals: { cantidad: totals.cantidadTotalUnidades, m2: totals.m2Total, subtotalBruto: totals.subtotalBruto, bonificacion: totals.montoBonificacion, subtotalNeto: totals.subtotalNeto, iva: totals.iva, total: totals.total }, items: computed }) }); if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "No se pudo guardar el presupuesto."); window.location.href = "/dashboard/industria/presupuestos"; } catch (error: any) { setSaveError(error.message); } finally { setSaving(false); } }

  return (
    <div className="space-y-6 pb-24">
      <Link href="/dashboard/industria/presupuestos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a presupuestos
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vase-green-soft text-vase-green-dark">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nuevo presupuesto — DVH</h1>
          <p className="text-sm text-muted-foreground">Motor de cálculo DVH: vidrios + separador + sellado + insumos + margen</p>
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
          <CardTitle>Composiciones DVH</CardTitle>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Agregar composición
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
                  <p className="text-xs font-semibold text-muted-foreground">
                    Composición {idx + 1} · espesor total {item.espesorTotalMm}mm
                  </p>
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  <div>
                    <Label>Vidrio exterior</Label>
                    <Select value={item.vidrioExterior.tipo} onChange={(e) => setGlass(item.id, "vidrioExterior", e.target.value)}>
                      {GLASS_OPTIONS.map((g) => <option key={g.tipo} value={g.tipo}>{g.tipo} · {formatARS(g.precioM2)}/m²</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Vidrio interior</Label>
                    <Select value={item.vidrioInterior.tipo} onChange={(e) => setGlass(item.id, "vidrioInterior", e.target.value)}>
                      {GLASS_OPTIONS.map((g) => <option key={g.tipo} value={g.tipo}>{g.tipo} · {formatARS(g.precioM2)}/m²</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Cámara</Label>
                    <Select value={item.camara} onChange={(e) => updateItem(item.id, { camara: e.target.value as any, precioCamaraMl: CAMARA_PRECIOS_ML[e.target.value as keyof typeof CAMARA_PRECIOS_ML] })}>
                      <option value="9mm">9mm · {formatARS(CAMARA_PRECIOS_ML["9mm"])}/ml</option>
                      <option value="12mm">12mm · {formatARS(CAMARA_PRECIOS_ML["12mm"])}/ml</option>
                      <option value="15mm">15mm · {formatARS(CAMARA_PRECIOS_ML["15mm"])}/ml</option>
                      <option value="16mm">16mm · {formatARS(CAMARA_PRECIOS_ML["16mm"])}/ml</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Separador</Label>
                    <Select value={item.separador} onChange={(e) => updateItem(item.id, { separador: e.target.value as any })}>
                      <option value="ALUMINIO">Aluminio</option>
                      <option value="WARM_EDGE">Warm edge</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Sellado</Label>
                    <Select value={item.sellado} onChange={(e) => updateItem(item.id, { sellado: e.target.value as any })}>
                      <option value="SIMPLE">Simple</option>
                      <option value="DOBLE_SELLADO_ESTRUCTURAL">Doble sellado estructural</option>
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
                    <Label>Margen %</Label>
                    <Input type="number" min={0} value={item.margenPct} onChange={(e) => updateItem(item.id, { margenPct: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Bonif. %</Label>
                    <Input type="number" min={0} max={100} value={item.bonificacionPct} onChange={(e) => updateItem(item.id, { bonificacionPct: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="mt-4 grid gap-2 rounded-lg bg-secondary/35 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <CostLine label={`Vidrio exterior · ${item.vidrioExterior.tipo}`} value={item.costoVidrioExteriorUnitario} hint={`${formatARS(item.vidrioExterior.precioM2)} / m²`} />
                  <CostLine label={`Vidrio interior · ${item.vidrioInterior.tipo}`} value={item.costoVidrioInteriorUnitario} hint={`${formatARS(item.vidrioInterior.precioM2)} / m²`} />
                  <CostLine label={`Cámara · ${item.camara}`} value={item.costoCamaraUnitario} hint={`${formatARS(item.precioCamaraMl ?? 0)} / ml`} />
                  <CostLine label={`Separador · ${item.separador}`} value={item.costoSeparadorUnitario} hint={`${formatARS(item.precioSeparadorMl)} / ml`} />
                  <CostLine label={`Sellado · ${item.sellado}`} value={item.costoSelladoUnitario} hint={`${formatARS(item.precioSelladoMl)} / ml`} />
                  <CostLine label="Mano de obra" value={item.costoManoObraUnitario} hint={`${formatARS(item.costoManoObraM2 ?? 0)} / m²`} />
                  <CostLine label="Insumos adicionales" value={item.costoInsumosExtraUnitario} hint="por unidad" />
                  <CostLine label={`Recargo por tamaño · ${item.recargoTamanoPct}%`} value={item.recargoTamanoPct ? item.costoTotalUnitario - (item.costoTotalUnitario / (1 + item.recargoTamanoPct / 100)) : 0} hint="sobre costo" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>m² total: <b className="text-foreground">{formatNumber(item.m2Total)}</b></span>
                  <span>perímetro: <b className="text-foreground">{formatNumber(item.perimetroMl)} ml</b></span>
                  <span>costo unitario: <b className="text-foreground">{formatARS(item.costoTotalUnitario)}</b></span>
                  <span>precio venta unitario: <b className="text-foreground">{formatARS(item.precioVentaUnitario)}</b></span>
                  <span className="ml-auto text-sm font-semibold text-vase-green">{formatARS(item.subtotalNeto)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-md lg:left-64"
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>{totals.cantidadTotalUnidades} unidades</span>
            <span>{formatM2(totals.m2Total)}</span>
            <span>Costo total: {formatARS(totals.costoTotal)}</span>
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

function CostLine({ label, value, hint }: { label: string; value: number; hint: string }) { return <div className="min-w-0"><p className="truncate font-medium text-foreground">{label}</p><p className="font-semibold tabular-nums text-vase-green">{formatARS(value)}</p><p className="text-[11px] text-muted-foreground">{hint}</p></div>; }
