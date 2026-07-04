// lib/bank.service.ts
//
// Igual patrón que ledger.service.ts / stock.service.ts: BankAccount.balance
// es un caché derivado, BankMovement es la fuente de verdad reconstruible.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

export async function recordBankMovement(
  tx: Tx,
  params: {
    companyId: string
    bankAccountId: string
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE' | 'INTEREST'
    amount: number // positivo=ingreso, negativo=egreso — el caller decide el signo
    description: string
    reference?: string
    date?: Date
  }
) {
  const last = await tx.bankMovement.findFirst({
    where: { bankAccountId: params.bankAccountId },
    orderBy: { createdAt: 'desc' },
  })
  const previousBalance = last ? Number(last.balance) : 0
  const newBalance = previousBalance + params.amount

  const movement = await tx.bankMovement.create({
    data: {
      companyId: params.companyId,
      bankAccountId: params.bankAccountId,
      type: params.type,
      amount: params.amount,
      balance: newBalance,
      description: params.description,
      reference: params.reference,
      date: params.date ?? new Date(),
    },
  })

  await tx.bankAccount.update({ where: { id: params.bankAccountId }, data: { balance: newBalance } })

  return movement
}

export async function reconstructBankBalance(bankAccountId: string): Promise<number> {
  const movements = await prisma.bankMovement.findMany({ where: { bankAccountId }, orderBy: { createdAt: 'asc' } })
  return movements.reduce((s, m) => s + Number(m.amount), 0)
}
