'use client';

import { memo } from 'react';
import { Download } from 'lucide-react';
import type { Factura, FacturasFiltros } from '@/services/facturasService';
import { formatearARS, METODOS_PAGO, TIPOS_COMPROBANTE } from './facturasConstants';

interface TablaFacturasProps {
  facturas: Factura[];
  filtros: FacturasFiltros;
  exportando: boolean;
  onFiltroChange: (filtros: FacturasFiltros) => void;
  onExportar: () => void;
}

function TablaFacturasBase({ facturas, filtros, exportando, onFiltroChange, onExportar }: TablaFacturasProps) {
  const setFiltro = (key: keyof FacturasFiltros, value: string) => {
    onFiltroChange({ ...filtros, [key]: value });
  };

  return (
    <section className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
        <h2 className="font-black tracking-widest uppercase text-sm">Ultimas facturas</h2>
        <button
          type="button"
          onClick={onExportar}
          disabled={exportando}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <Download size={16} />
          {exportando ? 'Exportando...' : 'Exportar a Excel'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 mb-5">
        <label>
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Desde</span>
          <input type="date" value={filtros.desde || ''} onChange={(event) => setFiltro('desde', event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white" />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Hasta</span>
          <input type="date" value={filtros.hasta || ''} onChange={(event) => setFiltro('hasta', event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white" />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Cliente</span>
          <input value={filtros.cliente || ''} onChange={(event) => setFiltro('cliente', event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white" />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Estado</span>
          <select value={filtros.estado || ''} onChange={(event) => setFiltro('estado', event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white">
            <option value="">Todos</option>
            <option value="emitida">Emitida</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="anulada">Anulada</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Tipo</span>
          <select value={filtros.tipoComprobante || ''} onChange={(event) => setFiltro('tipoComprobante', event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white">
            <option value="">Todos</option>
            {TIPOS_COMPROBANTE.map((tipo) => <option key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Pago</span>
          <select value={filtros.metodoPago || ''} onChange={(event) => setFiltro('metodoPago', event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white">
            <option value="">Todos</option>
            {METODOS_PAGO.map((metodo) => <option key={metodo.value} value={metodo.value}>{metodo.label}</option>)}
          </select>
        </label>
      </div>

      {facturas.length === 0 ? (
        <p className="text-sm text-[#676B67]">Todavia no hay facturas para los filtros seleccionados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-left text-[#676B67]">
                <th className="py-3">Comprobante</th>
                <th className="py-3">Tipo</th>
                <th className="py-3">Cliente</th>
                <th className="py-3">Metodo</th>
                <th className="py-3">Total</th>
                <th className="py-3">Saldo</th>
                <th className="py-3">CAE</th>
                <th className="py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((factura) => (
                <tr key={factura.id} className="border-b border-[#111]">
                  <td className="py-3 font-mono">{factura.numeroComprobante}</td>
                  <td className="py-3">{TIPOS_COMPROBANTE.find((tipo) => tipo.codigo === factura.tipoComprobante)?.nombre}</td>
                  <td className="py-3">{factura.cliente?.nombre || '-'}</td>
                  <td className="py-3 capitalize">{factura.metodoPago?.replace('_', ' ')}</td>
                  <td className="py-3 font-mono">{formatearARS(factura.total)}</td>
                  <td className="py-3 font-mono">{formatearARS(factura.saldoPendiente || 0)}</td>
                  <td className="py-3 font-mono text-xs text-[#BCB9B9]">{factura.cae || '-'}</td>
                  <td className="py-3">
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                      {factura.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const TablaFacturas = memo(TablaFacturasBase);
