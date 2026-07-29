'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ChefHat } from 'lucide-react';
import { supabase } from '@/hooks/lib/supabaseClient';

interface Alerta {
  id: string;
  numeroMesa: number;
  zona: string;
  ts: number;
}

// Sonido de campana usando Web Audio API (sin archivos externos)
function playBell() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Dos tonos en secuencia → efecto de campanilla
    const notas = [880, 1100, 880];
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
  } catch {
    // Web Audio no disponible — silenciar sin error
  }
}

const AUTO_DISMISS_MS = 10_000; // 10 segundos

export function PedidoListoAlerta() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  // Mapa id→estado para detectar transiciones sin depender de payload.old
  const estadosRef = useRef<Map<string, string>>(new Map());
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setAlertas((prev) => prev.filter((a) => a.id !== id));
    const t = timerRefs.current.get(id);
    if (t) { clearTimeout(t); timerRefs.current.delete(id); }
  }, []);

  const addAlerta = useCallback((alerta: Alerta) => {
    setAlertas((prev) => [...prev, alerta]);
    playBell();
    // Auto-dismiss
    const t = setTimeout(() => dismiss(alerta.id), AUTO_DISMISS_MS);
    timerRefs.current.set(alerta.id, t);
  }, [dismiss]);

  useEffect(() => {
    // Cargar estados iniciales para tener baseline antes de que lleguen eventos
    supabase
      .from('mesas')
      .select('id, estado, numero, zona')
      .then(({ data }) => {
        if (data) {
          data.forEach((m: any) => estadosRef.current.set(String(m.id), m.estado ?? 'libre'));
        }
      });

    // Suscripción propia — independiente de la del store de mesas
    const channel = supabase
      .channel('pedido-listo-notificaciones')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesas' },
        (payload) => {
          const mesa = payload.new as any;
          const mesaId = String(mesa.id);
          const estadoPrevio = estadosRef.current.get(mesaId) ?? '';

          // Detectar transición → pedido_listo
          if (mesa.estado === 'pedido_listo' && estadoPrevio !== 'pedido_listo') {
            addAlerta({
              id: `${mesaId}-${Date.now()}`,
              numeroMesa: mesa.numero,
              zona: mesa.zona ?? 'Salón',
              ts: Date.now(),
            });
          }

          estadosRef.current.set(mesaId, mesa.estado ?? 'libre');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Limpiar todos los timers pendientes
      timerRefs.current.forEach((t) => clearTimeout(t));
      timerRefs.current.clear();
    };
  }, [addAlerta]);

  return (
    <div
      className="fixed bottom-6 right-6 z-[300] flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notificaciones de pedidos listos"
    >
      <AnimatePresence mode="popLayout">
        {alertas.map((alerta) => (
          <motion.div
            key={alerta.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto relative flex items-center gap-3 bg-[#0a0a0a] border-2 border-green-500/70 rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/70 min-w-[260px] max-w-[320px] overflow-hidden"
          >
            {/* Ícono animado */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <ChefHat size={18} className="text-green-400" />
              </div>
              {/* Pulso exterior */}
              <span className="absolute inset-0 rounded-xl border border-green-500/40 animate-ping" />
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Bell size={11} className="text-green-400 flex-shrink-0" />
                <span className="text-green-400 text-[10px] font-semibold tracking-widest uppercase">
                  Pedido Listo
                </span>
              </div>
              <p className="text-white font-black text-lg leading-tight mt-0.5">
                Mesa {alerta.numeroMesa}
              </p>
              <p className="text-zinc-500 text-xs truncate">{alerta.zona}</p>
            </div>

            {/* Botón cerrar */}
            <button
              onClick={() => dismiss(alerta.id)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X size={13} />
            </button>

            {/* Barra de progreso auto-dismiss */}
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] bg-green-500/50 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
