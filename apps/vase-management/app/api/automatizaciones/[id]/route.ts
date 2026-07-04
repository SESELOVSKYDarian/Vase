// app/api/automatizaciones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext, handleTenantError, assertSameTenant } from '@/lib/tenant'
import { audit, requestMeta } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const existing = await prisma.automationRule.findUniqueOrThrow({ where: { id: params.id } })
    assertSameTenant(existing.companyId, ctx)

    const body = await req.json()
    const updated = await prisma.automationRule.update({ where: { id: params.id }, data: body })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'UPDATE', module: 'automatizaciones', entityType: 'AutomationRule', entityId: params.id,
      oldValues: { isActive: existing.isActive }, newValues: { isActive: updated.isActive },
    })

    return NextResponse.json({ data: updated, success: true })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const existing = await prisma.automationRule.findUniqueOrThrow({ where: { id: params.id } })
    assertSameTenant(existing.companyId, ctx)

    await prisma.automationRule.delete({ where: { id: params.id } })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'DELETE', module: 'automatizaciones', entityType: 'AutomationRule', entityId: params.id,
      oldValues: { name: existing.name },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
