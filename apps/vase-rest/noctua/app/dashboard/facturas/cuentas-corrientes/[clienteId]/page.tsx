'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw, Save } from 'lucide-react';
import { formatearARS } from '@/components/facturas/facturasConstants';
import {
  facturasService,
  type CuentaCorrienteDetalle,
  type MovimientoCuentaCorriente,
} from '@/services/facturasService';
import { useAuthStore } from '@/store/authStore';

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CuentaCorrienteDetallePage() {
  const params = useParams<{ clienteId: string }>();
  const clienteId = params.clienteId;
  const usuario = useAuthStore((state) => state.usuario);
  const autorizado = usuario?.rol === 'admin' || usuario?.rol === 'cajero';
  const [detalle, setDetalle] = useState<CuentaCorrienteDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pago, setPago] = useState({
    importe: '',
    medioPago: 'efectivo',
    referencia: '',
    observaciones: '',
    fechaPago: '',
  });
  const [ajuste, setAjuste] = useState({
    tipo: 'DEBIT' as 'DEBIT' | 'CREDIT',
    importe: '',
    motivo: '',
  });

  const cargar = useCallback(async () => {
    if (!autorizado || !clienteId) return;

    try {
      setLoading(true);
      setError(null);
      setDetalle(await facturasService.obtenerCuentaCorriente(clienteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cuenta corriente.');
    } finally {
      setLoading(false);
    }
  }, [autorizado, clienteId]);

  const movimientosFiltrados = useMemo(() => {
    const movimientos = detalle?.movimientos || [];
    return movimientos.filter((movimiento: MovimientoCuentaCorriente) => {
      const fecha = movimiento.fecha?.slice(0, 10);
      const matchTipo = !tipoFiltro || movimiento.tipo === tipoFiltro;
      const matchDesde = !desde || fecha >= desde;
      const matchHasta = !hasta || fecha <= hasta;
      return matchTipo && matchDesde && matchHasta;
    });
  }, [desde, detalle?.movimientos, hasta, tipoFiltro]);

  const registrarPago = useCallback(async () => {
    const importe = Number(pago.importe || 0);
    if (!importe || importe <= 0) {
      setError('El importe del pago debe ser mayor a cero.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const actualizado = await facturasService.registrarPagoCuentaCorriente({
        clienteId,
        importe,
        medioPago: pago.medioPago,
        referencia: pago.referencia,
        observaciones: pago.observaciones,
        fechaPago: pago.fechaPago || undefined,
        idempotencyKey: createIdempotencyKey(),
      });
      setDetalle(actualizado);
      setPago({ importe: '', medioPago: 'efectivo', referencia: '', observaciones: '', fechaPago: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  }, [clienteId, pago]);

  const registrarAjuste = useCallback(async () => {
    const importe = Number(ajuste.importe || 0);
    if (!importe || importe <= 0 || !ajuste.motivo.trim()) {
      setError('El ajuste necesita importe mayor a cero y motivo.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await facturasService.registrarAjusteCuentaCorriente({
        clienteId,
        tipo: ajuste.tipo,
        importe,
        motivo: ajuste.motivo,
        idempotencyKey: createIdempotencyKey(),
      });
      setAjuste({ tipo: 'DEBIT', importe: '', motivo: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el ajuste.');
    } finally {
      setSaving(false);
    }
  }, [ajuste, cargar, clienteId]);

  const exportar = useCallback(async () => {
    try {
      setExportando(true);
      const archivo = await facturasService.exportarCuentaCorriente(clienteId);
      descargarBlob(archivo.blob, archivo.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar la cuenta corriente.');
    } finally {
      setExportando(false);
    }
  }, [clienteId]);

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
          <Link href="/dashboard/facturas/cuentas-corrientes" className="text-sm text-[#676B67] hover:text-white">Cuentas corrientes</Link>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.18em] uppercase">
            {detalle?.cliente.nombre || 'Cuenta corriente'}
          </h1>
          <p className="text-sm text-[#676B67] mt-1">{detalle?.cliente.documento || 'Sin documento'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void exportar()} disabled={exportando || !detalle} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
            <Download size={16} />
            Exportar movimientos
          </button>
          <button type="button" onClick={() => void cargar()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 text-sm font-bold text-[#BCB9B9] hover:bg-[#151515] disabled:opacity-50">
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
          <p className="text-sm text-[#676B67]">Saldo</p>
          <p className={detalle && detalle.saldo < 0 ? 'mt-2 font-mono text-2xl font-black text-emerald-300' : 'mt-2 font-mono text-2xl font-black'}>
            {formatearARS(detalle?.saldo || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
          <p className="text-sm text-[#676B67]">Debitos</p>
          <p className="mt-2 font-mono text-2xl font-black">{formatearARS(detalle?.totalDebitado || 0)}</p>
        </div>
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
          <p className="text-sm text-[#676B67]">Creditos</p>
          <p className="mt-2 font-mono text-2xl font-black">{formatearARS(detalle?.totalAcreditado || 0)}</p>
        </div>
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
          <p className="text-sm text-[#676B67]">Facturas pendientes</p>
          <p className="mt-2 font-mono text-2xl font-black">{detalle?.facturasPendientes.length || 0}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5 space-y-3">
          <h2 className="font-black tracking-widest uppercase text-sm">Registrar pago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="number" placeholder="Importe" value={pago.importe} onChange={(event) => setPago((current) => ({ ...current, importe: event.target.value }))} className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
            <input type="date" value={pago.fechaPago} onChange={(event) => setPago((current) => ({ ...current, fechaPago: event.target.value }))} className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
            <input placeholder="Medio de pago" value={pago.medioPago} onChange={(event) => setPago((current) => ({ ...current, medioPago: event.target.value }))} className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
            <input placeholder="Referencia" value={pago.referencia} onChange={(event) => setPago((current) => ({ ...current, referencia: event.target.value }))} className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
            <input placeholder="Observaciones" value={pago.observaciones} onChange={(event) => setPago((current) => ({ ...current, observaciones: event.target.value }))} className="sm:col-span-2 rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
          </div>
          <button type="button" onClick={() => void registrarPago()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-40">
            <Save size={16} />
            Registrar pago
          </button>
        </div>

        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5 space-y-3">
          <h2 className="font-black tracking-widest uppercase text-sm">Ajuste manual</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={ajuste.tipo} onChange={(event) => setAjuste((current) => ({ ...current, tipo: event.target.value as 'DEBIT' | 'CREDIT' }))} className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white">
              <option value="DEBIT">Debito</option>
              <option value="CREDIT">Credito</option>
            </select>
            <input type="number" placeholder="Importe" value={ajuste.importe} onChange={(event) => setAjuste((current) => ({ ...current, importe: event.target.value }))} className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
            <input placeholder="Motivo obligatorio" value={ajuste.motivo} onChange={(event) => setAjuste((current) => ({ ...current, motivo: event.target.value }))} className="sm:col-span-2 rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-white" />
          </div>
          <button type="button" onClick={() => void registrarAjuste()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 text-sm font-black text-white disabled:opacity-40">
            <Save size={16} />
            Registrar ajuste
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="font-black tracking-widest uppercase text-sm">Movimientos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} className="rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white" />
            <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} className="rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white" />
            <select value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value)} className="rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-white">
              <option value="">Todos</option>
              <option value="DEBIT">Debitos</option>
              <option value="CREDIT">Creditos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-left text-[#676B67]">
                <th className="py-3">Fecha</th>
                <th className="py-3">Tipo</th>
                <th className="py-3">Origen</th>
                <th className="py-3">Descripcion</th>
                <th className="py-3">Debito</th>
                <th className="py-3">Credito</th>
                <th className="py-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((movimiento) => (
                <tr key={movimiento.id} className="border-b border-[#111]">
                  <td className="py-3">{movimiento.fecha?.slice(0, 10)}</td>
                  <td className="py-3">{movimiento.tipo}</td>
                  <td className="py-3">{movimiento.origen}</td>
                  <td className="py-3">{movimiento.descripcion}</td>
                  <td className="py-3 font-mono">{movimiento.tipo === 'DEBIT' ? formatearARS(movimiento.importe) : '-'}</td>
                  <td className="py-3 font-mono">{movimiento.tipo === 'CREDIT' ? formatearARS(movimiento.importe) : '-'}</td>
                  <td className="py-3">{movimiento.creadoPor || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
