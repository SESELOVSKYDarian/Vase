// Resumen del pedido en construcción: ítems ya enviados a cocina (solo lectura)
// + ítems del borrador (editables) + total + acción "Enviar a cocina".
// Siempre visible junto al catálogo (no detrás de un "ver carrito").
'use client';

import { useState, memo } from 'react';
import { Plus, Minus, Trash2, StickyNote, Send, Loader2, ChefHat } from 'lucide-react';
import { formatARS } from '@/hooks/lib/utils';
import type { ItemPedido } from '@/types/pedido';

interface PedidoOrderSummaryProps {
  draftItems: ItemPedido[];
  sentItems:  ItemPedido[];
  draftTotal: number;
  sentTotal:  number;
  enviando:   boolean;
  onInc:      (productoId: string) => void;
  onDec:      (productoId: string) => void;
  onRemove:   (productoId: string) => void;
  onSetNotas: (productoId: string, notas: string) => void;
  onEnviar:   () => void;
}

export const PedidoOrderSummary = memo(function PedidoOrderSummary({
  draftItems,
  sentItems,
  draftTotal,
  sentTotal,
  enviando,
  onInc,
  onDec,
  onRemove,
  onSetNotas,
  onEnviar,
}: PedidoOrderSummaryProps) {
  const [editingNotas, setEditingNotas] = useState<string | null>(null);
  const vacio = draftItems.length === 0 && sentItems.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between flex-shrink-0">
        <h2 className="text-white font-bold text-sm uppercase tracking-widest">Pedido</h2>
        <span className="text-[#676b67] text-xs font-mono">
          {draftItems.length + sentItems.length} ítems
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {vacio && (
          <div className="h-full flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <ChefHat size={28} className="text-zinc-700" />
            <p className="text-[#676b67] text-sm">Agregá productos para esta mesa</p>
          </div>
        )}

        {/* Ítems ya enviados a cocina — solo lectura */}
        {sentItems.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-[10px] uppercase tracking-widest text-green-500/80 font-semibold mb-2 flex items-center gap-1.5">
              <ChefHat size={11} /> Ya en cocina
            </p>
            <div className="space-y-1.5 mb-3">
              {sentItems.map((item, idx) => (
                <div key={`sent-${item.productoId}-${idx}`} className="flex items-start justify-between gap-2 opacity-70">
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-sm truncate">
                      <span className="text-zinc-500">{item.cantidad}×</span> {item.nombre}
                    </p>
                    {item.notas && <p className="text-zinc-600 text-[11px] truncate">{item.notas}</p>}
                  </div>
                  <span className="text-zinc-500 text-xs font-mono flex-shrink-0">{formatARS(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ítems del borrador — editables */}
        {draftItems.length > 0 && (
          <div className="px-4 pt-1">
            {sentItems.length > 0 && (
              <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-semibold mb-2">
                Por enviar
              </p>
            )}
            <div className="space-y-2">
              {draftItems.map((item) => (
                <div key={item.productoId} className="bg-[#111] border border-[#222] rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-sm font-medium min-w-0 truncate">{item.nombre}</p>
                    <span className="text-white text-xs font-mono flex-shrink-0">{formatARS(item.subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Cantidad */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDec(item.productoId)}
                        disabled={item.cantidad <= 1}
                        className="w-7 h-7 rounded-md bg-[#202020] text-white flex items-center justify-center hover:bg-[#2a2a2a] disabled:opacity-30"
                        aria-label="Menos cantidad"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-white text-sm font-bold w-5 text-center tabular-nums">{item.cantidad}</span>
                      <button
                        onClick={() => onInc(item.productoId)}
                        className="w-7 h-7 rounded-md bg-[#202020] text-white flex items-center justify-center hover:bg-[#2a2a2a]"
                        aria-label="Más cantidad"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingNotas(editingNotas === item.productoId ? null : item.productoId)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                          item.notas ? 'bg-amber-600/20 text-amber-400' : 'bg-[#202020] text-[#676b67] hover:text-white'
                        }`}
                        aria-label="Nota para cocina"
                      >
                        <StickyNote size={13} />
                      </button>
                      <button
                        onClick={() => onRemove(item.productoId)}
                        className="w-7 h-7 rounded-md bg-[#202020] text-red-400 flex items-center justify-center hover:bg-red-500/10"
                        aria-label="Quitar producto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Nota (visible o editable) */}
                  {editingNotas === item.productoId ? (
                    <input
                      autoFocus
                      value={item.notas ?? ''}
                      onChange={(e) => onSetNotas(item.productoId, e.target.value)}
                      onBlur={() => setEditingNotas(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setEditingNotas(null); }}
                      placeholder="Nota para cocina (ej: sin sal)"
                      className="mt-2 w-full bg-black border border-[#2a2a2a] rounded-md px-2 py-1.5 text-white text-xs outline-none focus:border-amber-500/50"
                    />
                  ) : (
                    item.notas && (
                      <p className="mt-1.5 text-amber-400/80 text-[11px] truncate">📝 {item.notas}</p>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Total + enviar */}
      <div className="border-t border-[#1f1f1f] px-4 py-3 space-y-3 flex-shrink-0">
        {sentTotal > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">En cocina</span>
            <span className="text-zinc-400 font-mono">{formatARS(sentTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm uppercase tracking-widest">
            {sentTotal > 0 ? 'Por enviar' : 'Total'}
          </span>
          <span className="text-white font-bold text-lg font-mono">{formatARS(draftTotal)}</span>
        </div>
        <button
          onClick={onEnviar}
          disabled={draftItems.length === 0 || enviando}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all min-h-[48px]
            enabled:bg-amber-600 enabled:hover:bg-amber-500 enabled:text-white enabled:shadow-lg enabled:shadow-amber-900/40
            disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {enviando ? 'Enviando...' : 'Enviar a cocina'}
        </button>
        {draftItems.length === 0 && !enviando && (
          <p className="text-center text-[11px] text-zinc-600">Agregá al menos un producto para enviar</p>
        )}
      </div>
    </div>
  );
});
