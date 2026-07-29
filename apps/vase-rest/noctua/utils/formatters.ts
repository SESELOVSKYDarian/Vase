import type { DateRangePreset } from '@/types/analytics';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateLabel(date: Date, granularity: 'hour' | 'day' | 'month'): string {
  if (granularity === 'hour') {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (granularity === 'month') {
    return date.toLocaleDateString('es-AR', {
      month: 'short',
      year: 'numeric',
    });
  }

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatRangeForFile(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getGranularity(preset: DateRangePreset, from: Date, to: Date): 'hour' | 'day' | 'month' {
  if (preset === 'hoy') return 'hour';
  if (preset === 'año') return 'month';

  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
  return days > 60 ? 'month' : 'day';
}

export function normalizePaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    efectivo: 'Efectivo',
    billetera_virtual: 'Billetera virtual',
    debito: 'Débito',
    credito: 'Crédito',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
  };

  return labels[method] ?? 'Otros';
}
