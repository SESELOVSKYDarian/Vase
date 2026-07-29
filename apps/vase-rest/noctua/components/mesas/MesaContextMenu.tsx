// Menú contextual flotante que aparece tras un long press sobre una mesa.
'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TEXTO_ESTADO_MESA } from '@/hooks/lib/constants';
import type { Mesa, EstadoMesa, ContextMenuAction } from '@/types/mesa';

const ESTADOS_CAMBIO: EstadoMesa[] = ['libre', 'ocupada', 'esperando_pedido', 'esperando_pago', 'problema'];

const COLOR_ESTADO: Record<EstadoMesa, string> = {
  libre:            'bg-gray-500',
  ocupada:          'bg-orange-500',
  esperando_pedido: 'bg-yellow-400',
  pedido_listo:     'bg-green-500',
  esperando_pago:   'bg-blue-500',
  problema:         'bg-red-500',
  para_cobrar:      'bg-amber-600',
};

const MENU_W = 240;
const MENU_H = 360; // estimado

interface MesaContextMenuProps {
  mesa:       Mesa;
  triggerX:   number;
  triggerY:   number;
  onAction:   (action: ContextMenuAction, mesa: Mesa, nuevoEstado?: EstadoMesa) => void;
  onClose:    () => void;
}

export const MesaContextMenu = memo(function MesaContextMenu({
  mesa,
  triggerX,
  triggerY,
  onAction,
  onClose,
}: MesaContextMenuProps) {
  const [showEstados, setShowEstados] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calcular posición segura para no salir del viewport
  const safeX = triggerX + MENU_W > window.innerWidth  ? triggerX - MENU_W : triggerX;
  const safeY = triggerY + MENU_H > window.innerHeight ? triggerY - MENU_H : triggerY;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  const isMerged = (mesa.mesasUnidas?.length ?? 0) > 0;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.88, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="fixed z-[9998] w-60 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        left:             safeX,
        top:              safeY,
        background:       'rgba(10,10,10,0.92)',
        backdropFilter:   'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border:           '1px solid rgba(217,119,6,0.25)',
      }}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-white font-bold text-sm tracking-wide">
          Mesa {mesa.numero}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${COLOR_ESTADO[mesa.estado]}`}
          />
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-0.5"
            aria-label="Cerrar menú"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Sub-menú de estado */}
      <AnimatePresence>
        {showEstados && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-white/5"
          >
            <div className="px-3 py-2 flex flex-col gap-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">
                Cambiar a
              </p>
              {ESTADOS_CAMBIO.map((estado) => (
                <button
                  key={estado}
                  onClick={() => {
                    onAction('cambiar_estado', mesa, estado);
                    setShowEstados(false);
                  }}
                  className={`flex items-center gap-2 text-sm text-zinc-200 hover:text-white px-2 py-2 rounded-lg hover:bg-white/5 transition-colors min-h-[40px] ${
                    mesa.estado === estado ? 'opacity-50 cursor-default' : ''
                  }`}
                  disabled={mesa.estado === estado}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_ESTADO[estado]}`} />
                  {TEXTO_ESTADO_MESA[estado]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acciones del menú */}
      <div className="flex flex-col py-2">
        <MenuItem
          label={mesa.estado === 'libre' ? 'Agregar pedido' : 'Ver pedido'}
          icon="📋"
          onClick={() => onAction('abrir_pedido', mesa)}
        />
        {mesa.estado !== 'libre' && (
          <MenuItem
            label="Editar comensales"
            icon="👥"
            onClick={() => onAction('editar_comensales', mesa)}
          />
        )}
        <MenuItem
          label="Cambiar estado"
          icon="🔄"
          onClick={() => setShowEstados((v) => !v)}
          active={showEstados}
        />
        <MenuItem
          label="Llamar al mozo"
          icon="🔔"
          onClick={() => onAction('llamar_mozo', mesa)}
        />
        <MenuItem
          label="Marcar para cobrar"
          icon="💰"
          onClick={() => onAction('marcar_cobrar', mesa)}
          highlight
        />
        {isMerged ? (
          <MenuItem
            label="Separar mesas"
            icon="✂️"
            onClick={() => onAction('separar_mesa', mesa)}
            danger
          />
        ) : (
          <MenuItem
            label="Unir con otra mesa"
            icon="🔗"
            onClick={() => onAction('unir_mesa', mesa)}
          />
        )}

        {/* Divisor */}
        <div className="h-px bg-white/5 mx-3 my-1" />

        <MenuItem
          label="Cancelar"
          icon="✕"
          onClick={() => { onAction('cancelar', mesa); onClose(); }}
          muted
        />
      </div>
    </motion.div>
  );
});

// Sub-componente de ítem de menú
interface MenuItemProps {
  label:     string;
  icon:      string;
  onClick:   () => void;
  highlight?: boolean;
  danger?:   boolean;
  muted?:    boolean;
  active?:   boolean;
}

function MenuItem({ label, icon, onClick, highlight, danger, muted, active }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium min-h-[52px] w-full text-left transition-colors
        ${highlight ? 'text-amber-400 hover:bg-amber-500/10' : ''}
        ${danger    ? 'text-red-400 hover:bg-red-500/10'    : ''}
        ${muted     ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5' : ''}
        ${!highlight && !danger && !muted ? 'text-zinc-200 hover:text-white hover:bg-white/5' : ''}
        ${active    ? 'bg-white/5' : ''}
      `}
    >
      <span className="text-base leading-none w-5 text-center flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}
