'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DASHBOARD_COLORS } from '@/constants/dashboardColors';
import type { ProductAnalytics } from '@/types/analytics';
import { formatCurrency } from '@/utils/formatters';

interface TopProductsChartProps {
  title: string;
  data: ProductAnalytics[];
  variant: 'top' | 'bottom';
  loading?: boolean;
  error?: string | null;
}

export function TopProductsChart({ title, data, variant, loading, error }: TopProductsChartProps) {
  if (loading) return <div className="h-80 rounded-lg border border-[#1a1a1a] bg-[#080808] animate-pulse" />;
  if (error) return <EmptyProducts title={title} message="Error al cargar los datos. Intentá de nuevo." />;
  if (data.length === 0) return <EmptyProducts title={title} message="Sin datos para el período seleccionado" />;

  const color = variant === 'top' ? DASHBOARD_COLORS.positive : DASHBOARD_COLORS.negative;

  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">{title}</h2>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 18, top: 4, bottom: 4 }}>
            <CartesianGrid stroke="#1a1a1a" horizontal={false} />
            <XAxis type="number" stroke={DASHBOARD_COLORS.muted} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="nombre"
              width={112}
              stroke={DASHBOARD_COLORS.muted}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => truncate(String(value))}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#fff' }}
              formatter={(value) => [formatCurrency(Number(value)), 'Ventas']}
              labelFormatter={(label) => {
                const product = data.find((item) => item.nombre === label);
                return product ? `${product.nombre} - ${product.categoria}` : String(label);
              }}
            />
            <Bar dataKey="totalRevenue" fill={color} radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function truncate(value: string) {
  return value.length > 18 ? `${value.slice(0, 17)}...` : value;
}

function EmptyProducts({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">{title}</h2>
      <div className="mt-5 flex h-72 items-center justify-center text-sm text-[#676B67]">{message}</div>
    </section>
  );
}
