// app/api/tesoreria/caja/sesiones/[id]/cerrar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { requirePermission, handlePermissionError, PERMISSIONS } from '@/lib/permissions'
import { closeCashSession, CashSessionError } from '@/lib/cash.service'
import { audit, requestMeta } from '@/lib/audit'

const closeSchema = z.object({
  countedAmount: z.number().min(0),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    // Cerrar caja es acción crítica listada explícitamente en el prompt maestro
    await requirePermission(session, PERMISSIONS.CASH_CLOSE)

    const cashSession = await prisma.cashSession.findFirst({
      where: { id: params.id, cashRegister: { companyId: ctx.companyId } },
    })
    if (!cashSession) return NextResponse.json({ error: 'Sesión de caja no encontrada' }, { status: 404 })

    const body = await req.json()
    const data = closeSchema.parse(body)

    const result = await prisma.$transaction(async (tx) =>
      closeCashSession({ tx, cashSessionId: params.id, countedAmount: data.countedAmount, closedById: ctx.userId, notes: data.notes })
    )

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CASH_CLOSE', module: 'tesoreria', entityType: 'CashSession', entityId: params.id,
      newValues: { countedAmount: data.countedAmount, expectedAmount: result.expectedAmount, difference: result.difference },
    })

    return NextResponse.json({ data: result, success: true })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    const permErr = handlePermissionError(err)
    if (permErr) return permErr
    if (err instanceof CashSessionError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/tesoreria/caja/sesiones/[id]/cerrar]', err)
    return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 })
  }
}
