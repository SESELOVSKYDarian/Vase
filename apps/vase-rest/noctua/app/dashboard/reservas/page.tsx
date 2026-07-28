'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  obtenerReservas,
  cancelarReserva,
  completarReserva,
  type Reserva,
} from '@/hooks/lib/api/reservasApi';
import { cn } from '@/hooks/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function formatHora(hora: string) {
  return hora.slice(0, 5);
}

function estadoLabel(estado: Reserva['estado']) {
  if (estado === 'activa') return 'Activa';
  if (estado === 'completada') return 'Completada';
  return 'Cancelada';
}

function estadoClasses(estado: Reserva['estado']) {
  if (estado === 'activa')
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (estado === 'completada')
    return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}

// ─── ReservaCard ──────────────────────────────────────────────────────────────

function ReservaCard({
  reserva,
  onCancelar,
  onCompletar,
}: {
  reserva: Reserva;
  onCancelar: (id: string) => void;
  onCompletar: (id: string) => void;
}) {
  const [expandida, setExpandida] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpandida((v) => !v)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#0f0f0f] transition-colors"
        aria-expanded={expandida}
        aria-label={`Ver detalles de reserva ${reserva.codigo_reserva}`}
      >
        {/* Código */}
        <div className="flex-shrink-0">
          <p className="text-[10px] text-[#676B67] tracking-widest uppercase mb-0.5">
            Código
          </p>
          <p className="text-white font-mono text-xs font-bold">
            {reserva.codigo_reserva || '—'}
          </p>
        </div>

        {/* Nombre */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {reserva.nombre_cliente}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-[#676B67] text-xs">
              <Calendar size={10} />
              {formatFecha(reserva.fecha)}
            </span>
            <span className="flex items-center gap-1 text-[#676B67] text-xs">
              <Clock size={10} />
              {formatHora(reserva.hora)}
            </span>
            <span className="flex items-center gap-1 text-[#676B67] text-xs">
              <Users size={10} />
              {reserva.cantidad_personas} pers.
            </span>
          </div>
        </div>

        {/* Estado */}
        <span
          className={cn(
            'text-xs font-semibold px-2 py-1 rounded-lg border flex-shrink-0',
            estadoClasses(reserva.estado)
          )}
        >
          {estadoLabel(reserva.estado)}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={14}
          className={cn(
            'text-[#676B67] transition-transform flex-shrink-0',
            expandida && 'rotate-180'
          )}
        />
      </button>

      {/* Detalle expandido */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-3">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {reserva.email_cliente && (
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-[#676B67] flex-shrink-0" />
                    <span className="text-xs text-[#BCB9B9] truncate">
                      {reserva.email_cliente}
                    </span>
                  </div>
                )}
                {reserva.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-[#676B67] flex-shrink-0" />
                    <span className="text-xs text-[#BCB9B9]">
                      {reserva.telefono}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-[#676B67] flex-shrink-0" />
                  <span className="text-xs text-[#676B67]">
                    Creada el{' '}
                    {new Date(reserva.creada_en).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              {reserva.estado === 'activa' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onCompletar(reserva.id)}
                    aria-label={`Completar reserva ${reserva.codigo_reserva}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                  >
                    <CheckCircle size={12} />
                    Completar
                  </button>
                  <button
                    onClick={() => onCancelar(reserva.id)}
                    aria-label={`Cancelar reserva ${reserva.codigo_reserva}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle size={12} />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FiltroEstado = 'todas' | 'activa' | 'completada' | 'cancelada';

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await obtenerReservas();
      setReservas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar reservas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCancelar = async (id: string) => {
    try {
      await cancelarReserva(id);
      setReservas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'cancelada' } : r))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompletar = async (id: string) => {
    try {
      await completarReserva(id);
      setReservas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'completada' } : r))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const reservasFiltradas = reservas.filter((r) => {
    const matchEstado = filtro === 'todas' || r.estado === filtro;
    const query = busqueda.toLowerCase();
    const matchBusqueda =
      !query ||
      r.nombre_cliente.toLowerCase().includes(query) ||
      r.codigo_reserva.toLowerCase().includes(query) ||
      (r.email_cliente?.toLowerCase().includes(query) ?? false) ||
      (r.telefono?.includes(query) ?? false);
    return matchEstado && matchBusqueda;
  });

  // Stats
  const activas = reservas.filter((r) => r.estado === 'activa').length;
  const completadas = reservas.filter((r) => r.estado === 'completada').length;
  const canceladas = reservas.filter((r) => r.estado === 'cancelada').length;

  const FILTROS: { label: string; value: FiltroEstado; count: number }[] = [
    { label: 'Todas', value: 'todas', count: reservas.length },
    { label: 'Activas', value: 'activa', count: activas },
    { label: 'Completadas', value: 'completada', count: completadas },
    { label: 'Canceladas', value: 'cancelada', count: canceladas },
  ];

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-widest uppercase">
            Reservas
          </h1>
          <p className="text-[#676B67] text-xs mt-0.5">
            {reservas.length} reservas en total
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={isLoading}
          aria-label="Recargar reservas"
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl text-sm text-[#BCB9B9] hover:border-[#2a2a2a] hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {[
          { label: 'Activas', value: activas, color: 'text-emerald-400' },
          { label: 'Completadas', value: completadas, color: 'text-sky-400' },
          { label: 'Canceladas', value: canceladas, color: 'text-red-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4"
          >
            <p className="text-xs text-[#676B67] tracking-widest uppercase mb-1">
              {s.label}
            </p>
            <p className={cn('text-3xl font-black font-mono', s.color)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              aria-pressed={filtro === f.value}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all',
                filtro === f.value
                  ? 'bg-white text-black'
                  : 'text-[#676B67] hover:text-white'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'text-[10px] font-mono',
                  filtro === f.value ? 'text-black/60' : 'text-[#444]'
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#676B67]"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar reservas"
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#2a2a2a] transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <RefreshCw size={24} className="text-[#2a2a2a] animate-spin" />
            <p className="text-[#676B67] text-sm">Cargando reservas…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <XCircle size={28} className="text-red-500/60" />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={cargar}
              className="text-xs text-[#676B67] underline hover:text-white"
            >
              Reintentar
            </button>
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Calendar size={28} className="text-[#2a2a2a]" />
            <p className="text-[#3a3a3a] text-sm">No hay reservas</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {reservasFiltradas.map((r) => (
              <ReservaCard
                key={r.id}
                reserva={r}
                onCancelar={handleCancelar}
                onCompletar={handleCompletar}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
