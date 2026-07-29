// Barra fija inferior del modo selección: muestra las mesas elegidas y permite
// confirmar o cancelar la unión. Visible durante todo el modo selección.
'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link2, X, Loader2 } from 'lucide-react';

interface MesaMergeBarProps {
  selectedNums: number[];
  maxReached:   boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
  isLoading?:   boolean;
}

export const MesaMergeBar = memo(function MesaMergeBar({
  selectedNums,
  maxReached,
  onConfirm,
  onCancel,
  isLoading = false,
}: MesaMergeBarProps) {
  const count      = selectedNums.length;
  const canConfirm = count >= 2 && !isLoading;

  // Mensaje de ayuda según cantidad seleccionada
  const hint =
    count === 0 ? 'Tocá las mesas que querés unir'
    : count === 1 ? 'Seleccioná al menos 2 mesas'
    : `${count} mesas seleccionadas`;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed bottom-0 left-0 right-0 z-[9996] border-t border-amber-600/30"
      style={{
        background:           'rgba(8,8,8,0.97)',
        backdropFilter:       'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {/* Mesas seleccionadas + contador */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2 flex-wrap">
        <span className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
          {hint}
        </span>

        {count > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link2 size={14} className="text-zinc-600 flex-shrink-0" />
            {selectedNums.map((num) => (
              <div
                key={num}
                className="flex items-center gap-1 bg-amber-600/20 border border-amber-500/40 rounded-lg px-3 py-1.5"
              >
                <span className="text-white font-black text-base leading-none">{num}</span>
              </div>
            ))}
          </div>
        )}

        {maxReached && (
          <span className="text-amber-500 text-[10px] font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full ml-auto">
            Máx. 4 mesas
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl text-sm font-medium transition-colors min-h-[48px] flex-1 disabled:opacity-40"
        >
          <X size={15} />
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[48px] flex-[2]
            ${canConfirm
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
        >
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
          {isLoading ? 'Uniendo...' : 'Confirmar unión'}
        </button>
      </div>
    </motion.div>
  );
});
