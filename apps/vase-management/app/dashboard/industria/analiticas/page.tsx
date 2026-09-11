"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { formatARS, formatM2 } from "@/lib/format";
import { HorizontalBarChart, RevenueChart, VerticalBarChart } from "@/components/analytics/metric-charts";

type Data = { kpis: Record<string, number>; monthly: Array<{ label: string; presupuestado: number; facturado: number; cobrado: number }>; production: Array<{ label: string; count: number }>; paymentsByMethod: Array<{ label: string; amount: number }>; categoryMix: Array<{ category: string; m2: number }> };

export default function AnaliticasPage() {
  const [tipo, setTipo] = useState("TODOS"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [data, setData] = useState<Data | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth() - 5, 1); const date = (item: Date) => item.toISOString().slice(0, 10); setFrom(date(first)); setTo(date(now)); }, []);
  useEffect(() => {
    if (!from || !to) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError("");
    fetch(`/api/industria/analytics?from=${from}&to=${to}&tipo=${tipo}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "No se pudieron cargar las analíticas.");
        if (!body?.data) throw new Error("El servidor respondió sin datos de analíticas.");
        return body.data;
      })
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(controller.signal.aborted ? "La consulta tardó demasiado. Volvé a intentar." : reason instanceof Error ? reason.message : "No se pudieron cargar las analíticas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [from, to, tipo]);
  const k = data?.kpis; const cards = [["Presupuestado", k?.presupuestado, true], ["Facturado", k?.facturado, true], ["Cobrado", k?.cobrado, true], ["Pendiente de cobro", k?.pendienteCobro, true], ["OT activas", k?.otsActivas, false], ["m² en producción", k?.m2EnProduccion, false]] as const;
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="page-title">Analíticas</h1><p className="page-subtitle">Indicadores reales de Prisma/MySQL para el período seleccionado.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs font-medium text-muted-foreground">Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block min-h-11 rounded-xl border bg-card px-3 text-sm text-foreground" /></label><label className="text-xs font-medium text-muted-foreground">Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block min-h-11 rounded-xl border bg-card px-3 text-sm text-foreground" /></label><Tabs value={tipo} onChange={setTipo} tabs={[{ value: "TODOS", label: "Todos" }, { value: "A", label: "Tipo A" }, { value: "N", label: "Tipo N" }]} /></div></header>{error ? <ErrorState text={error} /> : <><section className="grid grid-cols-2 gap-3 lg:grid-cols-6">{cards.map(([label, value, currency]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{loading ? "—" : currency ? formatARS(value ?? 0) : label === "m² en producción" ? formatM2(value ?? 0) : value ?? 0}</p></CardContent></Card>)}</section><section className="grid grid-cols-1 gap-4 xl:grid-cols-2"><ChartCard title="Presupuestado, facturado y cobrado" description="Evolución mensual en ARS">{loading ? <Loading /> : <RevenueChart data={data?.monthly ?? []} />}</ChartCard><ChartCard title="Órdenes por estado" description="Estado productivo de las OT creadas">{loading ? <Loading /> : <VerticalBarChart semantic data={(data?.production ?? []).map((row) => ({ label: row.label, value: row.count }))} />}</ChartCard><ChartCard title="Cobros por medio" description="Equivalente en pesos argentinos">{loading ? <Loading /> : <HorizontalBarChart data={(data?.paymentsByMethod ?? []).map((row) => ({ label: row.label, value: row.amount }))} />}</ChartCard><ChartCard title="m² por categoría" description="Superficie asociada a órdenes del período">{loading ? <Loading /> : <VerticalBarChart format="m2" data={(data?.categoryMix ?? []).map((row) => ({ label: row.category, value: row.m2 }))} />}</ChartCard></section></>}</div>;
}
function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card className="surface-shell overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="h-[300px] min-h-[300px] px-3 pb-5 pt-1 sm:h-[340px] sm:min-h-[340px] sm:px-5">{children}</CardContent></Card>; }
function Loading() { return <div className="h-full animate-pulse rounded-xl bg-secondary/35 p-5"><div className="flex h-full items-end gap-3"><i className="h-[28%] flex-1 rounded-t-md bg-muted" /><i className="h-[62%] flex-1 rounded-t-md bg-muted" /><i className="h-[45%] flex-1 rounded-t-md bg-muted" /><i className="h-[78%] flex-1 rounded-t-md bg-muted" /></div></div>; }
function ErrorState({ text }: { text: string }) { return <Card><CardContent className="p-6"><p className="text-sm text-destructive">No se pudieron cargar las analíticas. {text}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 rounded-lg border border-border bg-card px-3 text-sm font-semibold transition-colors hover:bg-secondary">Reintentar</button></CardContent></Card>; }
