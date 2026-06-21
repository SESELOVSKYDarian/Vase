"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FinancePoint = {
  label: string;
  ingresos: number;
  gastos: number;
};

type HealthPoint = {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "info";
};

const healthColors = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--accent-strong)",
};

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function ChartShell({ children, empty }: { children: ReactNode; empty: boolean }) {
  if (empty) {
    return (
      <div className="relative grid h-80 place-items-center overflow-hidden rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-[radial-gradient(circle_at_30%_15%,color-mix(in_srgb,var(--accent-strong)_12%,transparent),transparent_34%),var(--surface-strong)] text-sm text-[var(--muted)]">
        <div className="absolute inset-x-10 top-8 h-20 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="relative text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">Sin datos suficientes</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Cuando haya actividad, el grafico se anima automaticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-card relative h-80 w-full overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_18%_0%,color-mix(in_srgb,var(--accent-strong)_14%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_92%,transparent),color-mix(in_srgb,var(--surface)_94%,transparent))] p-3">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,color-mix(in_srgb,var(--glass-highlight)_24%,transparent)_42%,transparent_68%)] opacity-60" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

export function AdminFinanceTrendChart({ data }: { data: FinancePoint[] }) {
  const empty = data.every((point) => point.ingresos === 0 && point.gastos === 0);
  const totals = data.reduce(
    (acc, point) => ({
      ingresos: acc.ingresos + point.ingresos,
      gastos: acc.gastos + point.gastos,
    }),
    { ingresos: 0, gastos: 0 },
  );
  const net = totals.ingresos - totals.gastos;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ChartStat label="Ingresos 6 meses" value={moneyFormatter.format(totals.ingresos)} tone="success" />
        <ChartStat label="Gastos 6 meses" value={moneyFormatter.format(totals.gastos)} tone="danger" />
        <ChartStat label="Resultado" value={moneyFormatter.format(net)} tone={net >= 0 ? "success" : "danger"} />
      </div>
      <ChartShell empty={empty}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 14, top: 18, bottom: 0 }}>
            <defs>
              <linearGradient id="adminRevenue" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.5} />
                <stop offset="55%" stopColor="var(--success)" stopOpacity={0.16} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="adminExpense" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.36} />
                <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12, fontWeight: 700 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
            <Tooltip
              formatter={(value) => moneyFormatter.format(Number(value ?? 0))}
              cursor={{ stroke: "var(--accent-strong)", strokeDasharray: "5 5", strokeOpacity: 0.42 }}
              contentStyle={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 18,
                background: "var(--surface)",
                color: "var(--foreground)",
                boxShadow: "0 18px 60px rgba(15,23,42,0.22)",
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }} />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="var(--success)"
              fill="url(#adminRevenue)"
              strokeWidth={3.5}
              name="Ingresos"
              activeDot={{ r: 7, strokeWidth: 3, stroke: "var(--surface)", fill: "var(--success)" }}
              isAnimationActive
              animationBegin={120}
              animationDuration={1500}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="gastos"
              stroke="var(--danger)"
              fill="url(#adminExpense)"
              strokeWidth={3}
              name="Gastos"
              activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--surface)", fill: "var(--danger)" }}
              isAnimationActive
              animationBegin={300}
              animationDuration={1400}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

export function AdminAccessHealthChart({ data }: { data: HealthPoint[] }) {
  const empty = data.every((point) => point.value === 0);
  const total = data.reduce((acc, point) => acc + point.value, 0);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        {data.map((point) => (
          <div key={point.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-soft)]">{point.label}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{point.value}</p>
          </div>
        ))}
      </div>
      <ChartShell empty={empty}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 14, top: 18, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12, fontWeight: 700 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
            <Tooltip
              formatter={(value, name, item) => {
                const numericValue = Number(value ?? 0);
                const percentage = total > 0 ? Math.round((numericValue / total) * 100) : 0;
                return [`${numericValue} (${percentage}%)`, item.payload?.label ?? name];
              }}
              cursor={{ fill: "color-mix(in_srgb,var(--accent-strong)_8%,transparent)" }}
              contentStyle={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 18,
                background: "var(--surface)",
                color: "var(--foreground)",
                boxShadow: "0 18px 60px rgba(15,23,42,0.22)",
              }}
            />
            <Bar
              dataKey="value"
              radius={[18, 18, 6, 6]}
              name="Cantidad"
              isAnimationActive
              animationBegin={180}
              animationDuration={1300}
              animationEasing="ease-out"
            >
              {data.map((point) => (
                <Cell key={point.label} fill={healthColors[point.tone]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

function ChartStat({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          tone === "success" ? "bg-[var(--success)]" : "bg-[var(--danger)]"
        }`}
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
    </div>
  );
}
