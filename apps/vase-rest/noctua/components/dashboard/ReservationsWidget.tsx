'use client';

import { CalendarCheck, Users } from 'lucide-react';
import type { ReservationStats } from '@/types/analytics';

interface ReservationsWidgetProps {
  data: ReservationStats | null;
  loading?: boolean;
  error?: string | null;
}

export function ReservationsWidget({ data, loading, error }: ReservationsWidgetProps) {
  if (loading) return <div className="h-80 rounded-lg border border-[#1a1a1a] bg-[#080808] animate-pulse" />;
  if (error) return <WidgetEmpty message="Error al cargar los datos. Intentá de nuevo." />;
  if (!data || data.total === 0) return <WidgetEmpty message="Sin datos para el período seleccionado" />;

  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Reservas</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric icon={CalendarCheck} label="Total" value={data.total.toString()} />
        <Metric icon={Users} label="Comensales" value={data.totalGuests.toString()} />
        <Metric label="Confirmadas" value={data.confirmed.toString()} tone="green" />
        <Metric label="Canceladas" value={data.cancelled.toString()} tone="red" />
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[#BCB9B9]">Tasa de cancelación</span>
          <span className="font-semibold text-white">{data.cancelRate.toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
          <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(data.cancelRate, 100)}%` }} />
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: typeof CalendarCheck;
  tone?: 'green' | 'red';
}) {
  return (
    <div className="rounded-md border border-[#1a1a1a] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#676B67]">
        {Icon && <Icon size={14} />}
        {label}
      </div>
      <p className={tone === 'green' ? 'mt-2 text-2xl font-bold text-green-400' : tone === 'red' ? 'mt-2 text-2xl font-bold text-red-400' : 'mt-2 text-2xl font-bold text-white'}>
        {value}
      </p>
    </div>
  );
}

function WidgetEmpty({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Reservas</h2>
      <div className="mt-5 flex h-72 items-center justify-center text-sm text-[#676B67]">{message}</div>
    </section>
  );
}
