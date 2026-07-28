'use client';

import { useMemo } from 'react';
import { DASHBOARD_COLORS } from '@/constants/dashboardColors';
import type { HourlySalesPoint } from '@/types/analytics';
import { formatCurrency } from '@/utils/formatters';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 24 }, (_, index) => index);

interface HourlySalesHeatmapProps {
  data: HourlySalesPoint[];
  loading?: boolean;
  error?: string | null;
}

export function HourlySalesHeatmap({ data, loading, error }: HourlySalesHeatmapProps) {
  const maxValue = useMemo(() => Math.max(...data.map((item) => item.value), 0), [data]);
  const byKey = useMemo(() => new Map(data.map((item) => [`${item.day}-${item.hour}`, item])), [data]);

  if (loading) return <div className="h-80 rounded-lg border border-[#1a1a1a] bg-[#080808] animate-pulse" />;
  if (error) return <HeatmapEmpty message="Error al cargar los datos. Intentá de nuevo." />;
  if (data.every((item) => item.value === 0)) return <HeatmapEmpty message="Sin datos para el período seleccionado" />;

  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Ventas por día y hora</h2>
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[44px_repeat(24,minmax(26px,1fr))] gap-1">
            <div />
            {HOURS.map((hour) => (
              <div key={hour} className="text-center text-[10px] text-[#676B67]">{hour}</div>
            ))}
            {DAYS.map((day) => (
              <div key={day} className="contents">
                <div className="flex items-center text-xs font-semibold text-[#BCB9B9]">{day}</div>
                {HOURS.map((hour) => {
                  const item = byKey.get(`${day}-${hour}`) ?? { day, hour, value: 0 };
                  return (
                    <div
                      key={`${day}-${hour}`}
                      title={`${day} ${hour.toString().padStart(2, '0')}:00: ${formatCurrency(item.value)} en ventas`}
                      className="h-7 rounded"
                      style={{ backgroundColor: colorForValue(item.value, maxValue) }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function colorForValue(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return DASHBOARD_COLORS.heatmap[0];
  const ratio = value / maxValue;
  const index = Math.min(DASHBOARD_COLORS.heatmap.length - 1, Math.ceil(ratio * (DASHBOARD_COLORS.heatmap.length - 1)));
  return DASHBOARD_COLORS.heatmap[index];
}

function HeatmapEmpty({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#BCB9B9]">Ventas por día y hora</h2>
      <div className="mt-5 flex h-64 items-center justify-center text-sm text-[#676B67]">{message}</div>
    </section>
  );
}
