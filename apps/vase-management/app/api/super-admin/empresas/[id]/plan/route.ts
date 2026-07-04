// app/api/super-admin/empresas/[id]/plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireSuperAdmin, handleSuperAdminError } from '@/lib/super-admin'
import { audit, requestMeta } from '@/lib/audit'

const planSchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']),
  reason: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    requireSuperAdmin(session)

    const { plan, reason } = planSchema.parse(await req.json())
    const company = await prisma.company.findUniqueOrThrow({ where: { id: params.id } })

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.company.update({ where: { id: params.id }, data: { plan } })
      await tx.subscriptionEvent.create({
        data: {
          companyId: params.id, type: 'PLAN_CHANGE',
          fromPlan: company.plan, toPlan: plan, reason, performedBy: session.user!.id,
        },
      })
      return c
    })

    await audit({
      ...requestMeta(req),
      companyId: params.id, userId: session.user.id,
      action: 'PLAN_CHANGE', module: 'super-admin', entityType: 'Company', entityId: params.id,
      oldValues: { plan: company.plan }, newValues: { plan },
    })

    return NextResponse.json({ data: updated, success: true })
  } catch (err) {
    const saErr = handleSuperAdminError(err)
    if (saErr) return saErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Error al cambiar plan' }, { status: 500 })
  }
}
