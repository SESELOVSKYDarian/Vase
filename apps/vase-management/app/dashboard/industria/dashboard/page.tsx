"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, DollarSign, Factory, Layers, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatARS, formatDate, formatM2 } from "@/lib/format";
import { ProductionDashboard } from "@/components/dashboard/production-dashboard";
import { RevenueChart, VerticalBarChart } from "@/components/analytics/metric-charts";

type Data = { kpis: Record<string, number>; monthly: Array<{ label: string; presupuestado: number; facturado: number; cobrado: number }>; categoryMix: Array<{ category: string; m2: number }>; recentQuotes: Array<{ id: string; numero: string; obra?: string | null; total: number; createdAt: string; client: { razonSocial: string } }>; activeWorkOrders: Array<{ id: string; numero: string; obra?: string | null; categoria: string; estadoProductivo: string; porcentajeAvance: number }> };

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [productionOnly, setProductionOnly] = useState<boolean | null>(null);
  useEffect(() => { let alive = true; fetch("/api/industria/auth/me").then((response) => response.ok ? response.json() : null).then((payload) => { const permissions: string[] = payload?.user?.permissions ?? []; if (alive) setProductionOnly(permissions.includes("production.view_assigned") && !permissions.includes("production.view_all")); }); return () => { alive = false; }; }, []);
  useEffect(() => {
    if (productionOnly !== false) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError("");
    fetch("/api/industria/analytics", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "No se pudo cargar el dashboard.");
        if (!body?.data) throw new Error("El servidor respondió sin datos para el dashboard.");
        return body.data;
      })
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(controller.signal.aborted ? "La consulta del dashboard tardó demasiado. Volvé a intentar." : reason instanceof Error ? reason.message : "No se pudo cargar el dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [productionOnly]);
  if (productionOnly === null) return <div className="min-h-[45dvh]" aria-busy="true" />;
  if (productionOnly) return <ProductionDashboard />;
  const k = data?.kpis; const stats = [{ label: "Presupuestado", value: formatARS(k?.presupuestado ?? 0), icon: DollarSign, accent: true }, { label: "Facturado", value: formatARS(k?.facturado ?? 0), icon: Receipt }, { label: "Cobrado", value: formatARS(k?.cobrado ?? 0), icon: Wallet }, { label: "Pendiente de cobro", value: formatARS(k?.pendienteCobro ?? 0), icon: AlertTriangle }, { label: "OT activas", value: String(k?.otsActivas ?? 0), icon: Factory }, { label: "m² en producción", value: formatM2(k?.m2EnProduccion ?? 0), icon: Layers }];
  return <div className="space-y-7"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Indicadores operativos en tiempo real desde tu base de datos.</p></div><Link href="/dashboard/industria/analiticas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-vase-green/35 hover:bg-vase-green-soft">Ver analíticas <ArrowRight className="h-4 w-4" /></Link></header>{error ? <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card> : <><section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map((stat, index) => <StatCard key={stat.label} index={index} {...stat} value={loading ? "—" : stat.value} />)}</section><section className="grid grid-cols-1 gap-5 xl:grid-cols-3"><ChartCard className="xl:col-span-2" title="Presupuestado, facturado y cobrado" description="Últimos seis meses · valores reales en ARS">{loading ? <Loading /> : <RevenueChart data={data?.monthly ?? []} />}</ChartCard><ChartCard title="Producción por categoría" description="m² activos en el período">{loading ? <Loading /> : <VerticalBarChart format="m2" data={(data?.categoryMix ?? []).map((row) => ({ label: row.category, value: row.m2 }))} />}</ChartCard></section><section className="grid grid-cols-1 gap-5 xl:grid-cols-2"><ListCard title="Presupuestos recientes" description="Últimos movimientos cargados">{loading ? <Loading /> : data?.recentQuotes?.length ? data.recentQuotes.map((quote) => <Link key={quote.id} href={`/dashboard/industria/presupuestos/${quote.id}`} className="flex min-w-0 items-center justify-between gap-4 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-secondary"><div className="min-w-0"><p className="truncate font-medium">{quote.numero} · {quote.client.razonSocial}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{quote.obra || "Sin obra"} · {formatDate(quote.createdAt)}</p></div><span className="shrink-0 font-semibold tabular-nums">{formatARS(Number(quote.total))}</span></Link>) : <Empty text="No hay presupuestos todavía." />}</ListCard><ListCard title="Producción en curso" description="Órdenes pendientes y en proceso">{loading ? <Loading /> : data?.activeWorkOrders?.length ? data.activeWorkOrders.map((order) => <Link key={order.id} href={`/dashboard/industria/produccion?ot=${order.id}`} className="flex min-w-0 items-center justify-between gap-4 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-secondary"><div className="min-w-0"><p className="truncate font-medium">{order.numero} · {order.obra || "Sin obra"}</p><p className="mt-0.5 text-xs text-muted-foreground">{order.categoria} · avance {order.porcentajeAvance ?? 0}%</p></div><span className="shrink-0 rounded-full bg-vase-green-soft px-2.5 py-1 text-xs font-semibold text-vase-green">{order.estadoProductivo === "EN_PROCESO" ? "En proceso" : "Pendiente"}</span></Link>) : <Empty text="No hay órdenes activas." />}</ListCard></section></>}</div>;
}
function ChartCard({ title, description, children, className = "" }: { title: string; description: string; children: React.ReactNode; className?: string }) { return <Card className={`surface-shell overflow-hidden ${className}`}><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="h-[300px] min-h-[300px] px-3 pb-5 pt-1 sm:h-[330px] sm:min-h-[330px] sm:px-5">{children}</CardContent></Card>; }
function ListCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card className="surface-shell"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="space-y-1 pt-0">{children}</CardContent></Card>; }
function Loading() { return <div className="flex h-full items-center justify-center rounded-xl bg-secondary/35 text-sm text-muted-foreground">Cargando datos…</div>; }
function Empty({ text }: { text: string }) { return <div className="flex min-h-32 items-center justify-center rounded-xl bg-secondary/35 px-5 text-center text-sm text-muted-foreground">{text}</div>; }
