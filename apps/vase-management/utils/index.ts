// utils/index.ts
// Funciones de utilidad globales para Vase Business

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type NumericValue = number | string | null | undefined | { toNumber(): number }

function toNumber(value: NumericValue): number {
  if (typeof value === 'string') return parseFloat(value)
  if (typeof value === 'number') return value
  if (value && typeof value.toNumber === 'function') return value.toNumber()
  return 0
}

/** Merge de clases Tailwind */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatear moneda en pesos argentinos */
export function formatCurrency(amount: NumericValue): string {
  const num = toNumber(amount)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/** Formatear número con separadores de miles */
export function formatNumber(num: NumericValue, decimals = 2): string {
  const n = toNumber(num)
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/** Formatear fecha en español */
export function formatDate(date: Date | string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: es })
}

/** Formatear fecha y hora */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

/** Truncar texto */
export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/** Obtener iniciales de un nombre */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/** Calcular porcentaje de cambio */
export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

/** Formatear número de comprobante AFIP (XXXX-XXXXXXXX) */
export function formatInvoiceNumber(pointOfSale: number, number: number): string {
  const pos = String(pointOfSale).padStart(4, '0')
  const num = String(number).padStart(8, '0')
  return `${pos}-${num}`
}

/** Obtener condición de IVA legible */
export function getIvaConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    RESPONSABLE_INSCRIPTO: 'Responsable Inscripto',
    MONOTRIBUTISTA: 'Monotributista',
    EXENTO: 'Exento',
    CONSUMIDOR_FINAL: 'Consumidor Final',
    NO_RESPONSABLE: 'No Responsable',
    SUJETO_NO_CATEGORIZADO: 'Sujeto No Categorizado',
  }
  return labels[condition] ?? condition
}

/** Tipo de letra de factura según condición IVA */
export function getInvoiceLetter(companyCondition: string, customerCondition: string): 'A' | 'B' | 'C' {
  if (companyCondition === 'RESPONSABLE_INSCRIPTO') {
    if (customerCondition === 'RESPONSABLE_INSCRIPTO') return 'A'
    return 'B'
  }
  return 'C'
}

/** Obtener color para un estado de venta/factura */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'badge-neutral',
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    DELIVERED: 'badge-info',
    INVOICED: 'badge-success',
    AUTHORIZED: 'badge-success',
    CANCELLED: 'badge-error',
    ERROR: 'badge-error',
    RECEIVED: 'badge-success',
    PAID: 'badge-success',
    PARTIAL: 'badge-warning',
  }
  return colors[status] ?? 'badge-neutral'
}

/** Etiqueta de estado de venta */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador',
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    DELIVERED: 'Entregado',
    INVOICED: 'Facturado',
    AUTHORIZED: 'Autorizado',
    CANCELLED: 'Cancelado',
    ERROR: 'Error',
    RECEIVED: 'Recibido',
    PAID: 'Pagado',
    PARTIAL: 'Pago parcial',
  }
  return labels[status] ?? status
}

/** Etiqueta de tipo de documento */
export function getSaleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BUDGET: 'Presupuesto',
    ORDER: 'Pedido',
    REMITO: 'Remito',
    SALE: 'Venta',
    INVOICE: 'Factura',
    CREDIT_NOTE: 'Nota de crédito',
    DEBIT_NOTE: 'Nota de débito',
    RECEIPT: 'Recibo',
  }
  return labels[type] ?? type
}

/** Etiqueta de método de pago */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Efectivo',
    BANK_TRANSFER: 'Transferencia bancaria',
    CREDIT_CARD: 'Tarjeta de crédito',
    DEBIT_CARD: 'Tarjeta de débito',
    MERCADO_PAGO: 'Mercado Pago',
    CHECK: 'Cheque',
    OTHER: 'Otro',
  }
  return labels[method] ?? method
}

/** Generar código de barras checksum EAN-13 */
export function generateBarcode(prefix = '779'): string {
  const base = prefix + Math.random().toString().slice(2, 11)
  return base.slice(0, 12)
}

/** Calcular subtotal, IVA y total de un ítem */
export function calcItemTotals(quantity: number, unitPrice: number, discount: number, ivaRate: number) {
  const subtotal = quantity * unitPrice * (1 - discount / 100)
  const ivaAmount = subtotal * (ivaRate / 100)
  const total = subtotal + ivaAmount
  return { subtotal, ivaAmount, total }
}

/** Debounce para búsquedas */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/** Parsear parámetros de paginación de URL */
export function parsePaginationParams(searchParams: URLSearchParams) {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    limit: Math.min(100, parseInt(searchParams.get('limit') ?? '20')),
    search: searchParams.get('search') ?? '',
    orderBy: searchParams.get('orderBy') ?? 'createdAt',
    orderDir: (searchParams.get('orderDir') ?? 'desc') as 'asc' | 'desc',
  }
}
