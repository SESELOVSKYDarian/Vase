'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DASHBOARD_COLORS } from '@/constants/dashboardColors';
import type { PaymentMethodData } from '@/types/analytics';
import { formatCurrency, normalizePaymentMethod } from '@/utils/formatters';

interface PaymentMethodsChartProps {
  data: PaymentMethodData[];
  loading?: boolean;
  error?: string | null;
}

export function PaymentMethodsChart({ data, loading, error }: PaymentMethodsChartProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (loading) return <div className="h-80 rounded-lg border border-[#1a1a1a] bg-[#080808] animate-pulse" />;
  if (error) return <EmptyPayment message="Error al cargar los datos. Intentá de nuevo." />;
  if (data.length === 0) return <EmptyPayment message="Sin datos para el período seleccionado" />;

  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Métodos de pago</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="relative h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="method" innerRadius={64} outerRadius={92} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.method} fill={paymentColor(entry.method)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#fff' }}
                formatter={(value) => [formatCurrency(Number(value)), 'Total']}
                labelFormatter={(label) => normalizePaymentMethod(String(label))}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-[#676B67]">Total</span>
            <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
          </div>
        </div>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.method} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: paymentColor(item.method) }} />
                <span className="text-sm text-[#BCB9B9]">{normalizePaymentMethod(item.method)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{formatCurrency(item.total)}</p>
                <p className="text-xs text-[#676B67]">{item.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function paymentColor(method: string): string {
  const key = method as keyof typeof DASHBOARD_COLORS.payments;
  return DASHBOARD_COLORS.payments[key] ?? DASHBOARD_COLORS.payments.otros;
}

function EmptyPayment({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Métodos de pago</h2>
      <div className="mt-5 flex h-72 items-center justify-center text-sm text-[#676B67]">{message}</div>
    </section>
  );
}
