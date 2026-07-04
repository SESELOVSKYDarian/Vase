// app/api/tesoreria/bancos/[id]/movimientos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { recordBankMovement } from '@/lib/bank.service'
import { audit, requestMeta } from '@/lib/audit'

const movementSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST']),
  amount: z.number(), // el signo lo decide el caller: depósito positivo, retiro se manda ya negativo
  description: z.string().min(1),
  reference: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const account = await prisma.bankAccount.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

    const movements = await prisma.bankMovement.findMany({
      where: { bankAccountId: params.id },
      orderBy: { date: 'desc' },
      take: 200,
    })

    return NextResponse.json({ data: movements, account })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const account = await prisma.bankAccount.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

    const data = movementSchema.parse(await req.json())

    const movement = await prisma.$transaction((tx) =>
      recordBankMovement(tx, { companyId: ctx.companyId, bankAccountId: params.id, ...data })
    )

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CREATE', module: 'tesoreria', entityType: 'BankMovement', entityId: movement.id,
      newValues: { type: data.type, amount: data.amount },
    })

    return NextResponse.json({ data: movement, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Error al registrar movimiento' }, { status: 500 })
  }
}
