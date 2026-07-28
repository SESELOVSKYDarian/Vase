
-- Migration: Add mozos table
-- Apply from Supabase SQL editor or a privileged Postgres connection.

create extension if not exists "uuid-ossp";

create table if not exists public.mozos (
  id uuid primary key default uuid_generate_v4(),
  nombre varchar not null,
  apellido varchar not null,
  zona text not null,
  posicion_ciclo int4 not null,
  activo boolean not null default true,
  creado_en timestamptz default now()
);

create index if not exists mozos_zona_idx
  on public.mozos(zona);

create index if not exists mozos_posicion_ciclo_idx
  on public.mozos(posicion_ciclo);

create index if not exists mozos_activo_idx
  on public.mozos(activo);

alter table public.mozos enable row level security;

drop policy if exists mozos_read on public.mozos;
drop policy if exists mozos_admin_write on public.mozos;

create policy mozos_read
  on public.mozos
  for select
  to anon, authenticated
  using (true);

create policy mozos_admin_write
  on public.mozos
  for all
  to anon, authenticated
  using (public.noctua_request_role() in ('admin'))
  with check (public.noctua_request_role() in ('admin'));

-- Insert initial default mozos
insert into public.mozos (nombre, apellido, zona, posicion_ciclo, activo, creado_en) values
  ('Juan', 'Pérez', 'Zona Terraza', 0, true, now()),
  ('María', 'García', 'Zona Principal', 1, true, now()),
  ('Carlos', 'López', 'Zona Cava', 2, true, now()),
  ('Ana', 'Martínez', 'Zona Privada', 3, true, now()),
  ('Pedro', 'Rodríguez', 'Zona Terraza', 4, true, now()),
  ('Lucía', 'Sánchez', 'Zona Principal', 5, true, now()),
  ('Diego', 'González', 'Zona Cava', 6, true, now()),
  ('Sofía', 'Ramírez', 'Zona Privada', 7, true, now()),
  ('Mateo', 'Torres', 'Zona Terraza', 8, true, now()),
  ('Valentina', 'Flores', 'Zona Principal', 9, true, now()),
  ('Joaquín', 'Vázquez', 'Zona Cava', 10, true, now()),
  ('Camila', 'Cruz', 'Zona Privada', 11, true, now())
on conflict (id) do nothing;
