'use client';

import { Headphones } from 'lucide-react';

import { HorarioSoporteCard } from '@/components/soporte/HorarioSoporteCard';
import { TicketListView } from '@/components/soporte/TicketListView';
import { useSoporte } from '@/hooks/useSoporte';
import { useAuthStore } from '@/store/authStore';

export default function SoportePage() {
  const usuario = useAuthStore(
    (state) => state.usuario
  );

  const isAdmin =
    usuario?.rol === 'admin';

  const isDeveloper =
    usuario?.rol === 'desarrollador';

  const {
    tickets,
    loading,
    error,
    submitting,
    crearTicket,
    actualizarEstado,
    eliminarTicket,
    refetch,
  } = useSoporte();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
          <Headphones
            size={20}
            className="text-zinc-400"
          />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {isDeveloper
              ? 'Tickets de soporte'
              : 'Soporte'}
          </h1>

          <p className="mt-0.5 text-sm text-zinc-500">
            {isDeveloper
              ? 'Revisá, respondé y actualizá los tickets enviados por los administradores.'
              : 'Abrí un ticket si encontrás un problema o tenés una consulta. Nuestro equipo te responderá dentro del horario de atención.'}
          </p>
        </div>
      </header>

      {/* Horario de atención */}
      <HorarioSoporteCard />

      {/* Mensaje para roles sin permiso */}
      {!isAdmin && !isDeveloper && (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-300">
            No tenés permisos para acceder al
            sistema de soporte.
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Esta sección está disponible
            solamente para administradores y
            desarrolladores.
          </p>
        </section>
      )}

      {/* Lista de tickets */}
      {(isAdmin || isDeveloper) && (
        <TicketListView
          tickets={tickets}
          loading={loading}
          error={error}
          submitting={submitting}
          isAdmin={isAdmin}
          isDeveloper={isDeveloper}
          onCrearTicket={crearTicket}
          onActualizarEstado={
            actualizarEstado
          }
          onEliminarTicket={
            eliminarTicket
          }
          onRefetch={refetch}
        />
      )}
    </div>
  );
}
