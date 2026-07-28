'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, Scissors, X, ChevronUp, ChevronDown,
  ShoppingBag, DollarSign, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useMesasStore } from '@/store/mesasStore';
import { usePedidosStore } from '@/store/pedidosStore';
import { setComensales } from '@/services/comensalesService';
import {
  COLORES_ESTADO_MESA, TEXTO_ESTADO_MESA,
  COMENSALES_MIN, COMENSALES_MAX_ABSOLUTO,
} from '@/hooks/lib/constants';
import { formatElapsed, formatARS } from '@/hooks/lib/utils';
import { toast } from '@/components/ui/Toast';
import type { Mesa, EstadoMesa } from '@/types/mesa';

interface MesaModalProps {
  mesa: Mesa | null;
  isOpen: boolean;
  onClose: () => void;
}

const ESTADOS_RAPIDOS: EstadoMesa[] = [
  'libre', 'ocupada', 'esperando_pedido', 'pedido_listo',
  'esperando_pago', 'para_cobrar', 'problema',
];

const COLOR_HEX: Record<string, string> = {
  gray:   '#6b7280',
  orange: '#f97316',
  yellow: '#facc15',
  green:  '#22c55e',
  blue:   '#3b82f6',
  red:    '#ef4444',
  amber:  '#d97706',
};

function dotColor(tailwind: string) {
  const k = Object.keys(COLOR_HEX).find((c) => tailwind.includes(c));
  return COLOR_HEX[k ?? ''] ?? '#6b7280';
}

export function MesaModal({ mesa, isOpen, onClose }: MesaModalProps) {
  const router = useRouter();
  const cambiarEstadoMesa = useMesasStore((s) => s.cambiarEstadoMesa);
  const setTimerInicio    = useMesasStore((s) => s.setTimerInicio);
  const dividirMesas      = useMesasStore((s) => s.dividirMesas);
  const getPedidoPorMesa  = usePedidosStore((s) => s.getPedidoPorMesa);
  const iniciarPedido     = usePedidosStore((s) => s.iniciarPedido);

  const [elapsed, setElapsed]     = useState('');
  const [personas, setPersonas]   = useState(2);
  const [changingEstado, setChangingEstado] = useState(false);

  // Default de comensales = capacidad de la mesa (o el valor ya registrado)
  useEffect(() => {
    setPersonas(mesa?.personas ?? mesa?.capacidad ?? COMENSALES_MIN);
  }, [mesa]);

  // Timer live
  useEffect(() => {
    if (!mesa?.timerInicio) { setElapsed(''); return; }
    const tick = () => setElapsed(formatElapsed(mesa.timerInicio!));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mesa?.timerInicio]);

  const handleEstadoChange = useCallback(async (estado: EstadoMesa) => {
    if (!mesa || changingEstado) return;
    setChangingEstado(true);
    try {
      await cambiarEstadoMesa(mesa.id, estado);
      toast.success(`Mesa ${mesa.numero}`, TEXTO_ESTADO_MESA[estado]);
    } catch {
      toast.error('Error', 'No se pudo cambiar el estado');
    } finally {
      setChangingEstado(false);
    }
  }, [mesa, cambiarEstadoMesa, changingEstado]);

  const handlePersonasChange = (delta: number) => {
    if (!mesa) return;
    // Se permite superar la capacidad (sillas extra) con aviso, no bloqueo
    const val = Math.max(COMENSALES_MIN, Math.min(COMENSALES_MAX_ABSOLUTO, personas + delta));
    setPersonas(val);
    // Persiste: store + backend si ya existe un pedido para la mesa
    setComensales(mesa.id, val).catch(() =>
      toast.error('Error', 'No se pudieron actualizar los comensales')
    );
  };

  const handleAjustarTimer = (minutos: number) => {
    if (!mesa) return;
    const base = mesa.timerInicio ?? new Date();
    const nueva = new Date(base.getTime() - minutos * 60 * 1000);
    setTimerInicio(mesa.id, nueva);
  };

  const handleVerPedido = () => {
    if (!mesa) return;
    // Asegura que el pedido arranque con los comensales elegidos en el modal
    setComensales(mesa.id, personas).catch(() => {});
    iniciarPedido(mesa.id, mesa.numero, mesa.zona, personas);
    // mesaId explícito en la URL: la pantalla de pedido nunca lo infiere
    router.push(`/dashboard/pedido?mesa=${mesa.id}`);
    onClose();
  };

  if (!mesa) return null;

  const pedido = getPedidoPorMesa(mesa.id);
  const stateColor = dotColor(COLORES_ESTADO_MESA[mesa.estado]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg"
      title={`Mesa ${mesa.numero}`}
    >
      <div className="space-y-5">

        {/* Header — zona + estado actual */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">{mesa.zona}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: stateColor }}
              />
              <span className="text-white font-semibold text-sm">
                {TEXTO_ESTADO_MESA[mesa.estado]}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-xs">Capacidad</p>
            <p className="text-white font-bold">{mesa.capacidad} personas</p>
          </div>
        </div>

        {/* Cambiar estado */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 tracking-widest uppercase mb-2">
            Cambiar estado
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS_RAPIDOS.map((estado) => {
              const active = mesa.estado === estado;
              const color  = dotColor(COLORES_ESTADO_MESA[estado]);
              return (
                <button
                  key={estado}
                  onClick={() => handleEstadoChange(estado)}
                  disabled={changingEstado}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${active
                      ? 'border-white/30 text-white bg-white/10'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 bg-transparent'
                    } disabled:opacity-40`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  {TEXTO_ESTADO_MESA[estado]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Personas + Timer */}
        <div className="grid grid-cols-2 gap-4">
          {/* Personas */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 tracking-widest uppercase mb-2">
              Comensales
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePersonasChange(-1)}
                disabled={personas <= COMENSALES_MIN}
                className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors font-bold text-lg leading-none flex items-center justify-center disabled:opacity-30"
              >−</button>
              <span className="text-white font-bold text-xl w-8 text-center">{personas}</span>
              <button
                onClick={() => handlePersonasChange(1)}
                className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors font-bold text-lg leading-none flex items-center justify-center"
              >+</button>
              <Users size={14} className="text-zinc-600 ml-1" />
            </div>
            {/* Aviso al superar la capacidad física — no bloquea */}
            {personas > mesa.capacidad && (
              <p className="text-amber-400 text-[11px] mt-1.5 leading-tight">
                Supera la capacidad ({mesa.capacidad}). Confirmá que hay sillas extra.
              </p>
            )}
          </div>

          {/* Timer */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 tracking-widest uppercase mb-2">
              Tiempo en mesa
            </p>
            {mesa.timerInicio ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-zinc-500" />
                  <span className="font-mono font-bold text-white text-lg">{elapsed}</span>
                </div>
                <div className="flex gap-1">
                  {[-30, -15, -5, 5, 15].map((min) => (
                    <button
                      key={min}
                      onClick={() => handleAjustarTimer(min)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-all font-mono"
                    >
                      {min > 0 ? `+${min}` : min}m
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleAjustarTimer(0)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors border border-dashed border-zinc-800 px-3 py-1.5 rounded-lg"
              >
                + Iniciar timer
              </button>
            )}
          </div>
        </div>

        {/* Pedido activo */}
        {pedido && pedido.items.length > 0 && (
          <div className="border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500 tracking-widest uppercase">
                Pedido activo
              </p>
              <span className="text-xs text-zinc-600 font-mono">{pedido.items.length} ítems</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pedido.items.map((item) => (
                <div key={item.productoId} className="flex justify-between text-sm">
                  <span className="text-zinc-300">
                    <span className="text-zinc-500">{item.cantidad}×</span> {item.nombre}
                  </span>
                  <span className="text-white font-mono text-xs">{formatARS(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Total</span>
              <span className="text-white font-bold font-mono">{formatARS(pedido.total)}</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-900">
          <Button
            variant="primary"
            size="sm"
            onClick={handleVerPedido}
            aria-label={pedido ? 'Ver pedido activo' : 'Agregar pedido a la mesa'}
          >
            <ShoppingBag size={13} />
            {pedido ? 'Ver pedido' : 'Agregar pedido'}
          </Button>

          {mesa.estado !== 'libre' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleEstadoChange('para_cobrar')}
              disabled={changingEstado}
              aria-label="Marcar para cobrar"
            >
              <DollarSign size={13} />
              Para cobrar
            </Button>
          )}

          {mesa.estado !== 'libre' && (
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await handleEstadoChange('libre');
                onClose();
              }}
              disabled={changingEstado}
              aria-label="Liberar mesa"
            >
              <CheckCircle2 size={13} />
              Liberar
            </Button>
          )}

          {mesa.mesasUnidas && mesa.mesasUnidas.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dividirMesas(mesa.id)}
              aria-label="Dividir mesas unidas"
            >
              <Scissors size={13} />
              Dividir
            </Button>
          )}
        </div>

      </div>
    </Modal>
  );
}
