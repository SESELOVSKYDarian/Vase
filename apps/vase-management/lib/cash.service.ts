// lib/cash.service.ts
//
// Caja diaria formal. Reemplaza el modelo anterior (CashMovement suelto,
// sin sesión ni apertura/cierre) por un flujo real: abrir caja con monto
// inicial → operar durante el día (ventas del POS generan CashMovement) →
// cerrar con arqueo físico, comparando lo contado contra lo esperado.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

export class CashSessionError extends Error {}

/** Abre una sesión de caja. Falla si ya hay una sesión abierta para esa caja registradora. */
export async function openCashSession(params: {
  cashRegisterId: string
  userId: string
  openingAmount: number
}) {
  const existing = await prisma.cashSession.findFirst({
    where: { cashRegisterId: params.cashRegisterId, status: 'OPEN' },
  })
  if (existing) throw new CashSessionError('Ya hay una sesión de caja abierta para esta caja registradora')

  return prisma.cashSession.create({
    data: {
      cashRegisterId: params.cashRegisterId,
      userId: params.userId,
      openingAmount: params.openingAmount,
      status: 'OPEN',
    },
  })
}

/**
 * Calcula el monto esperado en caja: apertura + ingresos en efectivo -
 * egresos en efectivo del período de la sesión. Solo cuenta movimientos
 * con method=CASH — tarjeta/transferencia/MP no afectan el efectivo físico.
 */
export async function calculateExpectedCash(cashSessionId: string): Promise<number> {
  const session = await prisma.cashSession.findUniqueOrThrow({ where: { id: cashSessionId } })

  const movements = await prisma.cashMovement.findMany({
    where: {
      companyId: (await prisma.cashRegister.findUniqueOrThrow({ where: { id: session.cashRegisterId } })).companyId,
      method: 'CASH',
      date: { gte: session.openedAt, ...(session.closedAt && { lte: session.closedAt }) },
    },
  })

  const income = movements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + Number(m.amount), 0)
  const expense = movements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + Number(m.amount), 0)

  return Number(session.openingAmount) + income - expense
}

/** Cierra la sesión con arqueo físico y genera el CashClosing con el desglose por método de pago. */
export async function closeCashSession(params: {
  tx?: Tx
  cashSessionId: string
  countedAmount: number
  closedById: string
  notes?: string
}) {
  const db = params.tx ?? prisma
  const session = await db.cashSession.findUniqueOrThrow({ where: { id: params.cashSessionId } })
  if (session.status !== 'OPEN') throw new CashSessionError('La sesión ya está cerrada')

  const register = await db.cashRegister.findUniqueOrThrow({ where: { id: session.cashRegisterId } })
  const expectedAmount = await calculateExpectedCash(params.cashSessionId)
  const difference = params.countedAmount - expectedAmount

  const movements = await db.cashMovement.findMany({
    where: { companyId: register.companyId, date: { gte: session.openedAt } },
  })

  const byMethod = (method: string, type: 'INCOME' | 'EXPENSE') =>
    movements.filter((m) => m.method === method && m.type === type).reduce((s, m) => s + Number(m.amount), 0)

  const totalIncome = movements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + Number(m.amount), 0)
  const totalExpense = movements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + Number(m.amount), 0)

  const updated = await db.cashSession.update({
    where: { id: params.cashSessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      countedAmount: params.countedAmount,
      expectedAmount,
      difference,
      notes: params.notes,
    },
  })

  const closing = await db.cashClosing.create({
    data: {
      cashSessionId: params.cashSessionId,
      totalIncome,
      totalExpense,
      totalCash: byMethod('CASH', 'INCOME') - byMethod('CASH', 'EXPENSE'),
      totalCard: byMethod('CREDIT_CARD', 'INCOME') + byMethod('DEBIT_CARD', 'INCOME'),
      totalTransfer: byMethod('BANK_TRANSFER', 'INCOME'),
      totalMercadoPago: byMethod('MERCADO_PAGO', 'INCOME'),
      totalCheck: byMethod('CHECK', 'INCOME'),
      closedById: params.closedById,
    },
  })

  return { session: updated, closing, expectedAmount, difference }
}
