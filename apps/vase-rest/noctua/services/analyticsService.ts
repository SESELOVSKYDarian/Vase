/**
 * analyticsService.ts
 *
 * Todas las consultas se delegan a /api/admin/analytics (Next.js API route)
 * que corre en el servidor con la service_role key, evitando las restricciones
 * de RLS que bloquean al cliente anónimo de Supabase.
 */

import type {
  DateRangePreset,
  HourlySalesPoint,
  KPIData,
  PaymentMethodData,
  ReservationStats,
  RevenuePoint,
  TopProductsData,
} from '@/types/analytics';

export interface AnalyticsApiResponse {
  kpis: KPIData;
  revenueOverTime: RevenuePoint[];
  hourlySales: HourlySalesPoint[];
  topProducts: TopProductsData;
  paymentMethods: PaymentMethodData[];
  reservationStats: ReservationStats;
}

/**
 * Función principal: hace una sola llamada a la API route del servidor
 * y retorna todos los datos de analytics de una vez.
 */
export async function fetchAllAnalytics(
  from: Date,
  to: Date,
  preset: DateRangePreset
): Promise<AnalyticsApiResponse> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    preset,
  });

  const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error ?? `Error al obtener analytics: HTTP ${res.status}`);
  }

  const data = await res.json() as AnalyticsApiResponse & { error?: string };

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// ─── Wrappers individuales (mantienen compatibilidad con el hook existente) ──

export async function fetchKPIs(from: Date, to: Date, preset: DateRangePreset = 'hoy'): Promise<KPIData> {
  const data = await fetchAllAnalytics(from, to, preset);
  return data.kpis;
}

export async function fetchRevenueOverTime(
  from: Date,
  to: Date,
  preset: DateRangePreset
): Promise<RevenuePoint[]> {
  const data = await fetchAllAnalytics(from, to, preset);
  return data.revenueOverTime;
}

export async function fetchHourlySales(from: Date, to: Date, preset: DateRangePreset = 'hoy'): Promise<HourlySalesPoint[]> {
  const data = await fetchAllAnalytics(from, to, preset);
  return data.hourlySales;
}

export async function fetchTopProducts(from: Date, to: Date, preset: DateRangePreset = 'hoy'): Promise<TopProductsData> {
  const data = await fetchAllAnalytics(from, to, preset);
  return data.topProducts;
}

export async function fetchPaymentMethods(from: Date, to: Date, preset: DateRangePreset = 'hoy'): Promise<PaymentMethodData[]> {
  const data = await fetchAllAnalytics(from, to, preset);
  return data.paymentMethods;
}

export async function fetchReservationStats(from: Date, to: Date, preset: DateRangePreset = 'hoy'): Promise<ReservationStats> {
  const data = await fetchAllAnalytics(from, to, preset);
  return data.reservationStats;
}
