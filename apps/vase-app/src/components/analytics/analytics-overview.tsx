"use client";

import { useMemo, useEffect, useState } from "react";

type Point = { date: string; value: number };

type AnalyticsOverviewProps = {
  salesToday: number;
  leadsToday: number;
  conversationsToday: number;
  ticketsToday: number;
  domainsConnectedLast30Days: number;
  channelsConnectedLast30Days: number;
  salesSeries: Point[];
  leadsSeries: Point[];
  connectedDomainsSeries: Point[];
  connectedChannelsSeries: Point[];
  ordersByStatus: Array<{ status: string; value: number }>;
};

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{`${prefix}${display.toLocaleString("es-AR")}${suffix}`}</span>;
}

export function AnalyticsOverview(props: AnalyticsOverviewProps) {
  const maxSales = useMemo(
    () => Math.max(...props.salesSeries.map((item) => item.value), 1),
    [props.salesSeries],
  );
  const salesLast7Days = useMemo(
    () => props.salesSeries.slice(-7).reduce((sum, item) => sum + item.value, 0),
    [props.salesSeries],
  );
  const leadBreakdown = useMemo(
    () => [
      { label: "Leads", value: props.leadsToday },
      { label: "Conversaciones", value: props.conversationsToday },
      { label: "Tickets", value: props.ticketsToday },
    ],
    [props.conversationsToday, props.leadsToday, props.ticketsToday],
  );
  const maxLeads = Math.max(...leadBreakdown.map((item) => item.value), 1);
  const maxAdoption = useMemo(
    () =>
      Math.max(
        ...props.connectedDomainsSeries.map((item) => item.value),
        ...props.connectedChannelsSeries.map((item) => item.value),
        1,
      ),
    [props.connectedChannelsSeries, props.connectedDomainsSeries],
  );
  const totalOrders = useMemo(
    () => props.ordersByStatus.reduce((sum, item) => sum + item.value, 0),
    [props.ordersByStatus],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Ventas hoy</p>
          <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
            <AnimatedNumber value={Math.round(props.salesToday)} prefix="$" />
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Ventas 7 dias</p>
          <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
            <AnimatedNumber value={Math.round(salesLast7Days)} prefix="$" />
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Leads hoy</p>
          <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
            <AnimatedNumber value={props.leadsToday} />
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Adopcion 30 dias</p>
          <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
            <AnimatedNumber value={props.domainsConnectedLast30Days + props.channelsConnectedLast30Days} />
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">Ventas por dia (30 dias)</p>
          <div className="mt-4 flex h-48 items-end gap-2">
            {props.salesSeries.map((item, index) => (
              <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-[var(--accent-strong)]/80" style={{ height: `${(item.value / maxSales) * 100}%` }} />
                <span className="text-[10px] text-[var(--muted)]">{index % 6 === 0 ? item.date.slice(5) : ""}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">Embudo diario real</p>
          <div className="mt-4 space-y-3">
            {leadBreakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{item.label}</span>
                  <span className="font-semibold text-[var(--foreground)]">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface)]">
                  <div className="h-2 rounded-full bg-[var(--accent-strong)]" style={{ width: `${(item.value / maxLeads) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">Pedidos por estado (30 dias)</p>
          <div className="mt-4 space-y-3">
            {props.ordersByStatus.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">Sin pedidos registrados en el periodo.</p>
            ) : (
              props.ordersByStatus.map((item) => (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">{item.status}</span>
                    <span className="font-semibold text-[var(--foreground)]">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface)]">
                    <div className="h-2 rounded-full bg-[var(--accent-strong)]" style={{ width: `${totalOrders > 0 ? (item.value / totalOrders) * 100 : 0}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">Leads por dia (ultimos 10 dias)</p>
          <div className="mt-4 space-y-2">
            {props.leadsSeries.slice(-10).map((item) => (
              <div key={item.date} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-[var(--muted)]">{item.date.slice(5)}</span>
                <div className="h-2 flex-1 rounded-full bg-[var(--surface)]">
                  <div className="h-2 rounded-full bg-[var(--accent-strong)]" style={{ width: `${Math.min(100, item.value * 12)}%` }} />
                </div>
                <span className="w-8 text-right font-semibold text-[var(--foreground)]">{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">Adopcion operativa (ultimos 10 dias)</p>
          <div className="mt-4 space-y-3">
            {props.connectedDomainsSeries.slice(-10).map((point, index) => {
              const channelsPoint = props.connectedChannelsSeries.slice(-10)[index];
              const channelsValue = channelsPoint?.value ?? 0;
              return (
                <div key={point.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">{point.date.slice(5)}</span>
                    <span className="font-semibold text-[var(--foreground)]">Dom {point.value} · Can {channelsValue}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-2 rounded-full bg-[var(--surface)]">
                      <div className="h-2 rounded-full bg-[var(--accent-strong)]" style={{ width: `${(point.value / maxAdoption) * 100}%` }} />
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface)]">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${(channelsValue / maxAdoption) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Dominios conectados: <strong>{props.domainsConnectedLast30Days}</strong> · Canales conectados: <strong>{props.channelsConnectedLast30Days}</strong>
          </p>
        </article>
      </section>
    </div>
  );
}
