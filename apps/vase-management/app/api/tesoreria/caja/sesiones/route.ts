// app/api/tesoreria/caja/sesiones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { openCashSession, CashSessionError } from '@/lib/cash.service'
import { audit, requestMeta } from '@/lib/audit'

const openSchema = z.object({
  cashRegisterId: z.string(),
  openingAmount: z.number().min(0),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const sessions = await prisma.cashSession.findMany({
      where: {
        cashRegister: { companyId: session.user.companyId },
        ...(status && { status }),
      },
      include: { cashRegister: { select: { name: true } }, closing: true },
      orderBy: { openedAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({ data: sessions })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const body = await req.json()
    const data = openSchema.parse(body)

    const register = await prisma.cashRegister.findFirst({ where: { id: data.cashRegisterId, companyId: ctx.companyId } })
    if (!register) return NextResponse.json({ error: 'Caja registradora inválida' }, { status: 400 })

    const cashSession = await openCashSession({ ...data, userId: ctx.userId })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'OPEN_CASH', module: 'tesoreria', entityType: 'CashSession', entityId: cashSession.id,
      newValues: { openingAmount: data.openingAmount },
    })

    return NextResponse.json({ data: cashSession, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof CashSessionError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/tesoreria/caja/sesiones]', err)
    return NextResponse.json({ error: 'Error al abrir caja' }, { status: 500 })
  }
}
