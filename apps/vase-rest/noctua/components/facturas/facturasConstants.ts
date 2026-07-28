import { Banknote, CreditCard, HandCoins, Wallet } from 'lucide-react';
import type { MetodoPagoFactura, MotivoPagoInternoNoFiscal, TipoComprobante } from '@/services/facturasService';

export const TIPOS_COMPROBANTE: {
  codigo: TipoComprobante;
  nombre: string;
}[] = [
  { codigo: 1, nombre: 'Factura A' },
  { codigo: 6, nombre: 'Factura B' },
  { codigo: 11, nombre: 'Factura C' },
];

export const METODOS_PAGO: {
  value: MetodoPagoFactura;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'billetera_virtual', label: 'Billetera virtual', icon: Wallet },
  { value: 'debito', label: 'Tarjeta debito', icon: CreditCard },
  { value: 'credito', label: 'Tarjeta credito', icon: CreditCard },
  { value: 'cuenta_corriente', label: 'Cuenta corriente', icon: HandCoins },
];

export const MOTIVOS_PAGO_INTERNO_NO_FISCAL: {
  value: MotivoPagoInternoNoFiscal;
  label: string;
}[] = [
  { value: 'prueba_interna', label: 'Prueba interna' },
  { value: 'cortesia_autorizada', label: 'Cortesia autorizada' },
  { value: 'consumo_interno', label: 'Consumo interno' },
  { value: 'ajuste_de_caja', label: 'Ajuste de caja' },
  { value: 'error_operativo', label: 'Error operativo' },
  { value: 'otro', label: 'Otro' },
];

// Textos de negocio del Movimiento interno no fiscal.
export const ADVERTENCIA_PAGO_INTERNO_NO_FISCAL =
  'Este movimiento no genera factura fiscal y no reemplaza la obligación de facturar una venta real.';

export const RESULTADO_PAGO_INTERNO_NO_FISCAL =
  'Movimiento interno registrado. No se emitió factura fiscal.';

export const BILLETERAS = [
  'Mercado Pago',
  'Uala',
  'Cuenta DNI',
  'Naranja X',
  'Modo',
  'Otra',
];

export const MARCAS_TARJETA = [
  'Visa',
  'Mastercard',
  'American Express',
  'Maestro',
  'Cabal',
  'Otra',
];

/**
 * Formatea importes en pesos argentinos para la interfaz.
 */
export function formatearARS(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Number(valor || 0));
}
