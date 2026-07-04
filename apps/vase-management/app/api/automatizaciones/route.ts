// app/api/automatizaciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { audit, requestMeta } from '@/lib/audit'

const actionSchema = z.object({
  type: z.enum(['CREATE_ALERT', 'WEBHOOK', 'SEND_EMAIL']),
  title: z.string().optional(),
  message: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  url: z.string().url().optional(),
  to: z.string().email().optional(),
  subject: z.string().optional(),
})

const ruleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(['LOW_STOCK', 'INVOICE_OVERDUE', 'NEW_CUSTOMER', 'PRODUCT_EXPIRING', 'CREDIT_LIMIT_EXCEEDED', 'SALE_CREATED']),
  conditions: z.record(z.number()).optional(),
  actions: z.array(actionSchema).min(1),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const rules = await prisma.automationRule.findMany({
      where: { companyId: ctx.companyId },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: rules })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const data = ruleSchema.parse(await req.json())

    const rule = await prisma.automationRule.create({
      data: { ...data, companyId: ctx.companyId, createdById: ctx.userId },
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CREATE', module: 'automatizaciones', entityType: 'AutomationRule', entityId: rule.id,
      newValues: { name: rule.name, trigger: rule.trigger },
    })

    return NextResponse.json({ data: rule, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/automatizaciones]', err)
    return NextResponse.json({ error: 'Error al crear regla' }, { status: 500 })
  }
}
