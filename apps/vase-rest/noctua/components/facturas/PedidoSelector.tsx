'use client';

import { memo } from 'react';
import { Receipt } from 'lucide-react';
import type { PedidoFacturaItem, PedidoListoFactura } from '@/services/facturasService';
import { formatearARS } from './facturasConstants';

interface PedidoSelectorProps {
  pedidos: PedidoListoFactura[];
  pedidoSeleccionado: PedidoListoFactura | null;
  pedidoSeleccionadoId: string;
  onSeleccionarPedido: (pedidoId: string) => void;
}

function PedidoSelectorBase({
  pedidos,
  pedidoSeleccionado,
  pedidoSeleccionadoId,
  onSeleccionarPedido,
}: PedidoSelectorProps) {
  return (
    <section className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Receipt size={18} className="text-[#676B67]" />
        <h2 className="font-black tracking-widest uppercase text-sm">Seleccionar pedido</h2>
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-xl border border-[#1a1a1a] bg-black/40 p-6 text-center">
          <p className="text-[#676B67] font-semibold">No hay pedidos listos para cobrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <select
            value={pedidoSeleccionadoId}
            onChange={(event) => onSeleccionarPedido(event.target.value)}
            className="w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
          >
            <option value="">Seleccionar pedido...</option>
            {pedidos.map((pedido) => (
              <option key={pedido.id} value={pedido.id}>
                Mesa {pedido.mesa?.numero || '-'} | {formatearARS(pedido.total)} | {pedido.estado}
              </option>
            ))}
          </select>

          {pedidoSeleccionado && (
            <div className="rounded-2xl border border-[#1a1a1a] bg-black/50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-black">Mesa {pedidoSeleccionado.mesa?.numero || '-'}</h3>
                  <p className="text-xs text-[#676B67] uppercase tracking-widest">
                    {pedidoSeleccionado.mesa?.zona || 'Sin zona'} | {pedidoSeleccionado.estado}
                  </p>
                </div>
                <p className="text-2xl font-black font-mono">{formatearARS(pedidoSeleccionado.total)}</p>
              </div>

              <div className="space-y-2">
                {pedidoSeleccionado.items.map((item: PedidoFacturaItem) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 border-b border-[#111] pb-2">
                    <div>
                      <p className="text-sm font-bold">{item.cantidad} x {item.producto?.nombre || 'Producto'}</p>
                      {item.notas && <p className="text-xs text-yellow-400">{item.notas}</p>}
                    </div>
                    <p className="text-sm font-mono text-[#BCB9B9]">{formatearARS(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export const PedidoSelector = memo(PedidoSelectorBase);
