// app/api/super-admin/empresas/[id]/suspender/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireSuperAdmin, handleSuperAdminError } from '@/lib/super-admin'
import { audit, requestMeta } from '@/lib/audit'

const suspendSchema = z.object({
  action: z.enum(['SUSPEND', 'REACTIVATE']),
  reason: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    requireSuperAdmin(session)

    const { action, reason } = suspendSchema.parse(await req.json())

    const company = await prisma.company.findUniqueOrThrow({ where: { id: params.id } })

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.company.update({
        where: { id: params.id },
        data: action === 'SUSPEND'
          ? { isActive: false, suspendedAt: new Date(), suspendedReason: reason }
          : { isActive: true, suspendedAt: null, suspendedReason: null },
      })

      await tx.subscriptionEvent.create({
        data: {
          companyId: params.id,
          type: action === 'SUSPEND' ? 'SUSPENDED' : 'REACTIVATED',
          reason,
          performedBy: session.user!.id,
        },
      })

      return c
    })

    await audit({
      ...requestMeta(req),
      companyId: params.id, userId: session.user.id,
      action: action === 'SUSPEND' ? 'SUSPEND_COMPANY' : 'REACTIVATE_COMPANY',
      module: 'super-admin', entityType: 'Company', entityId: params.id,
      oldValues: { isActive: company.isActive }, newValues: { isActive: updated.isActive, reason },
    })

    return NextResponse.json({ data: updated, success: true })
  } catch (err) {
    const saErr = handleSuperAdminError(err)
    if (saErr) return saErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    console.error('[POST /api/super-admin/empresas/[id]/suspender]', err)
    return NextResponse.json({ error: 'Error al actualizar empresa' }, { status: 500 })
  }
}
