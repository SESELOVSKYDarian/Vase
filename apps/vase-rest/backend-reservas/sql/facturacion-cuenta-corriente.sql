-- Cambios manuales para cuenta corriente y exportacion.
-- Revisar en Supabase antes de ejecutar. No modifica CAE ni numeracion existente.

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  documento text,
  condicion_fiscal text,
  email text,
  telefono text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index if not exists clientes_documento_unique
  on public.clientes (documento)
  where documento is not null and documento <> '';

alter table public.facturas
  add column if not exists cliente_id uuid references public.clientes(id),
  add column if not exists saldo_pendiente numeric not null default 0;

alter table public.pagos
  add column if not exists cliente_id uuid references public.clientes(id);

-- Si la tabla pagos tiene un CHECK sobre metodo_pago, reemplazarlo para incluir cuenta_corriente.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'pagos'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%metodo_pago%';

  if constraint_name is not null then
    execute format('alter table public.pagos drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.pagos
  add constraint pagos_metodo_pago_check
  check (metodo_pago in ('debito', 'credito', 'billetera_virtual', 'efectivo', 'cuenta_corriente'));

create table if not exists public.cuentas_corrientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references public.clientes(id),
  estado text not null default 'activa' check (estado in ('activa', 'suspendida', 'cerrada')),
  restaurante_id uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.pagos_cuenta_corriente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  cuenta_corriente_id uuid references public.cuentas_corrientes(id),
  importe numeric not null check (importe > 0),
  moneda text not null default 'ARS',
  medio_pago text not null,
  referencia text,
  observaciones text,
  fecha_pago timestamptz not null default now(),
  creado_por text,
  idempotency_key text,
  creado_en timestamptz not null default now()
);

create unique index if not exists pagos_cc_idempotency_unique
  on public.pagos_cuenta_corriente (idempotency_key)
  where idempotency_key is not null and idempotency_key <> '';

create table if not exists public.movimientos_cuenta_corriente (
  id uuid primary key default gen_random_uuid(),
  cuenta_corriente_id uuid not null references public.cuentas_corrientes(id),
  cliente_id uuid not null references public.clientes(id),
  tipo text not null check (tipo in ('DEBIT', 'CREDIT')),
  origen text not null check (origen in ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'REVERSAL', 'MANUAL_ADJUSTMENT')),
  importe numeric not null check (importe > 0),
  moneda text not null default 'ARS',
  fecha timestamptz not null default now(),
  descripcion text not null,
  factura_id uuid references public.facturas(id),
  pago_cuenta_corriente_id uuid references public.pagos_cuenta_corriente(id),
  movimiento_revertido_id uuid references public.movimientos_cuenta_corriente(id),
  creado_por text,
  restaurante_id uuid,
  idempotency_key text,
  creado_en timestamptz not null default now()
);

create unique index if not exists movimientos_cc_factura_invoice_unique
  on public.movimientos_cuenta_corriente (factura_id)
  where origen = 'INVOICE' and factura_id is not null;

create unique index if not exists movimientos_cc_pago_payment_unique
  on public.movimientos_cuenta_corriente (pago_cuenta_corriente_id)
  where origen = 'PAYMENT' and pago_cuenta_corriente_id is not null;

create unique index if not exists movimientos_cc_idempotency_unique
  on public.movimientos_cuenta_corriente (idempotency_key)
  where idempotency_key is not null and idempotency_key <> '';

create index if not exists movimientos_cc_cliente_fecha_idx
  on public.movimientos_cuenta_corriente (cliente_id, fecha, creado_en);
