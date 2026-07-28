'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  DollarSign,
  Percent,
  RefreshCw,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { KPICard } from '@/components/dashboard/KPICard';
import { ReservationsWidget } from '@/components/dashboard/ReservationsWidget';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuthStore } from '@/store/authStore';
import type { DateRange, DateRangePreset } from '@/types/analytics';
import { formatCurrency, formatDateInput } from '@/utils/formatters';

const ChartSkeleton = () => (
  <div className="h-80 animate-pulse rounded-lg border border-[#1a1a1a] bg-[#080808]" />
);

const SalesLineChart = dynamic(
  () => import('@/components/dashboard/SalesLineChart').then((module) => module.SalesLineChart),
  { ssr: false, loading: ChartSkeleton }
);

const TopProductsChart = dynamic(
  () => import('@/components/dashboard/TopProductsChart').then((module) => module.TopProductsChart),
  { ssr: false, loading: ChartSkeleton }
);

const PaymentMethodsChart = dynamic(
  () => import('@/components/dashboard/PaymentMethodsChart').then((module) => module.PaymentMethodsChart),
  { ssr: false, loading: ChartSkeleton }
);

const HourlySalesHeatmap = dynamic(
  () => import('@/components/dashboard/HourlySalesHeatmap').then((module) => module.HourlySalesHeatmap),
  { ssr: false, loading: ChartSkeleton }
);

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'año', label: 'Año' },
  { value: 'personalizado', label: 'Personalizado' },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function rangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(now);

  if (preset === 'semana') from.setDate(from.getDate() - 6);
  if (preset === 'mes') from.setMonth(from.getMonth() - 1);
  if (preset === 'año') from.setFullYear(from.getFullYear() - 1);

  return { preset, from, to };
}

export default function AnalyticsPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<DateRangePreset>('hoy');
  const [customFrom, setCustomFrom] = useState(formatDateInput(new Date()));
  const [customTo, setCustomTo] = useState(formatDateInput(new Date()));

  const dateRange = useMemo<DateRange>(() => {
    if (preset !== 'personalizado') return rangeFromPreset(preset);

    return {
      preset,
      from: startOfDay(new Date(`${customFrom}T00:00:00`)),
      to: endOfDay(new Date(`${customTo}T00:00:00`)),
    };
  }, [customFrom, customTo, preset]);

  const { data, loading, error, refetch } = useDashboardData(dateRange);

  const handlePresetChange = useCallback((nextPreset: DateRangePreset) => {
    setPreset(nextPreset);

    if (nextPreset !== 'personalizado') {
      const range = rangeFromPreset(nextPreset);
      setCustomFrom(formatDateInput(range.from));
      setCustomTo(formatDateInput(range.to));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (usuario?.rol && usuario.rol !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-8 text-center">
          <h1 className="text-xl font-bold text-white">Acceso restringido</h1>
          <p className="mt-2 text-sm text-[#676B67]">Solo administradores pueden ver este dashboard.</p>
        </div>
      </div>
    );
  }

  const hasData = Boolean(data);
  const kpis = data?.kpis;

  return (
    <main ref={dashboardRef} className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#676B67]">Analítica de ventas</p>
          <h1 className="mt-2 text-3xl font-black text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-[#676B67]">Métricas de ingresos, pedidos, productos, pagos y reservas.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1 rounded-lg border border-[#1a1a1a] bg-[#080808] p-1">
            {PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handlePresetChange(item.value)}
                className={preset === item.value ? 'rounded-md bg-white px-3 py-2 text-sm font-semibold text-black' : 'rounded-md px-3 py-2 text-sm font-semibold text-[#676B67] hover:bg-white/5 hover:text-white'}
              >
                {item.label}
              </button>
            ))}
          </div>

          {preset === 'personalizado' && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-[#1a1a1a] bg-[#080808] p-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#676B67]">
                Desde
                <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="rounded-md border border-[#222] bg-[#111] px-2 py-1.5 text-sm text-white outline-none focus:border-[#555]" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#676B67]">
                Hasta
                <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="rounded-md border border-[#222] bg-[#111] px-2 py-1.5 text-sm text-white outline-none focus:border-[#555]" />
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#1a1a1a] bg-[#080808] px-4 py-2 text-sm font-semibold text-[#BCB9B9] transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <ExportButton data={data} dateRange={dateRange} targetRef={dashboardRef} />
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar los datos. Intentá de nuevo.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard label="Ingresos" value={formatCurrency(kpis?.totalRevenue ?? 0)} comparison={kpis?.revenueVsPreviousPeriod ?? 0} icon={DollarSign} loading={loading && !hasData} empty={!kpis} />
        <KPICard label="Pedidos" value={(kpis?.totalOrders ?? 0).toString()} comparison={kpis?.ordersVsPreviousPeriod ?? 0} icon={ShoppingBag} loading={loading && !hasData} empty={!kpis} />
        <KPICard label="Ticket promedio" value={formatCurrency(kpis?.averageTicket ?? 0)} icon={Ticket} loading={loading && !hasData} empty={!kpis} />
        <KPICard label="Descuentos" value={formatCurrency(kpis?.totalDiscounts ?? 0)} icon={Percent} loading={loading && !hasData} empty={!kpis} />
        <KPICard label="Reservas" value={(kpis?.totalReservations ?? 0).toString()} icon={CalendarDays} loading={loading && !hasData} empty={!kpis} />
      </section>

      <SalesLineChart data={data?.revenueOverTime ?? []} loading={loading && !hasData} error={error} />

      <section className="grid gap-6 xl:grid-cols-2">
        <TopProductsChart title="Productos más vendidos" data={data?.topProducts.top ?? []} variant="top" loading={loading && !hasData} error={error} />
        <PaymentMethodsChart data={data?.paymentMethods ?? []} loading={loading && !hasData} error={error} />
      </section>

      <HourlySalesHeatmap data={data?.hourlySales ?? []} loading={loading && !hasData} error={error} />

      <section className="grid gap-6 xl:grid-cols-2">
        <TopProductsChart title="Productos menos vendidos" data={data?.topProducts.bottom ?? []} variant="bottom" loading={loading && !hasData} error={error} />
        <ReservationsWidget data={data?.reservationStats ?? null} loading={loading && !hasData} error={error} />
      </section>
    </main>
  );
}
