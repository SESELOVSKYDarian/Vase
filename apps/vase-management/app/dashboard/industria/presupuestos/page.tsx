"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, FileText, Layers, Send, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { QuoteStatusBadge, TipoFacturacionBadge } from "@/components/shared/status-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate, formatM2 } from "@/lib/format";
import type { QuoteStatus, QuoteType } from "@/types/industrial";

export default function PresupuestosPage() {
  const [estado, setEstado] = useState<QuoteStatus | "TODOS">("TODOS");
  const [tipo, setTipo] = useState<QuoteType | "TODOS">("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;
  const [showNew, setShowNew] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [deleteQuote, setDeleteQuote] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/industria/clients").then((r) => r.ok ? r.json() : null).then((payload) => setClientOptions(payload?.data ?? [])).catch(() => setClientOptions([])); }, []);
  useEffect(() => { const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }); if (estado !== "TODOS") params.set("status", estado); if (tipo !== "TODOS") params.set("type", tipo); if (clientId) params.set("clientId", clientId); if (from) params.set("from", from); if (to) params.set("to", to); fetch(`/api/industria/quotes?${params.toString()}`).then((r) => r.ok ? r.json() : null).then((payload) => { setRows(payload?.data ?? []); setTotal(payload?.count ?? 0); }).catch(() => { setRows([]); setTotal(0); }); }, [estado, tipo, clientId, from, to, page]);
  useEffect(() => { setPage(1); }, [estado, tipo, clientId, from, to]);
  async function sendQuote(id: string) { const response = await fetch(`/api/industria/quotes/${id}/send`, { method: "POST" }); if (response.ok) setRows((items) => items.map((item) => item.id === id ? { ...item, estado: "ENVIADO" } : item)); else setMessage((await response.json().catch(() => null))?.error ?? "No se pudo enviar el presupuesto"); }
  async function removeQuote() { if (!deleteQuote) return; const response = await fetch(`/api/industria/quotes/${deleteQuote.id}`, { method: "DELETE" }); if (response.ok) setRows((items) => items.filter((item) => item.id !== deleteQuote.id)); else setMessage("No se pudo eliminar el borrador"); setDeleteQuote(null); }

  const filtered = showDrafts ? rows.filter((q) => q.estado === "BORRADOR") : rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">{total} presupuestos encontrados</p>
        </div>
        <div className="flex items-center gap-2"><Button variant={showDrafts ? "secondary" : "outline"} onClick={() => setShowDrafts((value) => !value)}>Mis borradores</Button><div className="relative">
          <Button onClick={() => setShowNew((v) => !v)}>
            <Plus className="h-4 w-4" /> Nuevo presupuesto
          </Button>
          {showNew && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-vase-lg"
            >
              <Link href="/dashboard/industria/presupuestos/nuevo/simple" className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary">
                <FileText className="h-4 w-4 text-vase-green" /> Vidrio simple
              </Link>
              <Link href="/dashboard/industria/presupuestos/nuevo/dvh" className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary border-t border-border">
                <Layers className="h-4 w-4 text-vase-green" /> DVH
              </Link>
            </motion.div>
          )}
        </div></div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Cliente</label><Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="min-w-[210px]"><option value="">Todos los clientes</option>{clientOptions.map((client) => <option key={client.id} value={client.id}>{client.razonSocial}</option>)}</Select></div>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="max-w-[160px]">
          <option value="TODOS">Todos los tipos</option>
          <option value="SIMPLE">Vidrio simple</option>
          <option value="DVH">DVH</option>
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="max-w-[180px]">
          <option value="TODOS">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADO">Enviado</option>
          <option value="APROBADO">Aprobado</option>
          <option value="RECHAZADO">Rechazado</option>
          <option value="VENCIDO">Vencido</option>
          <option value="ANULADO">Anulado</option>
        </Select>
        {(from || to || clientId || estado !== "TODOS" || tipo !== "TODOS" || showDrafts) && <Button variant="outline" onClick={() => { setFrom(""); setTo(""); setClientId(""); setEstado("TODOS"); setTipo("TODOS"); setShowDrafts(false); }}>Limpiar filtros</Button>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No hay presupuestos con estos filtros" description="Ajustá los filtros o creá un nuevo presupuesto." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Cliente / Obra</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Facturación</th>
                <th className="px-4 py-3 text-right">m²</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const client = q.client;
                return (
                  <motion.tr
                    key={q.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/industria/presupuestos/${q.id}`} className="font-medium text-foreground hover:text-vase-green">
                        {q.numero}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(q.fecha)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{client?.razonSocial ?? "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">{q.obra}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{q.tipo}</td>
                    <td className="px-4 py-3">{q.estado === "APROBADO" ? (q.invoices?.length ? <div className="flex flex-col gap-1"><TipoFacturacionBadge tipo={q.invoices[0].tipoFacturacion} /><Link href={`/dashboard/industria/facturacion/${q.invoices[0].id}/imprimir`} className="text-xs font-medium text-vase-green hover:underline">{q.invoices[0].numero}</Link></div> : <span className="text-xs font-medium text-muted-foreground">Sin facturar</span>) : null}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatM2(q.m2Total)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatARS(q.total)}</td>
                    <td className="px-4 py-3"><QuoteStatusBadge status={q.estado} /></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Link href={`/dashboard/industria/presupuestos/${q.id}/imprimir`}><Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5" /> Imprimir / PDF</Button></Link>{q.estado === "BORRADOR" && <><Link href={`/dashboard/industria/presupuestos/${q.id}`}><Button size="sm" variant="outline">Editar</Button></Link><Button size="sm" variant="outline" onClick={() => sendQuote(q.id)}><Send className="h-3.5 w-3.5" /> Enviar</Button><Button size="sm" variant="outline" onClick={() => setDeleteQuote(q)}><Trash2 className="h-3.5 w-3.5" /></Button></>}{q.estado === "ENVIADO" && <Link href={`/dashboard/industria/presupuestos/${q.id}`}><Button size="sm">Revisar y decidir</Button></Link>}{q.estado === "APROBADO" && q.workOrder && <Link href={`/dashboard/industria/presupuestos/${q.id}`}><Button size="sm" variant="outline">Ver OT</Button></Link>}</div></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {total > pageSize && <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"><p className="text-sm text-muted-foreground">Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button><Button size="sm" variant="outline" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((current) => current + 1)}>Siguiente</Button></div></div>}
      <Modal open={!!deleteQuote} onClose={() => setDeleteQuote(null)} title="Eliminar borrador" description="Esta acción no se puede deshacer." footer={<><Button variant="outline" onClick={() => setDeleteQuote(null)}>Cancelar</Button><Button onClick={removeQuote} className="bg-red-600 hover:bg-red-700">Sí, eliminar</Button></>}><p className="text-sm text-muted-foreground">¿Seguro que querés eliminar el borrador {deleteQuote?.numero}?</p></Modal>
      <Modal open={!!message} onClose={() => setMessage("")} title="No se pudo completar la acción" footer={<Button onClick={() => setMessage("")}>Entendido</Button>}><p className="text-sm text-muted-foreground">{message}</p></Modal>
    </div>
  );
}
