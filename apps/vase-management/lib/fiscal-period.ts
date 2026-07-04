// lib/fiscal-period.ts
//
// Valida que una fecha no caiga dentro de un período fiscal cerrado antes
// de permitir crear/anular/modificar comprobantes. El prompt maestro es
// explícito: "No permitir modificar documentos dentro de períodos cerrados
// sin autorización especial."

import { prisma } from '@/lib/prisma'

export class PeriodClosedError extends Error {
  constructor(year: number, month: number) {
    super(`El período ${month}/${year} está cerrado. Se requiere autorización especial para modificar comprobantes de ese período.`)
    this.name = 'PeriodClosedError'
  }
}

/**
 * Lanza PeriodClosedError si el período fiscal correspondiente a `date`
 * está CLOSED o LOCKED. No valida permisos de autorización especial —
 * eso lo maneja el caller vía requirePermission(PERMISSIONS.PERIOD_CLOSE)
 * si quiere permitir el override.
 */
export async function assertPeriodOpen(companyId: string, date: Date): Promise<void> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const period = await prisma.fiscalPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  })

  if (period && period.status !== 'OPEN') {
    throw new PeriodClosedError(year, month)
  }
}

export function handlePeriodClosedError(err: unknown) {
  if (err instanceof PeriodClosedError) {
    return { error: err.message, code: 'PERIOD_CLOSED' as const, status: 423 as const } // 423 Locked
  }
  return null
}
