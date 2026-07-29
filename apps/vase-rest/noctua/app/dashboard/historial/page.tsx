'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { formatARS } from '@/hooks/lib/utils';
import { obtenerPedidosPorFecha } from '@/hooks/lib/api/pedidosApi';
import type { Pedido } from '@/types/pedido';
import { TEXTO_ESTADO_COCINA } from '@/hooks/lib/constants';
import { cn } from '@/hooks/lib/utils';

export default function HistorialPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default: hoy
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      // Ajuste de rango para abarcar el día completo (UTC)
      const inicioStr = new Date(`${fechaInicio}T00:00:00.000Z`).toISOString();
      const finStr = new Date(`${fechaFin}T23:59:59.999Z`).toISOString();
      const data = await obtenerPedidosPorFecha(inicioStr, finStr);
      setPedidos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const totalVendido = pedidos.reduce((acc, p) => acc + p.total, 0);

  return (
    <div className="space-y-6">
      {/* Header & Filtros */}
      <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-5 flex flex-col md:flex-row gap-4 items-end justify-between">
        <div>
          <h2 className="text-white font-bold tracking-widest uppercase text-lg">Historial de Pedidos</h2>
          <p className="text-[#676B67] text-sm">Visualiza los pedidos despachados por fecha.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#676B67] uppercase font-semibold">Desde</label>
            <input 
              type="date" 
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-black border border-[#2a2a2a] rounded-md px-3 py-2 text-white outline-none focus:border-white text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#676B67] uppercase font-semibold">Hasta</label>
            <input 
              type="date" 
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="bg-black border border-[#2a2a2a] rounded-md px-3 py-2 text-white outline-none focus:border-white text-sm"
            />
          </div>
          <button 
            onClick={cargarHistorial}
            className="mb-0 mt-auto bg-white text-black px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Search size={14} />
            Filtrar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-5">
          <p className="text-xs text-[#676B67] font-semibold tracking-widest uppercase mb-1">Total Pedidos</p>
          <p className="text-3xl text-white font-black">{pedidos.length}</p>
        </div>
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-5">
          <p className="text-xs text-[#676B67] font-semibold tracking-widest uppercase mb-1">Ingresos Totales</p>
          <p className="text-3xl text-green-400 font-black font-mono">{formatARS(totalVendido)}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#676B67]">Cargando historial...</div>
        ) : pedidos.length === 0 ? (
          <div className="p-8 text-center text-[#676B67]">No hay pedidos en este rango de fechas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#BCB9B9]">
              <thead className="bg-[#111] text-[#676B67] text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Mesa</th>
                  <th className="px-6 py-4">Detalle Items</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {pedidos.map(p => (
                  <tr key={p.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.creadoEn.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white font-bold">Mesa {p.numeroMesa}</span>
                      <br/>
                      <span className="text-xs text-[#676B67]">{p.zona}</span>
                    </td>
                    <td className="px-6 py-4 min-w-[250px]">
                      <div className="space-y-1">
                        {p.items.map(i => (
                          <div key={i.productoId} className="flex justify-between text-xs">
                            <span>{i.cantidad}x {i.nombre}</span>
                            <span className="text-[#676B67]">{formatARS(i.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border",
                        p.estado === 'entregado' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        p.estado === 'listo' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      )}>
                        {TEXTO_ESTADO_COCINA[p.estado]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-white font-bold">
                      {formatARS(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
