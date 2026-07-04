// lib/validations.ts
// Esquemas Zod compartidos para validaciones del sistema

import { z } from 'zod'

// Paginación
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

// CUIT argentino (con o sin guiones)
export const cuitSchema = z
  .string()
  .regex(/^\d{2}-?\d{8}-?\d{1}$/, 'CUIT inválido (formato: 30-12345678-9)')

// Email opcional
export const optionalEmail = z.string().email('Email inválido').optional().or(z.literal(''))

// Monto positivo
export const positiveAmount = z.number().positive('Debe ser mayor a 0')

// Rango de fechas
export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

// IVA alícuotas válidas para Argentina
export const ivaRateSchema = z.number().refine(
  (val) => [0, 2.5, 5, 10.5, 21, 27].includes(val),
  { message: 'Alícuota IVA inválida. Valores permitidos: 0, 2.5, 5, 10.5, 21, 27' }
)

// Condición IVA
export const ivaConditionSchema = z.enum([
  'RESPONSABLE_INSCRIPTO',
  'MONOTRIBUTISTA',
  'EXENTO',
  'CONSUMIDOR_FINAL',
  'NO_RESPONSABLE',
  'SUJETO_NO_CATEGORIZADO',
])

// Documento
export const documentTypeSchema = z.enum(['CUIT', 'CUIL', 'DNI', 'PASSPORT', 'OTHER'])

// Método de pago
export const paymentMethodSchema = z.enum([
  'CASH', 'BANK_TRANSFER', 'CREDIT_CARD',
  'DEBIT_CARD', 'MERCADO_PAGO', 'CHECK', 'OTHER',
])

// Letra de comprobante AFIP
export const invoiceLetterSchema = z.enum(['A', 'B', 'C', 'M', 'E'])

// Tipo de movimiento de stock
export const stockMovementTypeSchema = z.enum([
  'ENTRY', 'EXIT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT',
])
