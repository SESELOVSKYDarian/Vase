-- Movimiento interno no fiscal para NOCTUA.
-- Ejecutar manualmente en Supabase. No crea facturas, CAE, QR fiscal ni comprobantes.

create table if not exists public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid null references public.pedidos(id) on delete set null,
  mesa_id uuid null references public.mesas(id) on delete set null,
  tipo text not null check (tipo in ('ingreso_no_fiscal', 'egreso', 'ajuste')),
  metodo text not null default 'efectivo',
  importe numeric not null check (importe >= 0),
  motivo text not null,
  observacion text null,
  creado_por text null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_movimientos_caja_pedido_id
  on public.movimientos_caja(pedido_id);

create index if not exists idx_movimientos_caja_mesa_id
  on public.movimientos_caja(mesa_id);

create index if not exists idx_movimientos_caja_creado_en
  on public.movimientos_caja(creado_en);

create index if not exists idx_movimientos_caja_tipo
  on public.movimientos_caja(tipo);

create unique index if not exists movimientos_caja_ingreso_no_fiscal_pedido_unique
  on public.movimientos_caja(pedido_id)
  where tipo = 'ingreso_no_fiscal' and pedido_id is not null;

-- Si el proyecto tiene RLS activo en tablas nuevas, mantener las operaciones de esta
-- tabla desde el backend con service role o agregar politicas restrictivas para admin.
