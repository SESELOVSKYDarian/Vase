// app/api/tesoreria/bancos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'

const accountSchema = z.object({
  bankName: z.string().min(1),
  accountNumber: z.string().optional(),
  cbu: z.string().optional(),
  alias: z.string().optional(),
  currency: z.string().default('ARS'),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const accounts = await prisma.bankAccount.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      orderBy: { bankName: 'asc' },
    })
    return NextResponse.json({ data: accounts })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const data = accountSchema.parse(await req.json())
    const account = await prisma.bankAccount.create({ data: { ...data, companyId: ctx.companyId } })
    return NextResponse.json({ data: account, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 })
  }
}
