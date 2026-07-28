-- ─────────────────────────────────────────────────────────────────────────────
-- NOCTUA — Fase 1: Comensales por seating
-- Agrega el número de comensales (personas efectivamente sentadas) al pedido.
--
-- Se guarda en `pedidos` (no en `mesas`) porque es un dato por-seating: se
-- reinicia naturalmente cuando se abre un nuevo pedido para la mesa, mientras
-- que `mesas.capacidad` es la capacidad física estática de la mesa.
--
-- Ejecutar una sola vez en el SQL editor de Supabase (o vía migración).
-- RLS: la escritura de pedidos ocurre desde el backend Express con la
-- service-role key (bypassa RLS), por lo que no se requieren políticas nuevas.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pedidos
  add column if not exists comensales integer;

comment on column public.pedidos.comensales
  is 'Cantidad de comensales sentados en este seating (min 1). NULL = sin registrar.';
