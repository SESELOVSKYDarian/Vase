'use client';

import { memo } from 'react';
import { AlertTriangle, ReceiptText } from 'lucide-react';
import type {
  ClienteFacturaInput,
  MetodoPagoFactura,
  MotivoPagoInternoNoFiscal,
  Pago,
  PedidoListoFactura,
  TipoComprobante,
} from '@/services/facturasService';
import {
  ADVERTENCIA_PAGO_INTERNO_NO_FISCAL,
  BILLETERAS,
  MARCAS_TARJETA,
  METODOS_PAGO,
  MOTIVOS_PAGO_INTERNO_NO_FISCAL,
  TIPOS_COMPROBANTE,
} from './facturasConstants';

interface FormularioCobroProps {
  pedidoSeleccionado: PedidoListoFactura | null;
  metodoPago: MetodoPagoFactura;
  tipoComprobante: TipoComprobante;
  marcaTarjeta: string;
  bancoTarjeta: string;
  proveedorBilletera: string;
  referenciaPago: string;
  recibidoPor: string;
  montoRecibido: number;
  vuelto: number;
  clienteCuenta: ClienteFacturaInput;
  pagoPendiente: Pago | null;
  cobrando: boolean;
  pagoInternoSeleccionado: boolean;
  motivoPagoInterno: MotivoPagoInternoNoFiscal;
  observacionPagoInterno: string;
  puedeRegistrarPagoInterno: boolean;
  onMetodoPagoChange: (value: MetodoPagoFactura) => void;
  onTipoComprobanteChange: (value: TipoComprobante) => void;
  onMarcaTarjetaChange: (value: string) => void;
  onBancoTarjetaChange: (value: string) => void;
  onProveedorBilleteraChange: (value: string) => void;
  onReferenciaPagoChange: (value: string) => void;
  onRecibidoPorChange: (value: string) => void;
  onMontoRecibidoChange: (value: number) => void;
  onClienteCuentaChange: (value: ClienteFacturaInput) => void;
  onPagoInternoSeleccionadoChange: (value: boolean) => void;
  onMotivoPagoInternoChange: (value: MotivoPagoInternoNoFiscal) => void;
  onObservacionPagoInternoChange: (value: string) => void;
  onCobrar: () => void;
  onConfirmarEfectivo: () => void;
  onSolicitarPagoInterno: () => void;
}

/**
 * Renderiza cobro fiscal, cuenta corriente y Movimiento interno no fiscal.
 */
function FormularioCobroBase({
  pedidoSeleccionado,
  metodoPago,
  tipoComprobante,
  marcaTarjeta,
  bancoTarjeta,
  proveedorBilletera,
  referenciaPago,
  recibidoPor,
  montoRecibido,
  vuelto,
  clienteCuenta,
  pagoPendiente,
  cobrando,
  pagoInternoSeleccionado,
  motivoPagoInterno,
  observacionPagoInterno,
  puedeRegistrarPagoInterno,
  onMetodoPagoChange,
  onTipoComprobanteChange,
  onMarcaTarjetaChange,
  onBancoTarjetaChange,
  onProveedorBilleteraChange,
  onReferenciaPagoChange,
  onRecibidoPorChange,
  onMontoRecibidoChange,
  onClienteCuentaChange,
  onPagoInternoSeleccionadoChange,
  onMotivoPagoInternoChange,
  onObservacionPagoInternoChange,
  onCobrar,
  onConfirmarEfectivo,
  onSolicitarPagoInterno,
}: FormularioCobroProps) {
  // Mantiene agrupados los datos del cliente para cuenta corriente.
  const updateCliente = (field: keyof ClienteFacturaInput, value: string) => {
    onClienteCuentaChange({ ...clienteCuenta, [field]: value });
  };

  return (
    <section className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
      <h2 className="font-black tracking-widest uppercase text-sm mb-4">Datos de cobro</h2>

      <div className="space-y-4">
        {!pagoInternoSeleccionado && (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Tipo de factura</span>
              <select
                value={tipoComprobante}
                onChange={(event) => onTipoComprobanteChange(Number(event.target.value) as TipoComprobante)}
                className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
              >
                {TIPOS_COMPROBANTE.map((tipo) => (
                  <option key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</option>
                ))}
              </select>
            </label>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Metodo de pago fiscal</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {METODOS_PAGO.map((metodo) => {
                  const Icon = metodo.icon;
                  const activo = metodoPago === metodo.value;

                  return (
                    <button
                      key={metodo.value}
                      type="button"
                      onClick={() => onMetodoPagoChange(metodo.value)}
                      className={activo ? 'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition border-white bg-white text-black' : 'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition border-[#2a2a2a] bg-black text-[#BCB9B9] hover:border-white/40'}
                    >
                      <Icon size={16} />
                      {metodo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {metodoPago === 'cuenta_corriente' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#1f2937] bg-[#0d0d0d] p-4">
                <label className="sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Cliente</span>
                  <input
                    value={clienteCuenta.nombre || ''}
                    onChange={(event) => updateCliente('nombre', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">CUIT / documento</span>
                  <input
                    value={clienteCuenta.documento || ''}
                    onChange={(event) => updateCliente('documento', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Condicion fiscal</span>
                  <input
                    value={clienteCuenta.condicionFiscal || ''}
                    onChange={(event) => updateCliente('condicionFiscal', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Email</span>
                  <input
                    value={clienteCuenta.email || ''}
                    onChange={(event) => updateCliente('email', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Telefono</span>
                  <input
                    value={clienteCuenta.telefono || ''}
                    onChange={(event) => updateCliente('telefono', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
                  />
                </label>
              </div>
            )}

            {metodoPago === 'efectivo' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Monto recibido</span>
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={(event) => onMontoRecibidoChange(Number(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Vuelto</span>
                  <input type="number" value={vuelto} readOnly className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-sm font-bold text-[#BCB9B9]" />
                </label>
              </div>
            )}

            {metodoPago === 'billetera_virtual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Billetera</span>
                  <select value={proveedorBilletera} onChange={(event) => onProveedorBilleteraChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40">
                    {BILLETERAS.map((billetera) => <option key={billetera} value={billetera}>{billetera}</option>)}
                  </select>
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Referencia</span>
                  <input value={referenciaPago} onChange={(event) => onReferenciaPagoChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40" />
                </label>
              </div>
            )}

            {(metodoPago === 'debito' || metodoPago === 'credito') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Marca</span>
                  <select value={marcaTarjeta} onChange={(event) => onMarcaTarjetaChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40">
                    {MARCAS_TARJETA.map((marca) => <option key={marca} value={marca}>{marca}</option>)}
                  </select>
                </label>
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Banco</span>
                  <input value={bancoTarjeta} onChange={(event) => onBancoTarjetaChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40" />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Referencia / cupon</span>
                  <input value={referenciaPago} onChange={(event) => onReferenciaPagoChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40" />
                </label>
              </div>
            )}

            <label>
              <span className="text-xs font-bold uppercase tracking-widest text-[#676B67]">Recibido por</span>
              <input value={recibidoPor} onChange={(event) => onRecibidoPorChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-white/40" />
            </label>
          </>
        )}

        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 text-yellow-300" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-yellow-200">Pago interno no fiscal</h3>
              <p className="mt-1 text-sm text-yellow-100/85">{ADVERTENCIA_PAGO_INTERNO_NO_FISCAL}</p>
            </div>
          </div>

          {puedeRegistrarPagoInterno ? (
            <button
              type="button"
              onClick={() => onPagoInternoSeleccionadoChange(!pagoInternoSeleccionado)}
              className={pagoInternoSeleccionado ? 'inline-flex items-center gap-2 rounded-xl border border-yellow-300 bg-yellow-300 px-4 py-3 text-sm font-black text-black' : 'inline-flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-black px-4 py-3 text-sm font-black text-yellow-200 hover:bg-yellow-500/10'}
            >
              <ReceiptText size={16} />
              {pagoInternoSeleccionado ? 'Volver a cobro fiscal' : 'Usar Pago interno no fiscal'}
            </button>
          ) : (
            <p className="text-sm font-semibold text-yellow-100/80">Disponible solamente para administradores.</p>
          )}

          {pagoInternoSeleccionado && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-yellow-500/20 pt-4">
              <label>
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-100/80">Motivo</span>
                <select
                  value={motivoPagoInterno}
                  onChange={(event) => onMotivoPagoInternoChange(event.target.value as MotivoPagoInternoNoFiscal)}
                  className="mt-2 w-full rounded-xl border border-yellow-500/30 bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-200"
                >
                  {MOTIVOS_PAGO_INTERNO_NO_FISCAL.map((motivo) => (
                    <option key={motivo.value} value={motivo.value}>{motivo.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-100/80">Monto recibido</span>
                <input
                  type="number"
                  value={montoRecibido}
                  onChange={(event) => onMontoRecibidoChange(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-yellow-500/30 bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-200"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-100/80">Recibido por</span>
                <input
                  value={recibidoPor}
                  onChange={(event) => onRecibidoPorChange(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-yellow-500/30 bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-200"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-100/80">Observacion</span>
                <textarea
                  value={observacionPagoInterno}
                  onChange={(event) => onObservacionPagoInternoChange(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-yellow-500/30 bg-black px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-200"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          {pagoInternoSeleccionado ? (
            <button type="button" onClick={onSolicitarPagoInterno} disabled={!pedidoSeleccionado || cobrando || !puedeRegistrarPagoInterno} className="rounded-xl bg-yellow-300 px-4 py-4 text-sm font-black text-black hover:bg-yellow-200 disabled:opacity-40">
              {cobrando ? 'Procesando...' : 'Registrar Pago interno no fiscal'}
            </button>
          ) : (
            <button type="button" onClick={onCobrar} disabled={!pedidoSeleccionado || cobrando} className="rounded-xl bg-white px-4 py-4 text-sm font-black text-black hover:bg-[#BCB9B9] disabled:opacity-40">
              {cobrando ? 'Procesando...' : metodoPago === 'cuenta_corriente' ? 'Facturar a cuenta corriente' : 'Verificar ARCA, facturar y cerrar mesa'}
            </button>
          )}

          {pagoPendiente && !pagoInternoSeleccionado && (
            <button type="button" onClick={onConfirmarEfectivo} disabled={cobrando} className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4 text-sm font-black text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-40">
              Confirmar efectivo y cerrar mesa
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export const FormularioCobro = memo(FormularioCobroBase);
