'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DASHBOARD_COLORS } from '@/constants/dashboardColors';
import type { RevenuePoint } from '@/types/analytics';
import { formatCurrency } from '@/utils/formatters';

interface SalesLineChartProps {
  data: RevenuePoint[];
  loading?: boolean;
  error?: string | null;
}

export function SalesLineChart({ data, loading, error }: SalesLineChartProps) {
  if (loading) return <ChartSkeleton />;
  if (error) return <EmptyChart message="Error al cargar los datos. Intentá de nuevo." />;
  if (data.length === 0) return <EmptyChart message="Sin datos para el período seleccionado" />;

  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Ingresos en el tiempo</h2>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 6, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid stroke="#1a1a1a" vertical={false} />
            <XAxis dataKey="date" stroke={DASHBOARD_COLORS.muted} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="revenue" stroke={DASHBOARD_COLORS.muted} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="orders" orientation="right" stroke={DASHBOARD_COLORS.muted} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#BCB9B9' }}
              formatter={(value, name) => [
                name === 'revenue' ? formatCurrency(Number(value)) : `${value} pedidos`,
                name === 'revenue' ? 'Ingresos' : 'Pedidos',
              ]}
            />
            <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke={DASHBOARD_COLORS.revenue} strokeWidth={3} dot={false} />
            <Line yAxisId="orders" type="monotone" dataKey="orders" stroke={DASHBOARD_COLORS.orders} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ChartSkeleton() {
  return <div className="h-[378px] rounded-lg border border-[#1a1a1a] bg-[#080808] animate-pulse" />;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Ingresos en el tiempo</h2>
      <div className="mt-5 flex h-80 items-center justify-center text-sm text-[#676B67]">{message}</div>
    </section>
  );
}
