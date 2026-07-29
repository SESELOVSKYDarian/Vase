
"use client";

import { create } from "zustand";
import type { Mozo, NombreZona, NombreTurno, AsignacionTurno } from "@/types/mozos";
import { obtenerMozos, crearMozo, actualizarMozo, eliminarMozo, suscribirCambiosMozos } from "@/services/mozosService";
import type { RealtimeChannel } from "@supabase/supabase-js";

const OVERRIDES_STORAGE_KEY = "noctua-mozo-overrides";

const loadOverridesFromStorage = <T>(defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
};

const saveOverridesToStorage = <T>(data: T) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(data));
};

type ZonasCubiertas = Record<NombreZona, string | null>;

interface DailyOverride {
  fecha: string;
  turnos: Record<NombreTurno, ZonasCubiertas>;
}

interface MozosState {
  mozos: Mozo[];
  dailyOverrides: DailyOverride[];
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
  channel: RealtimeChannel | null;

  fetchMozos: () => Promise<void>;
  suscribirCambiosMozos: () => void;
  desuscribirCambiosMozos: () => void;
  agregarMozo: (data: Omit<Mozo, "id" | "creadoEn">) => Promise<void>;
  editarMozo: (id: string, data: Partial<Mozo>) => Promise<void>;
  eliminarMozo: (id: string) => Promise<void>;
  setDailyOverride: (fecha: string, turno: NombreTurno, zona: NombreZona, mozoId: string | null) => void;
  clearDailyOverrides: (fecha?: string) => void;
  getMozoAsignadoPorZona: (zona: NombreZona) => Mozo | null;
  getAsignacionesTurnoActual: () => AsignacionTurno[];
  getTurnoActual: () => NombreTurno | null;
  getDailyOverride: (fecha: string, turno: NombreTurno, zona: NombreZona) => string | null;
}

const getTurnoActual = (): NombreTurno | null => {
  const now = new Date();
  const hora = now.getHours();
  if (hora >= 8 && hora < 13) return "Turno Mañana";
  if (hora >= 13 && hora < 19) return "Turno Tarde";
  if (hora >= 19 && hora < 22) return "Turno Vespertino";
  return null;
};

const getTurnoIndex = (turno: NombreTurno): number => {
  if (turno === "Turno Mañana") return 0;
  if (turno === "Turno Tarde") return 1;
  return 2;
};

const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const ZONAS: NombreZona[] = ["Zona Terraza", "Zona Principal", "Zona Cava", "Zona Privada"];

export const useMozosStore = create<MozosState>((set, get) => {
  const initialOverrides = loadOverridesFromStorage([]);

  const save = () => {
    const state = get();
    saveOverridesToStorage(state.dailyOverrides);
  };

  return {
    mozos: [],
    dailyOverrides: initialOverrides,
    lastUpdated: Date.now(),
    isLoading: false,
    error: null,
    channel: null,

    fetchMozos: async () => {
      set({ isLoading: true, error: null });
      try {
        const mozos = await obtenerMozos();
        set({ mozos, isLoading: false, lastUpdated: Date.now() });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Error desconocido', isLoading: false });
      }
    },

    suscribirCambiosMozos: () => {
      const currentChannel = get().channel;
      if (currentChannel) return;

      const channel = suscribirCambiosMozos(
        (mozo) => {
          set((state) => ({
            mozos: [...state.mozos, mozo].sort((a, b) => a.posicionCiclo - b.posicionCiclo),
            lastUpdated: Date.now()
          }));
        },
        (mozo) => {
          set((state) => ({
            mozos: state.mozos.map((m) => m.id === mozo.id ? mozo : m).sort((a, b) => a.posicionCiclo - b.posicionCiclo),
            lastUpdated: Date.now()
          }));
        },
        (id) => {
          set((state) => ({
            mozos: state.mozos.filter((m) => m.id !== id),
            lastUpdated: Date.now()
          }));
        }
      );
      set({ channel });
    },

    desuscribirCambiosMozos: () => {
      const channel = get().channel;
      if (channel) {
        channel.unsubscribe();
        set({ channel: null });
      }
    },

    agregarMozo: async (data) => {
      set({ isLoading: true, error: null });
      try {
        await crearMozo(data);
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Error desconocido', isLoading: false });
      }
    },

    editarMozo: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
        await actualizarMozo(id, data);
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Error desconocido', isLoading: false });
      }
    },

    eliminarMozo: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await eliminarMozo(id);
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Error desconocido', isLoading: false });
      }
    },

    getDailyOverride: (fecha, turno, zona) => {
      const override = get().dailyOverrides.find((o) => o.fecha === fecha);
      if (!override) return null;
      return override.turnos[turno]?.[zona] || null;
    },

    setDailyOverride: (fecha, turno, zona, mozoId) => {
      set((state) => {
        let override = state.dailyOverrides.find((o) => o.fecha === fecha);
        if (!override) {
          const initialTurnos: Record<NombreTurno, ZonasCubiertas> = {
            "Turno Mañana": { "Zona Terraza": null, "Zona Principal": null, "Zona Cava": null, "Zona Privada": null },
            "Turno Tarde": { "Zona Terraza": null, "Zona Principal": null, "Zona Cava": null, "Zona Privada": null },
            "Turno Vespertino": { "Zona Terraza": null, "Zona Principal": null, "Zona Cava": null, "Zona Privada": null }
          };
          override = { fecha, turnos: initialTurnos };
        }
        override.turnos[turno][zona] = mozoId;
        const existingIndex = state.dailyOverrides.findIndex((o) => o.fecha === fecha);
        const newOverrides = [...state.dailyOverrides];
        if (existingIndex >= 0) {
          newOverrides[existingIndex] = override;
        } else {
          newOverrides.push(override);
        }
        return { dailyOverrides: newOverrides, lastUpdated: Date.now() };
      });
      save();
    },

    clearDailyOverrides: (fecha) => {
      const fechaToClear = fecha || getTodayString();
      set((state) => ({
        dailyOverrides: state.dailyOverrides.filter((o) => o.fecha !== fechaToClear),
        lastUpdated: Date.now()
      }));
      save();
    },

    getTurnoActual,

    getAsignacionesTurnoActual: () => {
      const turnoActual = getTurnoActual();
      if (!turnoActual) return [];
      const turnoIndex = getTurnoIndex(turnoActual);
      const today = getTodayString();
      const { mozos, dailyOverrides } = get();
      const asignaciones: AsignacionTurno[] = [];
      ZONAS.forEach((zona, index) => {
        const override = dailyOverrides.find((o) => o.fecha === today);
        if (override && override.turnos[turnoActual]?.[zona]) {
          const overrideMozoId = override.turnos[turnoActual][zona];
          const overrideMozo = mozos.find((m) => m.id === overrideMozoId);
          if (overrideMozo) {
            asignaciones.push({ turno: turnoActual, zona, mozo: overrideMozo });
            return;
          }
        }
        const posicionCiclo = turnoIndex * 4 + index;
        const mozo = mozos.find(m => m.posicionCiclo === posicionCiclo && m.activo);
        if (mozo) {
          asignaciones.push({ turno: turnoActual, zona, mozo });
        }
      });
      return asignaciones;
    },

    getMozoAsignadoPorZona: (zona) => {
      const asignaciones = get().getAsignacionesTurnoActual();
      const asignacion = asignaciones.find(a => a.zona === zona);
      return asignacion?.mozo || null;
    }
  };
});
