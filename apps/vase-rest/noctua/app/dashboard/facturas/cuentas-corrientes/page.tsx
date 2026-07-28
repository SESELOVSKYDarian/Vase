'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCcw, Search } from 'lucide-react';
import { formatearARS } from '@/components/facturas/facturasConstants';
import { facturasService, type CuentaCorrienteResumen } from '@/services/facturasService';
import { useAuthStore } from '@/store/authStore';

export default function CuentasCorrientesPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const autorizado = usuario?.rol === 'admin' || usuario?.rol === 'cajero';
  const [cuentas, setCuentas] = useState<CuentaCorrienteResumen[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!autorizado) return;

    try {
      setLoading(true);
      setError(null);
      setCuentas(await facturasService.obtenerCuentasCorrientes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas corrientes.');
    } finally {
      setLoading(false);
    }
  }, [autorizado]);

  const cuentasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return cuentas;

    return cuentas.filter((cuenta) => {
      const cliente = cuenta.cliente;
      return [cliente.nombre, cliente.documento, cliente.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(texto));
    });
  }, [busqueda, cuentas]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void cargar();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cargar]);

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <h1 className="text-2xl font-black tracking-widest uppercase">Acceso restringido</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.18em] uppercase">Cuentas corrientes</h1>
          <p className="text-sm text-[#676B67] mt-1">Saldos calculados desde movimientos contables.</p>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 text-sm font-bold text-[#BCB9B9] hover:bg-[#151515] disabled:opacity-50"
        >
          <RefreshCcw size={16} />
          Actualizar
        </button>
      </header>

      <section className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 mt-1 text-[#676B67]" size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Buscar cliente</span>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-white/40"
          />
        </label>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {cuentasFiltradas.map((cuenta) => {
          const saldoAFavor = cuenta.saldo < 0;

          return (
            <Link
              key={cuenta.cuentaCorrienteId}
              href={`/dashboard/facturas/cuentas-corrientes/${cuenta.cliente.id}`}
              className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5 transition hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white">{cuenta.cliente.nombre}</h2>
                  <p className="text-sm text-[#676B67]">{cuenta.cliente.documento || 'Sin documento'}</p>
                </div>
                <ArrowUpRight size={18} className="text-[#676B67]" />
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[#676B67]">Saldo</p>
                  <p className={saldoAFavor ? 'font-mono font-black text-emerald-300' : 'font-mono font-black text-white'}>
                    {formatearARS(cuenta.saldo)}
                  </p>
                </div>
                <div>
                  <p className="text-[#676B67]">Pendientes</p>
                  <p className="font-mono font-black">{cuenta.cantidadFacturasPendientes}</p>
                </div>
                <div>
                  <p className="text-[#676B67]">Vencida</p>
                  <p className="font-mono font-black">{formatearARS(cuenta.deudaVencida)}</p>
                </div>
                <div>
                  <p className="text-[#676B67]">Estado</p>
                  <p className="font-black capitalize">{cuenta.estado}</p>
                </div>
              </div>

              {cuenta.ultimoMovimiento && (
                <p className="mt-4 text-xs text-[#676B67]">
                  Ultimo movimiento: {cuenta.ultimoMovimiento.descripcion}
                </p>
              )}
            </Link>
          );
        })}
      </section>

      {!loading && cuentasFiltradas.length === 0 && (
        <p className="text-sm text-[#676B67]">No hay cuentas corrientes para mostrar.</p>
      )}
    </div>
  );
}
