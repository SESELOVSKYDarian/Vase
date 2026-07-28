export type DateRangePreset = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado';

export interface DateRange {
  preset: DateRangePreset;
  from: Date;
  to: Date;
}

export interface KPIData {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  totalDiscounts: number;
  totalReservations: number;
  revenueVsPreviousPeriod: number;
  ordersVsPreviousPeriod: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface HourlySalesPoint {
  day: string;
  hour: number;
  value: number;
}

export interface ProductAnalytics {
  productId: string;
  nombre: string;
  categoria: string;
  totalUnits: number;
  totalRevenue: number;
}

export interface TopProductsData {
  top: ProductAnalytics[];
  bottom: ProductAnalytics[];
}

export interface PaymentMethodData {
  method: string;
  total: number;
  count: number;
  percentage: number;
}

export interface ReservationStats {
  total: number;
  confirmed: number;
  cancelled: number;
  totalGuests: number;
  cancelRate: number;
}

export interface DashboardData {
  kpis: KPIData;
  revenueOverTime: RevenuePoint[];
  hourlySales: HourlySalesPoint[];
  topProducts: TopProductsData;
  paymentMethods: PaymentMethodData[];
  reservationStats: ReservationStats;
}
