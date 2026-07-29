'use client';

import { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Archive, CheckCircle, ChefHat, Play, Trash2 } from 'lucide-react';
import { usePedidosStore } from '@/store/pedidosStore';
import { useMesasStore } from '@/store/mesasStore';
import { useSuperAdmStore } from '@/store/superadmStore';
import { cocinaService } from '@/services/cocinaService';
import { KDS_TIMER_GREEN_MINUTES, KDS_TIMER_YELLOW_MINUTES } from '@/hooks/lib/constants';
import { elapsedMinutes, formatElapsed, cn } from '@/hooks/lib/utils';
import type { Pedido } from '@/types/pedido';

// ── KDS Timer ──────────────────────────────────────────────────────────────────

function KDSTimer({ creadoEn }: { creadoEn: Date }) {
  const [elapsed, setElapsed] = useState('');
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const tick = () => {
      setElapsed(formatElapsed(creadoEn));
      setMinutes(elapsedMinutes(creadoEn));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [creadoEn]);

  const colorClass =
    minutes >= KDS_TIMER_YELLOW_MINUTES
      ? 'text-red-400'
      : minutes >= KDS_TIMER_GREEN_MINUTES
      ? 'text-yellow-400'
      : 'text-green-400';

  return (
    <div className={cn('flex items-center gap-1.5 font-mono font-bold text-sm', colorClass,
      minutes >= KDS_TIMER_YELLOW_MINUTES && 'animate-pulse-red'
    )}>
      <Clock size={13} />
      {elapsed}
    </div>
  );
}

// ── KDS Card ──────────────────────────────────────────────────────────────────

const ICONOS_ESTADO: Record<string, any> = {
  pendiente: Play,
  preparando: ChefHat,
  listo: CheckCircle,
  entregado: Archive,
};

const PedidoKDSCard = memo(function PedidoKDSCard({
  pedido,
  statuses,
  mesasLabel,
  onCambiarEstado,
  onEliminar,
}: {
  pedido: Pedido;
  statuses: any[];
  mesasLabel: string;
  onCambiarEstado: (id: string, nuevoEstado: string) => void;
  onEliminar: (id: string) => void;
}) {
  const currentStatus = statuses.find(s => s.name.toLowerCase() === pedido.estado);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="bg-[#0d0d0d] border-2 rounded-xl p-4 space-y-3"
      style={{ borderColor: currentStatus?.bgColor ?? '#374151' }}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl font-black text-white leading-none">
              {mesasLabel}
            </span>
            <div className="flex items-center gap-1 text-[#676B67] text-xs mt-1">
              <Users size={11} />
              <span>{pedido.personas}</span>
            </div>
          </div>
          <p className="text-[#676B67] text-xs mt-0.5 tracking-wide">{pedido.zona}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <KDSTimer creadoEn={pedido.creadoEn} />
          <button
            onClick={() => onEliminar(pedido.id)}
            className="flex items-center gap-1 text-[#676B67] hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-400/20"
            title="Eliminar pedido"
          >
            <Trash2 size={12} />
            Eliminar
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5" role="list" aria-label="Items del pedido">
        {pedido.items.map((item, idx) => (
          <div key={`${item.productoId}-${idx}`} role="listitem" className="flex items-start gap-2">
            <span className="text-white font-bold text-base leading-tight w-6 flex-shrink-0">
              {item.cantidad}×
            </span>
            <div>
              <p className="text-[#D9D9D9] text-sm font-medium leading-tight">{item.nombre}</p>
              {item.notas && (
                <p className="text-yellow-400 text-xs mt-0.5 font-medium">
                  ⚑ {item.notas}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Select Box for Estado */}
      <div className="pt-2 border-t border-[#1a1a1a]">
        <label className="text-xs text-[#676B67] font-semibold mb-1 block uppercase tracking-widest">
          Modificar Estado
        </label>
        <select
          value={pedido.estado}
          onChange={(e) => onCambiarEstado(pedido.id, e.target.value)}
          className="w-full bg-[#111] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-white transition-colors"
        >
          {statuses.map((status) => {
            const estadoKey = status.name.toLowerCase();
            return (
              <option key={status.id} value={estadoKey}>
                {status.name}
              </option>
            );
          })}
        </select>
      </div>
    </motion.div>
  );
});

// ── KDS Column ────────────────────────────────────────────────────────────────

const KDSColumn = memo(function KDSColumn({
  status,
  allStatuses,
  pedidos,
  getMesasLabel,
  onCambiarEstado,
  onEliminar,
}: {
  status: any;
  allStatuses: any[];
  pedidos: Pedido[];
  getMesasLabel: (pedido: Pedido) => string;
  onCambiarEstado: (id: string, nuevoEstado: string) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <div className="flex flex-col bg-[#060606] border border-[#111] rounded-xl overflow-hidden">
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: status.bgColor, color: status.color }}
      >
        <span className="font-display text-xl tracking-widest font-black uppercase">
          {status.name}
        </span>
        <span className="text-sm font-black opacity-80">{pedidos.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {pedidos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-32 text-[#2a2a2a] text-sm"
            >
              Sin pedidos
            </motion.div>
          ) : (
            pedidos.map((pedido) => (
              <PedidoKDSCard
                key={pedido.id}
                pedido={pedido}
                statuses={allStatuses}
                mesasLabel={getMesasLabel(pedido)}
                onCambiarEstado={onCambiarEstado}
                onEliminar={onEliminar}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

// ── Confirm Delete Modal ───────────────────────────────────────────────────────

function ConfirmEliminarModal({
  pedidoId,
  onConfirm,
  onCancel,
}: {
  pedidoId: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-sm bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">Eliminar pedido</h2>
            <p className="text-[#676B67] text-xs mt-0.5">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-[#2a2a2a] text-[#BCB9B9] text-sm hover:bg-[#1a1a1a] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 20_000; // 20 segundos

export default function CocinaPage() {
  const pedidos = usePedidosStore((s) => s.pedidos);
  const cargarPedidosActivos = usePedidosStore((s) => s.cargarPedidosActivos);
  const eliminarPedido = usePedidosStore((s) => s.eliminarPedido);
  const mesas = useMesasStore((s) => s.mesas);
  const cargarMesas = useMesasStore((s) => s.cargarMesas);
  const { config, initializeConfig } = useSuperAdmStore();
  const [pedidoAEliminar, setPedidoAEliminar] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Carga inicial + auto-refresh cada 20 s
  useEffect(() => {
    initializeConfig();
    cargarPedidosActivos();
    cargarMesas();

    const id = setInterval(() => {
      cargarPedidosActivos();
      cargarMesas();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cargarPedidosActivos, cargarMesas, initializeConfig]);

  const handleRefreshManual = useCallback(async () => {
    setRefreshing(true);
    await cargarPedidosActivos();
    setRefreshing(false);
  }, [cargarPedidosActivos]);

  const handleCambiarEstado = useCallback(async (pedidoId: string, nuevoEstado: string) => {
    await cocinaService.cambiarEstadoLibre(pedidoId, nuevoEstado as any);
    // Refrescar pedidos (mover card de columna) y mesas (sincronizar estado)
    cargarPedidosActivos();
    cargarMesas();
  }, [cargarPedidosActivos, cargarMesas]);

  const handleEliminar = useCallback((pedidoId: string) => {
    setPedidoAEliminar(pedidoId);
  }, []);

  const confirmarEliminar = useCallback(async () => {
    if (!pedidoAEliminar) return;
    try {
      await eliminarPedido(pedidoAEliminar);
    } catch {
      // store already logs the error
    }
    setPedidoAEliminar(null);
  }, [pedidoAEliminar, eliminarPedido]);

  // Memo para que KDSColumn no rompa su cache por nueva referencia
  const sortedStatuses = useMemo(
    () => [...config.kitchenStatuses].sort((a, b) => a.order - b.order),
    [config.kitchenStatuses]
  );

  // Solo pedidos activos en la KDS (entregado/cancelado ya no llegan por la API)
  const getPedidosPorEstado = useCallback(
    (estadoName: string) => pedidos.filter((p) => p.estado === estadoName.toLowerCase()),
    [pedidos]
  );

  // Etiqueta de mesa: "3" o "3+5" si tiene mesas unidas
  const getMesasLabel = useCallback((pedido: Pedido): string => {
    const mesa = mesas.find((m) => m.id === pedido.mesaId);
    if (!mesa?.mesasUnidas || mesa.mesasUnidas.length === 0) return String(pedido.numeroMesa);
    const otrosNums = mesa.mesasUnidas
      .map((id) => mesas.find((m) => m.id === id)?.numero ?? 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    return [mesa.numero, ...otrosNums].join('+');
  }, [mesas]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-3">
      {/* Header con refresh */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-[#676B67] text-xs">
          <span className="font-mono text-[10px] uppercase tracking-widest">Cocina · KDS</span>
          <span className="text-zinc-700">·</span>
          <span className="font-mono text-[10px] text-zinc-700">
            {pedidos.length} {pedidos.length === 1 ? 'pedido activo' : 'pedidos activos'}
          </span>
        </div>
        <button
          onClick={handleRefreshManual}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-all disabled:opacity-40"
        >
          <Clock size={11} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 overflow-hidden">
        {sortedStatuses.map((status) => (
          <KDSColumn
            key={status.id}
            status={status}
            allStatuses={sortedStatuses}
            pedidos={getPedidosPorEstado(status.name)}
            getMesasLabel={getMesasLabel}
            onCambiarEstado={handleCambiarEstado}
            onEliminar={handleEliminar}
          />
        ))}
      </div>

      <AnimatePresence>
        {pedidoAEliminar && (
          <ConfirmEliminarModal
            pedidoId={pedidoAEliminar}
            onConfirm={confirmarEliminar}
            onCancel={() => setPedidoAEliminar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
