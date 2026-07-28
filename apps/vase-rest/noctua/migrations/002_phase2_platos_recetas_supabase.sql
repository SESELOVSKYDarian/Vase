-- NOCTUA Phase 2 correction: real Platos recipes and ingredient stock.
-- Apply from Supabase SQL editor or a privileged Postgres connection.
-- This file was generated locally; it was not applied automatically by Codex.

create extension if not exists "uuid-ossp";

create table if not exists public.ingredientes (
  id uuid primary key default uuid_generate_v4(),
  nombre varchar not null,
  unidad_medida text not null,
  stock_actual numeric not null default 0 check (stock_actual >= 0),
  stock_minimo numeric default 0 check (stock_minimo >= 0),
  creado_en timestamp default now()
);

create table if not exists public.producto_ingredientes (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid not null references public.productos(id),
  ingrediente_id uuid not null references public.ingredientes(id),
  cantidad_necesaria numeric not null check (cantidad_necesaria > 0),
  unidad text not null,
  unique (producto_id, ingrediente_id)
);

alter table public.productos
  add column if not exists activo boolean default true;

update public.productos
set activo = true
where activo is null;

alter table public.movimientos_stock
  add column if not exists ingrediente_id uuid references public.ingredientes(id);

create index if not exists producto_ingredientes_producto_idx
  on public.producto_ingredientes(producto_id);

create index if not exists producto_ingredientes_ingrediente_idx
  on public.producto_ingredientes(ingrediente_id);

create index if not exists ingredientes_nombre_idx
  on public.ingredientes(nombre);

create or replace function public.noctua_request_role()
returns text
language sql
stable
as $$
  select lower(coalesce(
    nullif(auth.jwt() ->> 'rol', ''),
    nullif(auth.jwt() ->> 'role', ''),
    nullif((current_setting('request.headers', true)::jsonb ->> 'x-noctua-role'), ''),
    ''
  ));
$$;

alter table public.ingredientes enable row level security;
alter table public.producto_ingredientes enable row level security;

drop policy if exists ingredientes_read on public.ingredientes;
drop policy if exists ingredientes_admin_write on public.ingredientes;
drop policy if exists producto_ingredientes_read on public.producto_ingredientes;
drop policy if exists producto_ingredientes_admin_write on public.producto_ingredientes;

create policy ingredientes_read
  on public.ingredientes
  for select
  to anon, authenticated
  using (true);

create policy ingredientes_admin_write
  on public.ingredientes
  for all
  to anon, authenticated
  using (public.noctua_request_role() in ('admin', 'stock'))
  with check (public.noctua_request_role() in ('admin', 'stock'));

create policy producto_ingredientes_read
  on public.producto_ingredientes
  for select
  to anon, authenticated
  using (true);

create policy producto_ingredientes_admin_write
  on public.producto_ingredientes
  for all
  to anon, authenticated
  using (public.noctua_request_role() in ('admin', 'stock'))
  with check (public.noctua_request_role() in ('admin', 'stock'));

create or replace function public.recalcular_disponibilidad_producto(p_producto_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tiene_receta boolean;
  v_disponible boolean;
begin
  select exists (
    select 1
    from public.producto_ingredientes
    where producto_id = p_producto_id
  )
  into v_tiene_receta;

  if not v_tiene_receta then
    select coalesce(disponible, true)
    into v_disponible
    from public.productos
    where id = p_producto_id;

    return coalesce(v_disponible, true);
  end if;

  select bool_and(i.stock_actual >= pi.cantidad_necesaria)
  into v_disponible
  from public.producto_ingredientes pi
  join public.ingredientes i on i.id = pi.ingrediente_id
  where pi.producto_id = p_producto_id;

  update public.productos
  set disponible = coalesce(v_disponible, false)
  where id = p_producto_id;

  return coalesce(v_disponible, false);
end;
$$;

create or replace function public.descontar_stock_por_venta(
  p_producto_id uuid,
  p_cantidad numeric,
  p_pedido_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_requerido numeric;
  v_nuevo_stock numeric;
  v_tiene_receta boolean;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad vendida debe ser mayor a cero';
  end if;

  select exists (
    select 1
    from public.producto_ingredientes
    where producto_id = p_producto_id
  )
  into v_tiene_receta;

  if not v_tiene_receta then
    return;
  end if;

  for v_item in
    select
      pi.ingrediente_id,
      pi.cantidad_necesaria,
      i.nombre,
      i.stock_actual
    from public.producto_ingredientes pi
    join public.ingredientes i on i.id = pi.ingrediente_id
    where pi.producto_id = p_producto_id
    for update of i
  loop
    v_requerido := v_item.cantidad_necesaria * p_cantidad;

    if v_item.stock_actual < v_requerido then
      raise exception 'Stock insuficiente de %', v_item.nombre;
    end if;

    update public.ingredientes
    set stock_actual = stock_actual - v_requerido
    where id = v_item.ingrediente_id
    returning stock_actual into v_nuevo_stock;

    insert into public.movimientos_stock (
      producto_id,
      ingrediente_id,
      cantidad,
      motivo,
      tipo,
      stock_anterior,
      stock_nuevo,
      pedido_id
    )
    values (
      p_producto_id,
      v_item.ingrediente_id,
      v_requerido,
      'venta',
      'salida',
      v_item.stock_actual,
      v_nuevo_stock,
      p_pedido_id
    );
  end loop;

  perform public.recalcular_disponibilidad_producto(p_producto_id);
end;
$$;

create or replace function public.restaurar_stock_por_cancelacion(
  p_producto_id uuid,
  p_cantidad numeric,
  p_pedido_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_requerido numeric;
  v_nuevo_stock numeric;
  v_tiene_receta boolean;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad a restaurar debe ser mayor a cero';
  end if;

  select exists (
    select 1
    from public.producto_ingredientes
    where producto_id = p_producto_id
  )
  into v_tiene_receta;

  if not v_tiene_receta then
    return;
  end if;

  for v_item in
    select
      pi.ingrediente_id,
      pi.cantidad_necesaria,
      i.stock_actual
    from public.producto_ingredientes pi
    join public.ingredientes i on i.id = pi.ingrediente_id
    where pi.producto_id = p_producto_id
    for update of i
  loop
    v_requerido := v_item.cantidad_necesaria * p_cantidad;

    update public.ingredientes
    set stock_actual = stock_actual + v_requerido
    where id = v_item.ingrediente_id
    returning stock_actual into v_nuevo_stock;

    insert into public.movimientos_stock (
      producto_id,
      ingrediente_id,
      cantidad,
      motivo,
      tipo,
      stock_anterior,
      stock_nuevo,
      pedido_id
    )
    values (
      p_producto_id,
      v_item.ingrediente_id,
      v_requerido,
      'cancelacion',
      'entrada',
      v_item.stock_actual,
      v_nuevo_stock,
      p_pedido_id
    );
  end loop;

  perform public.recalcular_disponibilidad_producto(p_producto_id);
end;
$$;
