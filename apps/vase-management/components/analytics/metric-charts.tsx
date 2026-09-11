"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Tooltip, XAxis, YAxis, type LegendProps, type TooltipProps } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { formatARS, formatM2 } from "@/lib/format";
import { chartNumber } from "@/lib/analytics-series";
import { ChartShell } from "@/components/analytics/chart-shell";

type SeriesRow = { label: string; presupuestado: number; facturado: number; cobrado: number };
type BarRow = { label: string; value: number; color?: string };
type ValueFormat = "number" | "money" | "m2";
const COLORS = ["#16a34a", "#0f766e", "#2563eb", "#d97706", "#7c3aed", "#db2777"];
const SERIES = [{ key: "presupuestado", label: "Presupuestado", color: "#16a34a" }, { key: "facturado", label: "Facturado", color: "#0f766e" }, { key: "cobrado", label: "Cobrado", color: "#2563eb" }] as const;
const SVG_COLORS = { grid: "hsl(var(--border))", axis: "hsl(var(--muted-foreground))", surface: "hsl(var(--card))" };

function useChartAnimation() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(!window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return enabled;
}
function compact(value: number) { return new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function formatValue(value: number, format: ValueFormat) { return format === "money" ? formatARS(value) : format === "m2" ? formatM2(value) : new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value); }
const tick = { fill: SVG_COLORS.axis, fontSize: 12 };

export function RevenueChart({ data }: { data: SeriesRow[] }) {
  const animate = useChartAnimation();
  const rows = useMemo(() => data.map((row) => ({ label: String(row.label), presupuestado: chartNumber(row.presupuestado), facturado: chartNumber(row.facturado), cobrado: chartNumber(row.cobrado) })), [data]);
  if (!rows.length || rows.every((row) => SERIES.every((series) => row[series.key] === 0))) return <EmptyChart icon={TrendingUp} title="Sin movimientos en el período" description="Cuando haya presupuestos, facturas o cobros aparecerá su evolución mensual." />;
  return <ChartShell label="Evolución mensual presupuestada, facturada y cobrada">{({ width, height }) => <ComposedChart width={width} height={height} data={rows} margin={{ top: 12, right: 16, left: 2, bottom: 4 }}>
    <defs><linearGradient id="vase-revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.14} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient></defs>
    <CartesianGrid vertical={false} stroke={SVG_COLORS.grid} strokeDasharray="3 5" />
    <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} dy={8} />
    <YAxis tick={tick} tickFormatter={compact} tickLine={false} axisLine={false} width={58} />
    <Tooltip content={<RevenueTooltip />} cursor={{ stroke: SVG_COLORS.axis, strokeOpacity: 0.2 }} />
    <Legend content={<ChartLegend />} verticalAlign="top" align="right" height={34} />
    <Area type="monotone" dataKey="presupuestado" stroke="none" fill="url(#vase-revenue-fill)" isAnimationActive={animate} animationDuration={420} animationEasing="ease-out" />
    {SERIES.map((series) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2.5} dot={{ r: 3, fill: series.color, stroke: SVG_COLORS.surface, strokeWidth: 2 }} activeDot={{ r: 5, stroke: SVG_COLORS.surface, strokeWidth: 3 }} isAnimationActive={animate} animationDuration={420} animationEasing="ease-out" />)}
  </ComposedChart>}</ChartShell>;
}

export function VerticalBarChart({ data, format = "number", semantic = false }: { data: BarRow[]; format?: ValueFormat; semantic?: boolean }) {
  const animate = useChartAnimation();
  const rows = useMemo(() => data.map((row, index) => ({ ...row, value: chartNumber(row.value), color: row.color ?? (semantic ? statusColor(row.label) : COLORS[index % COLORS.length]) })), [data, semantic]);
  if (!rows.length || rows.every((row) => row.value === 0)) return <EmptyChart />;
  return <ChartShell label="Gráfico de barras vertical">{({ width, height }) => <BarChart width={width} height={height} data={rows} margin={{ top: 26, right: 12, left: 0, bottom: 6 }} barCategoryGap="28%">
    <CartesianGrid vertical={false} stroke={SVG_COLORS.grid} strokeDasharray="3 5" />
    <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} dy={8} interval={0} />
    <YAxis tick={tick} tickFormatter={(value) => format === "m2" ? `${compact(value)} m²` : compact(value)} tickLine={false} axisLine={false} width={64} allowDecimals={format !== "number"} />
    <Tooltip content={<ValueTooltip format={format} suffix={semantic ? " OT" : undefined} />} cursor={{ fill: SVG_COLORS.axis, fillOpacity: 0.04 }} />
    <Bar dataKey="value" name="Valor" radius={[8, 8, 3, 3]} maxBarSize={92} isAnimationActive={animate} animationDuration={380} animationEasing="ease-out">{rows.map((row) => <Cell key={row.label} fill={row.color} />)}<LabelList dataKey="value" position="top" formatter={(value: number) => format === "m2" ? formatM2(value) : compact(value)} fill={SVG_COLORS.axis} fontSize={11} fontWeight={600} /></Bar>
  </BarChart>}</ChartShell>;
}

export function HorizontalBarChart({ data, format = "money" }: { data: BarRow[]; format?: "money" | "number" }) {
  const animate = useChartAnimation();
  const rows = useMemo(() => data.map((row, index) => ({ ...row, value: chartNumber(row.value), color: row.color ?? COLORS[index % COLORS.length] })).sort((left, right) => right.value - left.value), [data]);
  if (!rows.length || rows.every((row) => row.value === 0)) return <EmptyChart />;
  return <ChartShell label="Cobros agrupados por medio de pago">{({ width, height }) => <BarChart width={width} height={height} layout="vertical" data={rows} margin={{ top: 8, right: 54, left: 12, bottom: 8 }} barCategoryGap="30%">
    <CartesianGrid horizontal={false} stroke={SVG_COLORS.grid} strokeDasharray="3 5" />
    <XAxis type="number" tick={tick} tickFormatter={compact} tickLine={false} axisLine={false} />
    <YAxis type="category" dataKey="label" tick={tick} tickLine={false} axisLine={false} width={112} />
    <Tooltip content={<ValueTooltip format={format} />} cursor={{ fill: SVG_COLORS.axis, fillOpacity: 0.04 }} />
    <Bar dataKey="value" name="Cobrado" radius={[3, 8, 8, 3]} maxBarSize={38} isAnimationActive={animate} animationDuration={380} animationEasing="ease-out">{rows.map((row) => <Cell key={row.label} fill={row.color} />)}<LabelList dataKey="value" position="right" formatter={(value: number) => format === "money" ? compact(value) : value} fill={SVG_COLORS.axis} fontSize={11} fontWeight={600} /></Bar>
  </BarChart>}</ChartShell>;
}

function statusColor(label: string) { return ({ "Pendiente": "#2563eb", "En proceso": "#0f766e", "Terminada": "#16a34a", "Anulada": "#dc2626" } as Record<string, string>)[label] ?? "#64748b"; }
function ChartLegend({ payload }: LegendProps) { return <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">{(payload ?? []).map((entry) => <span key={String(entry.value)} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />{entry.value}</span>)}</div>; }
function RevenueTooltip({ active, label, payload }: TooltipProps<number, string>) { if (!active || !payload?.length) return null; return <TooltipSurface title={String(label ?? "")}>{payload.filter((entry) => entry.dataKey !== "presupuestado" || entry.stroke).map((entry) => <TooltipRow key={String(entry.dataKey)} label={String(entry.name)} value={formatARS(Number(entry.value))} color={String(entry.color)} />)}</TooltipSurface>; }
function ValueTooltip({ active, label, payload, format = "number", suffix }: TooltipProps<number, string> & { format?: ValueFormat; suffix?: string }) { if (!active || !payload?.length) return null; const entry = payload[0]; return <TooltipSurface title={String(label ?? "")}><TooltipRow label={String(entry.name ?? "Valor")} value={`${formatValue(Number(entry.value), format)}${suffix ?? ""}`} color={String(entry.payload?.color ?? entry.color)} /></TooltipSurface>; }
function TooltipSurface({ title, children }: { title: string; children: React.ReactNode }) { return <div className="min-w-44 rounded-xl border border-border/80 bg-card/95 px-3.5 py-3 text-xs shadow-[0_14px_32px_-18px_rgba(15,23,42,.45)] backdrop-blur-md"><p className="mb-2 font-semibold capitalize text-foreground">{title}</p><div className="space-y-1.5">{children}</div></div>; }
function TooltipRow({ label, value, color }: { label: string; value: string; color: string }) { return <div className="flex items-center justify-between gap-5 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span><strong className="font-semibold tabular-nums text-foreground">{value}</strong></div>; }
function EmptyChart({ icon: Icon = BarChart3, title = "Sin datos para graficar", description = "Probá ampliando el período o cambiando los filtros." }: { icon?: typeof BarChart3; title?: string; description?: string }) { return <div className="chart-enter flex h-full min-h-[220px] items-center justify-center px-6 text-center"><div className="max-w-xs"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-vase-green-soft text-vase-green"><Icon className="h-5 w-5" aria-hidden="true" /></span><p className="mt-3 text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>; }

