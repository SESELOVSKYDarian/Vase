"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Factory, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

type Order = { id: string; numero: string; client: string; sector: string; fechaEntrega: string; estado: string; total: number; completed: number; assignedAt: string | null };
type Data = { summary: { pending: number; overdue: number; completed: number; newThisWeek: number }; upcoming: Order[]; newAssignments: Order[] };

const stateLabel: Record<string, string> = { PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", TERMINADA: "Terminada" };

export function ProductionDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; const load = () => fetch("/api/industria/dashboard/production").then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo cargar tu panel."); return body.data; }).then((payload) => active && setData(payload)).catch((reason) => active && setError(reason.message)); load(); window.addEventListener("production-progress-updated", load); return () => { active = false; window.removeEventListener("production-progress-updated", load); }; }, []);
  const summary = data?.summary;
  const metrics = [
    { label: "OT pendientes", value: summary?.pending ?? "—", Icon: ClipboardList, tone: "text-amber-700 bg-amber-500/10" },
    { label: "OT atrasadas", value: summary?.overdue ?? "—", Icon: AlertTriangle, tone: "text-red-700 bg-red-500/10" },
    { label: "OT completadas", value: summary?.completed ?? "—", Icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-500/10" },
    { label: "Nuevas esta semana", value: summary?.newThisWeek ?? "—", Icon: Clock3, tone: "text-vase-green bg-vase-green-soft" },
  ];
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="page-title">Mi producción</h1><p className="page-subtitle">Tus órdenes asignadas, organizadas por fecha de entrega.</p></div><Link href="/dashboard/industria/produccion" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-secondary">Ver tablero <ArrowRight className="h-4 w-4" /></Link></header>
    {error ? <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card> : <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(({ label, value, Icon, tone }) => <Card key={label} className="overflow-hidden"><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span></div><p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p></CardContent></Card>)}</section>
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]"><Card className="surface-shell"><CardHeader><CardTitle>Mis órdenes próximas</CardTitle><CardDescription>Primero vencidas, luego las que vencen antes.</CardDescription></CardHeader><CardContent className="space-y-2">{data ? data.upcoming.length ? data.upcoming.map((order) => <OrderRow key={order.id} order={order} />) : <Empty text="Todavía no tenés órdenes asignadas." /> : <Empty text="Cargando tus órdenes…" />}</CardContent></Card><Card className="surface-shell"><CardHeader><CardTitle>Nuevas esta semana</CardTitle><CardDescription>Asignaciones recientes para tus sectores.</CardDescription></CardHeader><CardContent className="space-y-2">{data ? data.newAssignments.length ? data.newAssignments.map((order) => <OrderRow key={order.id} order={order} compact />) : <Empty text="No recibiste nuevas asignaciones esta semana." /> : <Empty text="Buscando asignaciones…" />}</CardContent></Card></section>
    </>}
  </div>;
}

function OrderRow({ order, compact = false }: { order: Order; compact?: boolean }) {
  const due = new Date(order.fechaEntrega); const overdue = due < new Date() && !["TERMINADA", "ANULADA"].includes(order.estado);
  return <Link href={`/dashboard/industria/produccion?ot=${order.id}`} className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3 transition-colors hover:border-vase-green/30 hover:bg-vase-green-soft/45"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-semibold">{order.numero}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${overdue ? "bg-red-500/10 text-red-700" : order.estado === "EN_PROCESO" ? "bg-blue-500/10 text-blue-700" : "bg-amber-500/10 text-amber-700"}`}>{overdue ? "Atrasada" : stateLabel[order.estado] ?? order.estado}</span></div><p className="mt-1 truncate text-sm text-muted-foreground">{order.client} · {order.sector}</p>{!compact && <p className="mt-1 text-xs text-muted-foreground">{order.completed} / {order.total} realizados · Entrega {formatDate(order.fechaEntrega)}</p>}</div><Factory className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link>;
}
function Empty({ text }: { text: string }) { return <div className="flex min-h-32 items-center justify-center rounded-xl bg-secondary/45 px-5 text-center text-sm text-muted-foreground">{text}</div>; }
