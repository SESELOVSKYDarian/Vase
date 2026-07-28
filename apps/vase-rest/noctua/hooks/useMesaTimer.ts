// Tick compartido de "ahora" para todos los timers de mesa.
// Un único setInterval a 60s alimenta a todas las MesaCard vía useSyncExternalStore,
// en lugar de un intervalo por tarjeta (con ~20+ mesas eso sería un desperdicio).
'use client';

import { useSyncExternalStore } from 'react';
import { elapsedMinutes } from '@/hooks/lib/utils';
import { MESA_ELAPSED_ALERT_MINUTES, MESA_ELAPSED_ALERT_ENABLED } from '@/hooks/lib/constants';

const TICK_MS = 60_000; // granularidad por minuto: suficiente para el piso del salón

let now = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function ensureInterval() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    now = Date.now();
    listeners.forEach((l) => l());
  }, TICK_MS);
}

function subscribe(listener: () => void): () => void {
  ensureInterval();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Sin oyentes → liberar el intervalo compartido
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/** Valor "ahora" (ms) que se actualiza cada 60s, compartido por todas las mesas. */
export function useNowTick(): number {
  return useSyncExternalStore(subscribe, () => now, () => now);
}

/** Formatea el tiempo transcurrido de forma escaneable: "1h 05m", "23m", "0m". */
export function formatElapsedShort(from: Date, nowMs: number): string {
  const totalMin = Math.max(0, Math.floor((nowMs - from.getTime()) / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m`;
}

/** true si la mesa lleva abierta más del umbral configurado (flag visual sutil). */
export function isElapsedAlert(from: Date): boolean {
  if (!MESA_ELAPSED_ALERT_ENABLED) return false;
  return elapsedMinutes(from) >= MESA_ELAPSED_ALERT_MINUTES;
}
