// lib/ledger.service.ts
//
// Ledger formal de cuenta corriente. Reemplaza la dependencia de
// Customer.totalDebt / Supplier.totalDebt como fuente de verdad: esos campos
// pasan a ser un CACHÉ que se recalcula a partir de los movimientos, nunca
// se editan a mano fuera de este servicio.
//
// Regla de oro: todo saldo debe poder reconstruirse sumando debe-haber
// de CustomerAccountMovement / SupplierAccountMovement en orden cronológico.

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

// ───────────────────────── CLIENTES ─────────────────────────

export async function recordCustomerMovement(
  tx: Tx,
  params: {
    companyId: string
    customerId: string
    type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'ADJUSTMENT'
    debe?: number
    haber?: number
    sourceType?: string
    sourceId?: string
    dueDate?: Date | null
    notes?: string
    createdById?: string | null
    date?: Date
  }
) {
  const debe = params.debe ?? 0
  const haber = params.haber ?? 0

  // Saldo anterior: último movimiento del cliente
  const last = await tx.customerAccountMovement.findFirst({
    where: { customerId: params.customerId },
    orderBy: { createdAt: 'desc' },
  })
  const previousBalance = last ? Number(last.balance) : 0
  const newBalance = previousBalance + debe - haber

  const movement = await tx.customerAccountMovement.create({
    data: {
      companyId: params.companyId,
      customerId: params.customerId,
      type: params.type,
      debe,
      haber,
      balance: newBalance,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      dueDate: params.dueDate,
      notes: params.notes,
      createdById: params.createdById,
      date: params.date ?? new Date(),
    },
  })

  // Actualizar caché desnormalizado en Customer (solo para listados rápidos)
  await tx.customer.update({
    where: { id: params.customerId },
    data: {
      totalDebt: newBalance,
      ...(params.type === 'INVOICE' && { lastInvoiceDate: new Date() }),
    },
  })

  return movement
}

/** Reconstruye el saldo de un cliente desde cero sumando todos sus movimientos. Útil para auditoría / recálculo de cierre. */
export async function reconstructCustomerBalance(customerId: string): Promise<number> {
  const movements = await prisma.customerAccountMovement.findMany({
    where: { customerId },
    orderBy: { createdAt: 'asc' },
  })
  let balance = 0
  for (const m of movements) balance += Number(m.debe) - Number(m.haber)
  return balance
}

export async function getCustomerLedger(customerId: string, opts?: { from?: Date; to?: Date }) {
  return prisma.customerAccountMovement.findMany({
    where: {
      customerId,
      ...(opts?.from && { date: { gte: opts.from } }),
      ...(opts?.to && { date: { lte: opts.to } }),
    },
    orderBy: { date: 'asc' },
  })
}

// ───────────────────────── PROVEEDORES ─────────────────────────

export async function recordSupplierMovement(
  tx: Tx,
  params: {
    companyId: string
    supplierId: string
    type: 'PURCHASE' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'ADJUSTMENT'
    debe?: number
    haber?: number
    sourceType?: string
    sourceId?: string
    dueDate?: Date | null
    notes?: string
    createdById?: string | null
    date?: Date
  }
) {
  const debe = params.debe ?? 0
  const haber = params.haber ?? 0

  const last = await tx.supplierAccountMovement.findFirst({
    where: { supplierId: params.supplierId },
    orderBy: { createdAt: 'desc' },
  })
  const previousBalance = last ? Number(last.balance) : 0
  const newBalance = previousBalance + debe - haber

  const movement = await tx.supplierAccountMovement.create({
    data: {
      companyId: params.companyId,
      supplierId: params.supplierId,
      type: params.type,
      debe,
      haber,
      balance: newBalance,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      dueDate: params.dueDate,
      notes: params.notes,
      createdById: params.createdById,
      date: params.date ?? new Date(),
    },
  })

  await tx.supplier.update({
    where: { id: params.supplierId },
    data: { totalDebt: newBalance },
  })

  return movement
}

export async function reconstructSupplierBalance(supplierId: string): Promise<number> {
  const movements = await prisma.supplierAccountMovement.findMany({
    where: { supplierId },
    orderBy: { createdAt: 'asc' },
  })
  let balance = 0
  for (const m of movements) balance += Number(m.debe) - Number(m.haber)
  return balance
}

export async function getSupplierLedger(supplierId: string, opts?: { from?: Date; to?: Date }) {
  return prisma.supplierAccountMovement.findMany({
    where: {
      supplierId,
      ...(opts?.from && { date: { gte: opts.from } }),
      ...(opts?.to && { date: { lte: opts.to } }),
    },
    orderBy: { date: 'asc' },
  })
}
