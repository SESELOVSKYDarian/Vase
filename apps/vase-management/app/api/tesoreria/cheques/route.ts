// app/api/tesoreria/cheques/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { audit, requestMeta } from '@/lib/audit'

const checkSchema = z.object({
  type: z.enum(['RECEIVED', 'ISSUED']),
  number: z.string().min(1),
  bankName: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  amount: z.number().positive(),
  customerId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const checks = await prisma.check.findMany({
      where: {
        companyId: session.user.companyId,
        ...(type && { type }),
        ...(status && { status }),
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    })

    // Enriquecer con nombre de cliente/proveedor (evita N+1 con includes duplicados por tipo opcional)
    const customerIds = checks.filter((c) => c.customerId).map((c) => c.customerId!) as string[]
    const supplierIds = checks.filter((c) => c.supplierId).map((c) => c.supplierId!) as string[]
    const [customers, suppliers] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } }),
      prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } }),
    ])
    const customerMap = new Map(customers.map((c) => [c.id, c.name]))
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]))

    const enriched = checks.map((c) => ({
      ...c,
      partyName: c.customerId ? customerMap.get(c.customerId) : c.supplierId ? supplierMap.get(c.supplierId) : null,
    }))

    const now = new Date()
    const in7d = new Date(now.getTime() + 7 * 864e5)
    const summary = {
      total: checks.length,
      pendingAmount: checks.filter((c) => c.status === 'PENDING').reduce((s, c) => s + Number(c.amount), 0),
      dueThisWeek: checks.filter((c) => c.status === 'PENDING' && c.dueDate >= now && c.dueDate <= in7d).length,
      overdue: checks.filter((c) => c.status === 'PENDING' && c.dueDate < now).length,
    }

    return NextResponse.json({ data: enriched, summary })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const data = checkSchema.parse(await req.json())

    const check = await prisma.check.create({
      data: {
        companyId: ctx.companyId,
        type: data.type,
        number: data.number,
        bankName: data.bankName,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        amount: data.amount,
        customerId: data.customerId,
        supplierId: data.supplierId,
        notes: data.notes,
        status: 'PENDING',
      },
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CREATE', module: 'tesoreria', entityType: 'Check', entityId: check.id,
      newValues: { type: data.type, number: data.number, amount: data.amount },
    })

    return NextResponse.json({ data: check, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al registrar cheque' }, { status: 500 })
  }
}
