import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PAYMENT_STATES = ['completado', 'pagado'];
const ORDER_STATES = ['cerrada', 'cerrado', 'pagado', 'entregado'];
const CONFIRMED_RESERVATION_STATES = ['confirmada', 'confirmado', 'activa', 'pendiente'];
const CANCELLED_RESERVATION_STATES = ['cancelada', 'cancelado', 'anulada', 'anulado'];

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Faltan variables de entorno de Supabase.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toState(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function ymd(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const preset = searchParams.get('preset') ?? 'hoy';

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'Parámetros from y to son requeridos.' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    // Período anterior para comparación
    const duration = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);

    const supabase = getSupabaseAdmin();

    // ─── Pagos del período actual ───────────────────────────────────────────
    const [pagosRes, pagosAnteriorRes, pedidosRes, pedidosAnteriorRes, facturasRes, reservasRes, pedidoItemsAllRes, productosRes, categoriasRes] =
      await Promise.all([
        supabase
          .from('pagos')
          .select('id, monto, metodo_pago, estado, creado_en')
          .in('estado', PAYMENT_STATES)
          .gte('creado_en', from.toISOString())
          .lte('creado_en', to.toISOString()),

        supabase
          .from('pagos')
          .select('id, monto, estado, creado_en')
          .in('estado', PAYMENT_STATES)
          .gte('creado_en', previousFrom.toISOString())
          .lte('creado_en', previousTo.toISOString()),

        supabase
          .from('pedidos')
          .select('id, total, estado, created_at, abierto_en')
          .in('estado', ORDER_STATES)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString()),

        supabase
          .from('pedidos')
          .select('id, total, estado, created_at, abierto_en')
          .in('estado', ORDER_STATES)
          .gte('created_at', previousFrom.toISOString())
          .lte('created_at', previousTo.toISOString()),

        supabase
          .from('facturas')
          .select('total, descuento, creada_en, creado_en')
          .gte('creada_en', from.toISOString())
          .lte('creada_en', to.toISOString()),

        supabase
          .from('reservas')
          .select('fecha, estado, cantidad_personas')
          .gte('fecha', ymd(fromStr))
          .lte('fecha', ymd(toStr)),

        supabase
          .from('pedido_items')
          .select('pedido_id, producto_id, cantidad, subtotal, precio_unitario'),

        supabase.from('productos').select('id, nombre, categoria_id, precio'),
        supabase.from('categorias').select('id, nombre'),
      ]);

    // Manejo de errores en pedidos — fallback a abierto_en si created_at falla
    let pedidos: any[] = pedidosRes.data ?? [];
    let pedidosAnteriores: any[] = pedidosAnteriorRes.data ?? [];

    if (pedidosRes.error) {
      const fallback = await supabase
        .from('pedidos')
        .select('id, total, estado, abierto_en')
        .in('estado', ORDER_STATES)
        .gte('abierto_en', from.toISOString())
        .lte('abierto_en', to.toISOString());
      pedidos = fallback.data ?? [];
    }

    if (pedidosAnteriorRes.error) {
      const fallback = await supabase
        .from('pedidos')
        .select('id, total, estado, abierto_en')
        .in('estado', ORDER_STATES)
        .gte('abierto_en', previousFrom.toISOString())
        .lte('abierto_en', previousTo.toISOString());
      pedidosAnteriores = fallback.data ?? [];
    }

    const pagos = pagosRes.data ?? [];
    const pagosAnteriores = pagosAnteriorRes.data ?? [];
    const facturas = facturasRes.data ?? [];
    const reservas = reservasRes.data ?? [];
    const allItems = pedidoItemsAllRes.data ?? [];
    const productos = productosRes.data ?? [];
    const categorias = categoriasRes.data ?? [];

    // ─── KPIs ───────────────────────────────────────────────────────────────
    const totalRevenue = pagos.reduce((sum: number, p: Record<string, unknown>) => sum + toNumber(p.monto), 0);
    const previousRevenue = pagosAnteriores.reduce((sum: number, p: Record<string, unknown>) => sum + toNumber(p.monto), 0);
    const totalOrders = pedidos.length;
    const previousTotalOrders = pedidosAnteriores.length;

    const kpis = {
      totalRevenue,
      totalOrders,
      averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalDiscounts: facturas.reduce((sum: number, f: Record<string, unknown>) => sum + toNumber(f.descuento), 0),
      totalReservations: reservas.length,
      revenueVsPreviousPeriod: percentageChange(totalRevenue, previousRevenue),
      ordersVsPreviousPeriod: percentageChange(totalOrders, previousTotalOrders),
    };

    // ─── Revenue over time ──────────────────────────────────────────────────
    const revenueMap = new Map<string, { date: string; revenue: number; orders: number }>();

    function getBucketKey(dateVal: Date): string {
      if (preset === 'hoy') {
        return `${dateVal.getHours().toString().padStart(2, '0')}:00`;
      }
      if (preset === 'semana' || preset === 'mes') {
        return dateVal.toISOString().slice(0, 10);
      }
      // año o personalizado largo → por mes
      return dateVal.toISOString().slice(0, 7);
    }

    for (const pago of pagos as Record<string, unknown>[]) {
      if (!pago.creado_en) continue;
      const key = getBucketKey(new Date(pago.creado_en as string));
      const cur = revenueMap.get(key) ?? { date: key, revenue: 0, orders: 0 };
      cur.revenue += toNumber(pago.monto);
      revenueMap.set(key, cur);
    }

    for (const pedido of pedidos as Record<string, unknown>[]) {
      const raw = (pedido.created_at ?? pedido.abierto_en) as string | null;
      if (!raw) continue;
      const key = getBucketKey(new Date(raw));
      const cur = revenueMap.get(key) ?? { date: key, revenue: 0, orders: 0 };
      cur.orders += 1;
      revenueMap.set(key, cur);
    }

    const revenueOverTime = Array.from(revenueMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ─── Hourly sales heatmap ───────────────────────────────────────────────
    const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const HEATMAP_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const grid = new Map<string, { day: string; hour: number; value: number }>();

    for (const day of HEATMAP_DAYS) {
      for (let hour = 0; hour < 24; hour++) {
        grid.set(`${day}-${hour}`, { day, hour, value: 0 });
      }
    }

    for (const pago of pagos as Record<string, unknown>[]) {
      if (!pago.creado_en) continue;
      const d = new Date(pago.creado_en as string);
      const day = DAYS[d.getDay()];
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      const cur = grid.get(key);
      if (cur) cur.value += toNumber(pago.monto);
    }

    const hourlySales = Array.from(grid.values());

    // ─── Top products ───────────────────────────────────────────────────────
    const pedidoIds = new Set(pedidos.map((p: Record<string, unknown>) => p.id));
    const productMap = new Map<string, Record<string, unknown>>();
    for (const prod of productos as Record<string, unknown>[]) {
      productMap.set(String(prod.id), prod);
    }
    const categoriaMap = new Map<string, string>();
    for (const cat of categorias as Record<string, unknown>[]) {
      categoriaMap.set(String(cat.id), (cat.nombre as string) ?? 'Sin categoría');
    }

    const grouped = new Map<string, { productId: string; nombre: string; categoria: string; totalUnits: number; totalRevenue: number }>();

    for (const item of allItems as Record<string, unknown>[]) {
      if (!pedidoIds.has(item.pedido_id)) continue;
      if (item.producto_id === null) continue;
      const productId = String(item.producto_id);
      const prod = productMap.get(productId);
      const cantidad = toNumber(item.cantidad);
      const totalRev = toNumber(item.subtotal) || cantidad * toNumber(item.precio_unitario ?? prod?.precio);
      const cur = grouped.get(productId) ?? {
        productId,
        nombre: (prod?.nombre as string) ?? 'Producto sin nombre',
        categoria: categoriaMap.get(String(prod?.categoria_id ?? '')) ?? 'Sin categoría',
        totalUnits: 0,
        totalRevenue: 0,
      };
      cur.totalUnits += cantidad;
      cur.totalRevenue += totalRev;
      grouped.set(productId, cur);
    }

    const sorted = Array.from(grouped.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topProducts = {
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5).reverse(),
    };

    // ─── Payment methods ────────────────────────────────────────────────────
    const methodMap = new Map<string, { total: number; count: number }>();
    for (const pago of pagos as Record<string, unknown>[]) {
      const method = String(pago.metodo_pago ?? 'otros');
      const cur = methodMap.get(method) ?? { total: 0, count: 0 };
      cur.total += toNumber(pago.monto);
      cur.count += 1;
      methodMap.set(method, cur);
    }

    const paymentMethods = Array.from(methodMap.entries())
      .map(([method, val]) => ({
        method,
        total: val.total,
        count: val.count,
        percentage: totalRevenue > 0 ? (val.total / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ─── Reservation stats ──────────────────────────────────────────────────
    const total = reservas.length;
    const confirmed = reservas.filter((r: Record<string, unknown>) =>
      CONFIRMED_RESERVATION_STATES.includes(toState(r.estado))
    ).length;
    const cancelled = reservas.filter((r: Record<string, unknown>) =>
      CANCELLED_RESERVATION_STATES.includes(toState(r.estado))
    ).length;
    const totalGuests = reservas.reduce((sum: number, r: Record<string, unknown>) => sum + toNumber(r.cantidad_personas), 0);

    const reservationStats = {
      total,
      confirmed,
      cancelled,
      totalGuests,
      cancelRate: total > 0 ? (cancelled / total) * 100 : 0,
    };

    return NextResponse.json({
      kpis,
      revenueOverTime,
      hourlySales,
      topProducts,
      paymentMethods,
      reservationStats,
    });
  } catch (error) {
    console.error('Error en API analytics:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
