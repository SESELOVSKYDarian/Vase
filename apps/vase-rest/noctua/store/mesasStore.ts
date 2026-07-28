"use client";

import { create } from "zustand";
import type { Mesa, EstadoMesa } from "@/types/mesa";
import { supabase } from "@/hooks/lib/supabaseClient";
import {
  obtenerMesas,
  crearMesa,
  actualizarMesa,
  eliminarMesa,
  actualizarEstadoMesa,
} from "@/hooks/lib/api/mesasApi";

const ESTADOS_ACTIVOS: EstadoMesa[] = [
  'ocupada', 'esperando_pedido', 'pedido_listo', 'esperando_pago', 'para_cobrar',
];

interface MesasState {
  mesas: Mesa[];
  mesaSeleccionada: string | null;
  mesasSeleccionadas: string[];
  isLoading: boolean;
  error: string | null;

  cargarMesas: () => Promise<void>;
  crearMesaDesdePanel: (data: {
    numero: number;
    capacidad: number;
    ubicacion: string;
  }) => Promise<void>;
  eliminarMesaDesdePanel: (id: string) => Promise<void>;

  seleccionarMesa: (id: string | null) => void;
  toggleSeleccionMesa: (id: string) => void;
  limpiarSeleccion: () => void;

  setEstadoMesa: (id: string, estado: EstadoMesa) => void;
  setPersonasMesa: (id: string, personas: number) => void;
  setTimerInicio: (id: string, fecha: Date) => void;

  abrirMesa: (id: string, personas: number) => void;
  cerrarMesa: (id: string) => void;
  cambiarEstadoMesa: (id: string, estado: EstadoMesa) => Promise<void>;

  moverMesa: (id: string, posicion: { x: number; y: number }) => Promise<void>;

  unirMesas: (ids: string[]) => void;
  dividirMesas: (id: string) => void;

  asignarPedido: (mesaId: string, pedidoId: string) => void;

  suscribirCambiosMesas: () => () => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const useMesasStore = create<MesasState>((set) => ({
  mesas: [],
  mesaSeleccionada: null,
  mesasSeleccionadas: [],
  isLoading: false,
  error: null,

  cargarMesas: async () => {
    try {
      set({ isLoading: true, error: null });

      const mesas = await obtenerMesas();

      set({ mesas });
    } catch (error) {
      set({
        error: getErrorMessage(
          error,
          "No se pudieron cargar las mesas desde el backend"
        ),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  crearMesaDesdePanel: async (data) => {
    try {
      set({ isLoading: true, error: null });

      await crearMesa(data);

      const mesas = await obtenerMesas();

      set({ mesas });
    } catch (error) {
      set({
        error: getErrorMessage(error, "No se pudo crear la mesa"),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  eliminarMesaDesdePanel: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await eliminarMesa(id);

      const mesas = await obtenerMesas();

      set({
        mesas,
        mesaSeleccionada: null,
        mesasSeleccionadas: [],
      });
    } catch (error) {
      set({
        error: getErrorMessage(error, "No se pudo eliminar la mesa"),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  seleccionarMesa: (id) =>
    set({
      mesaSeleccionada: id,
      mesasSeleccionadas: id ? [id] : [],
    }),

  toggleSeleccionMesa: (id) =>
    set((state) => ({
      mesasSeleccionadas: state.mesasSeleccionadas.includes(id)
        ? state.mesasSeleccionadas.filter((m) => m !== id)
        : [...state.mesasSeleccionadas, id],
    })),

  limpiarSeleccion: () =>
    set({
      mesaSeleccionada: null,
      mesasSeleccionadas: [],
    }),

  setEstadoMesa: (id, estado) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === id ? { ...m, estado } : m
      ),
    })),

  setPersonasMesa: (id, personas) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === id ? { ...m, personas } : m
      ),
    })),

  abrirMesa: (id, personas) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === id
          ? {
              ...m,
              estado: "esperando_pedido",
              personas,
              timerInicio: new Date(),
            }
          : m
      ),
    })),

  cerrarMesa: (id) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === id
          ? {
              ...m,
              estado: "libre",
              personas: undefined,
              pedidoId: undefined,
              timerInicio: undefined,
              mesasUnidas: [],
            }
          : m
      ),
    })),

  setTimerInicio: (id, fecha) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === id ? { ...m, timerInicio: fecha } : m
      ),
    })),

  cambiarEstadoMesa: async (id, estado) => {
    // Actualización optimista: estado + timerInicio según transición
    set((state) => ({
      mesas: state.mesas.map((m) => {
        if (m.id !== id) return m;
        const esActivo = ESTADOS_ACTIVOS.includes(estado);
        const eraActivo = m.timerInicio !== undefined;
        return {
          ...m,
          estado,
          // Arrancar timer al pasar a activo si no había uno
          timerInicio: esActivo
            ? (eraActivo ? m.timerInicio : new Date())
            : undefined,
        };
      }),
    }));

    try {
      await actualizarEstadoMesa(id, estado);
    } catch (error) {
      // Revertir estado local en caso de error
      const mesas = await obtenerMesas();
      set({
        mesas,
        error: getErrorMessage(error, "No se pudo cambiar el estado de la mesa"),
      });
    }
  },

  moverMesa: async (id, posicion) => {
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === id ? { ...m, posicion } : m
      ),
    }));

    try {
      await actualizarMesa(id, { posicion });
    } catch (error) {
      set({
        error: getErrorMessage(
          error,
          "No se pudo guardar la posicion de la mesa"
        ),
      });
    }
  },

  unirMesas: (ids) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        ids.includes(m.id)
          ? { ...m, mesasUnidas: ids.filter((i) => i !== m.id) }
          : m
      ),
      mesasSeleccionadas: [],
    })),

  dividirMesas: (id) =>
    set((state) => {
      const mesa = state.mesas.find((m) => m.id === id);
      const unidas = mesa?.mesasUnidas ?? [];

      return {
        mesas: state.mesas.map((m) =>
          m.id === id || unidas.includes(m.id)
            ? { ...m, mesasUnidas: [] }
            : m
        ),
      };
    }),

  asignarPedido: (mesaId, pedidoId) =>
    set((state) => ({
      mesas: state.mesas.map((m) =>
        m.id === mesaId
          ? { ...m, pedidoId, estado: "ocupada" }
          : m
      ),
    })),

  suscribirCambiosMesas: () => {
    const channel = supabase
      .channel("mesas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mesas" },
        () => {
          // Al detectar cualquier cambio, recargar las mesas
          obtenerMesas()
            .then((mesas) => {
              set((state) => ({
                // Preservar timerInicio local (no persiste en DB aún)
                mesas: mesas.map((m) => {
                  const prev = state.mesas.find((p) => p.id === m.id);
                  return { ...m, timerInicio: prev?.timerInicio };
                }),
              }));
            })
            .catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
