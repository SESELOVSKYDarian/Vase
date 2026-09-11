"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatARS, formatDate } from "@/lib/format";
import { Receipt, Wallet, Search, Pencil, Trash2, History, Printer, MinusCircle, PlusCircle } from "lucide-react";
export default function FacturacionPage() {
  const [invoices, setInvoices] = useState<any[]>([]),
    [notes, setNotes] = useState<any[]>([]),
    [approvedQuotes, setApprovedQuotes] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<any>(null),
    [source, setSource] = useState<"remito" | "presupuesto">("remito"),
    [search, setSearch] = useState(""),
    [type, setType] = useState("N"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<any>(null),
    [remove, setRemove] = useState<any>(null),
    [filter, setFilter] = useState("TODOS"),
    [adjustment, setAdjustment] = useState<any>(null),
    [adjustmentReason, setAdjustmentReason] = useState("DEVOLUCION"),
    [adjustmentDescription, setAdjustmentDescription] = useState(""),
    [adjustmentMode, setAdjustmentMode] = useState("BORRADOR"),
    [adjustmentItems, setAdjustmentItems] = useState<any[]>([]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [filterClientId, setFilterClientId] = useState(""); const [page, setPage] = useState(1); const [totalInvoices, setTotalInvoices] = useState(0); const pageSize = 15;
  const load = () =>
    Promise.all([
      fetch(`/api/industria/invoices?page=${page}&pageSize=${pageSize}${filterClientId ? `&clientId=${filterClientId}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`).then((r) => r.json()),
      fetch("/api/industria/delivery-notes").then((r) => r.json()),
      fetch("/api/industria/quotes?status=APROBADO").then((r) => r.json()),
    ]).then(([a, b, c]) => {
      setInvoices(a.data ?? []);
      setTotalInvoices(a.count ?? 0);
      setNotes((b.data ?? []).filter((n: any) => n.estado === "CONFIRMADO"));
      setApprovedQuotes(c.data ?? []);
    });
  useEffect(() => {
    load();
  }, [page, from, to, filterClientId]);
  const suggestions = useMemo(
    () =>
      (source === "remito" ? notes : approvedQuotes.filter((quote) => !quote.invoices?.length && quote.workOrder))
        .filter((n) =>
          `${n.numero} ${n.workOrder?.numero} ${n.client?.razonSocial}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 8),
    [notes, approvedQuotes, search, source],
  );
  async function create() {
    if (!selected) return;
    setBusy(true);
    const r = await fetch("/api/industria/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workOrderId: selected.workOrderId ?? selected.workOrder?.id,
        quoteId: source === "presupuesto" ? selected.id : selected.workOrder?.quoteId,
        tipoFacturacion: type,
      }),
    });
    if (!r.ok)
      setError(
        (await r.json().catch(() => null))?.error ?? "No se pudo emitir",
      );
    else {
      setOpen(false);
      load();
    }
    setBusy(false);
  }
  async function removeInvoice() {
    setBusy(true);
    const r = await fetch(`/api/industria/invoices/${remove.id}`, { method: "DELETE" });
    if (!r.ok)
      setError(
        (await r.json().catch(() => null))?.error ?? "No se pudo borrar",
      );
    else {
      setRemove(null);
      load();
    }
    setBusy(false);
  }
  async function saveEdit() {
    setBusy(true);
    const r = await fetch(`/api/industria/invoices/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuit: edit.cuit,
        puntoVenta: Number(edit.puntoVenta),
      }),
    });
    if (!r.ok)
      setError(
        (await r.json().catch(() => null))?.error ?? "No se pudo editar",
      );
    else {
      setEdit(null);
      load();
    }
    setBusy(false);
  }
  function openAdjustment(invoice: any, kind: "NOTA_CREDITO" | "NOTA_DEBITO") { setError(""); setAdjustment({ invoice, kind }); setAdjustmentReason(kind === "NOTA_CREDITO" ? "DEVOLUCION" : "DIFERENCIA_PRECIO"); setAdjustmentDescription(""); setAdjustmentMode("BORRADOR"); setAdjustmentItems(invoice.items.map((item: any) => ({ originalItemId: item.id, descripcion: item.descripcion, quantity: item.cantidad, price: Number(item.precioUnitario) }))); }
  async function createAdjustment(mode: "BORRADOR" | "EMITIR") { if (!adjustment) return; setBusy(true); setError(""); const response = await fetch(`/api/industria/invoices/${adjustment.invoice.id}/adjustments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: adjustment.kind, mode, reason: adjustmentReason, reasonDescription: adjustmentDescription || undefined, items: adjustmentItems.filter((item) => Number(item.quantity) > 0) }) }); const body = await response.json().catch(() => null); setBusy(false); if (!response.ok) return setError(body?.error ?? "No se pudo crear el comprobante."); setAdjustment(null); load(); if (mode === "EMITIR") window.location.href = `/dashboard/industria/facturacion/${body.data.id}/imprimir`; }
  async function emitDraft(invoice: any) { setBusy(true); setError(""); const response = await fetch(`/api/industria/invoices/${invoice.id}/emit`, { method: "POST" }); const body = await response.json().catch(() => null); setBusy(false); if (!response.ok) return setError(body?.error ?? "No se pudo emitir el borrador."); load(); window.location.href = `/dashboard/industria/facturacion/${body.data.id}/imprimir`; }
  const visibleInvoices = invoices.filter((invoice) => filter === "TODOS" || invoice.documentType === filter);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Facturación</h1>
          <p className="text-sm text-muted-foreground">
            Comprobantes emitidos y trazabilidad.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { window.location.href = "/dashboard/industria/facturacion/historial"; }}>
            <History className="h-4 w-4" /> Historial
          </Button>
          <Button
            onClick={() => {
              setSelected(null);
              setSearch("");
              setError("");
              setOpen(true);
            }}
            disabled={!notes.length && !approvedQuotes.length}
          >
            <Receipt className="h-4 w-4" /> Generar factura
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3"><div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div><div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div><div><Label>Cliente</Label><Select value={filterClientId} onChange={(e) => { setFilterClientId(e.target.value); setPage(1); }}><option value="">Todos los clientes</option>{approvedQuotes.map((q) => <option key={q.clientId} value={q.clientId}>{q.client?.razonSocial}</option>)}</Select></div>{(from || to || filterClientId) && <Button variant="outline" onClick={() => { setFrom(""); setTo(""); setFilterClientId(""); setPage(1); }}>Limpiar filtros</Button>}</div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant={filter === "TODOS" ? "default" : "outline"} onClick={() => setFilter("TODOS")}>Todos</Button><Button size="sm" variant={filter === "FACTURA" ? "default" : "outline"} onClick={() => setFilter("FACTURA")}>Facturas</Button><Button size="sm" variant={filter === "NOTA_CREDITO" ? "default" : "outline"} onClick={() => setFilter("NOTA_CREDITO")}>Notas de crédito</Button><Button size="sm" variant={filter === "NOTA_DEBITO" ? "default" : "outline"} onClick={() => setFilter("NOTA_DEBITO")}>Notas de débito</Button></div>
        {visibleInvoices.map((i) => (
          <Card
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <p className="font-semibold">
                {i.documentType === "NOTA_CREDITO" ? "Nota de crédito" : i.documentType === "NOTA_DEBITO" ? "Nota de débito" : "Factura"} {i.tipoFacturacion} · {i.numero}
              </p>
              <p className="text-sm text-muted-foreground">
                {i.client?.razonSocial} · OT {i.workOrder?.numero} ·{" "}
                {formatDate(i.fecha)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <b className={i.documentType === "NOTA_CREDITO" ? "text-destructive" : i.documentType === "NOTA_DEBITO" ? "text-vase-green" : ""}>{i.documentType === "NOTA_CREDITO" ? "-" : i.documentType === "NOTA_DEBITO" ? "+" : ""}{formatARS(Number(i.total))}</b>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = `/dashboard/industria/facturacion/${i.id}/imprimir`)}>
                <Printer className="h-4 w-4" /> Imprimir / PDF
              </Button>
              {i.documentType !== "FACTURA" && i.documentStatus === "BORRADOR" && <Button size="sm" disabled={busy} onClick={() => emitDraft(i)}>Emitir borrador</Button>}
              {i.documentType === "FACTURA" && <><Button size="sm" variant="outline" onClick={() => openAdjustment(i, "NOTA_CREDITO")}><MinusCircle className="h-4 w-4" /> Nota de crédito</Button><Button size="sm" variant="outline" onClick={() => openAdjustment(i, "NOTA_DEBITO")}><PlusCircle className="h-4 w-4" /> Nota de débito</Button></>}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  (window.location.href = `/dashboard/industria/cobros?clientId=${i.clientId}&invoiceId=${i.id}`)
                }
              >
                <Wallet className="h-4 w-4" /> Cobrar
              </Button>
              <Button
                size="icon"
                variant="outline"
                title="Editar"
                onClick={() =>
                  setEdit({ id: i.id, cuit: i.cuit, puntoVenta: i.puntoVenta })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                title="Borrar"
                onClick={() => setRemove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {!invoices.length && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Todavía no hay facturas persistidas.
          </Card>
        )}
      </div>
      {totalInvoices > pageSize && <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"><span className="text-sm text-muted-foreground">Página {page} de {Math.ceil(totalInvoices / pageSize)}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button><Button size="sm" variant="outline" disabled={page >= Math.ceil(totalInvoices / pageSize)} onClick={() => setPage((p) => p + 1)}>Siguiente</Button></div></div>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Generar factura"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={busy || !selected} onClick={create}>
              {busy ? "Emitiendo…" : "Emitir factura"}
            </Button>
          </>
        }
      >
        <Label>Origen de la factura</Label>
        <Select value={source} onChange={(e) => { setSource(e.target.value as "remito" | "presupuesto"); setSelected(null); setSearch(""); }}><option value="remito">Remito confirmado</option><option value="presupuesto">Presupuesto aprobado</option></Select>
        <Label className="mt-4">{source === "remito" ? "Buscar remito confirmado" : "Buscar presupuesto aprobado"}</Label>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
          }}
          placeholder="Número, OT o cliente"
        />
        {!selected && (
          <div className="mt-2 rounded-xl border bg-card">
            {suggestions.map((n) => (
              <button
                type="button"
                key={n.id}
                className="block w-full p-3 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  setSelected(n);
                  setSearch(n.numero);
                }}
              >
                {n.numero} · OT {n.workOrder?.numero} · {n.client?.razonSocial}
              </button>
            ))}
          </div>
        )}
        {selected && (
          <p className="mt-3 rounded-lg bg-vase-green-soft p-3 text-sm">
            {selected.numero} seleccionado
          </p>
        )}
        <div className="mt-4">
          <Label>Tipo</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="N">Tipo N · Interna</option>
            <option value="A">Tipo A · ARCA</option>
          </Select>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Modal>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Editar factura"
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={saveEdit}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <Label>CUIT</Label>
        <Input
          value={edit?.cuit ?? ""}
          onChange={(e) => setEdit({ ...edit, cuit: e.target.value })}
        />
        <Label>Punto de venta</Label>
        <Input
          type="number"
          value={edit?.puntoVenta ?? ""}
          onChange={(e) => setEdit({ ...edit, puntoVenta: e.target.value })}
        />
      </Modal>
      <Modal
        open={!!remove}
        onClose={() => setRemove(null)}
        title="¿Borrar factura?"
        description="Esta acción queda registrada y no se puede deshacer."
        footer={
          <>
            <Button variant="outline" onClick={() => setRemove(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={removeInvoice}>
              Borrar factura
            </Button>
          </>
        }
      />
      <Modal open={!!adjustment} onClose={() => setAdjustment(null)} title={adjustment?.kind === "NOTA_CREDITO" ? "Generar nota de crédito" : "Generar nota de débito"} description="La factura original queda intacta; el nuevo comprobante quedará vinculado." size="lg" footer={<><Button variant="outline" onClick={() => setAdjustment(null)}>Cancelar</Button><Button variant="outline" disabled={busy} onClick={() => createAdjustment("BORRADOR")}>Guardar borrador</Button><Button disabled={busy} onClick={() => createAdjustment("EMITIR")}>{busy ? "Emitiendo…" : "Confirmar emisión"}</Button></>}><div className="space-y-4"><div className="rounded-xl border bg-secondary/35 p-3 text-sm"><p className="font-semibold">Factura asociada · {adjustment?.invoice?.numero}</p><p>{adjustment?.invoice?.client?.razonSocial} · PV {adjustment?.invoice?.puntoVenta} · {formatARS(Number(adjustment?.invoice?.total ?? 0))}</p></div><div><Label>Motivo</Label><Select value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)}>{(adjustment?.kind === "NOTA_CREDITO" ? [["DEVOLUCION", "Devolución"], ["ERROR_FACTURACION", "Error de facturación"], ["BONIFICACION", "Bonificación"], ["DESCUENTO_POSTERIOR", "Descuento posterior"], ["CANCELACION_TOTAL", "Cancelación total"], ["CANCELACION_PARCIAL", "Cancelación parcial"], ["OTRO", "Otro"]] : [["DIFERENCIA_PRECIO", "Diferencia de precio"], ["INTERESES", "Intereses"], ["GASTOS_ADICIONALES", "Gastos adicionales"], ["ERROR_FACTURACION", "Error de facturación"], ["AJUSTE", "Ajuste"], ["OTRO", "Otro"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>{adjustmentReason === "OTRO" && <div><Label>Descripción</Label><Input value={adjustmentDescription} onChange={(e) => setAdjustmentDescription(e.target.value)} /></div>}<div><Label>Ítems y cantidades</Label><div className="mt-2 space-y-2">{adjustmentItems.map((item, index) => <div key={item.originalItemId ?? index} className="grid grid-cols-[1fr_88px_110px] items-center gap-2 rounded-xl border p-3 text-sm"><span className="min-w-0 truncate">{item.descripcion}</span><Input type="number" min="0" value={item.quantity} onChange={(e) => setAdjustmentItems(adjustmentItems.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(e.target.value) } : row))} /><span className="text-right tabular-nums">{formatARS(Number(item.quantity) * Number(item.price))}</span></div>)}</div></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></Modal>
    </div>
  );
}
