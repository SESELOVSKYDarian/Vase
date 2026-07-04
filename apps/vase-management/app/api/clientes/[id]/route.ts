// app/api/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { audit, requestMeta } from '@/lib/audit'
import { requirePermission, handlePermissionError, PERMISSIONS } from '@/lib/permissions'
import { Prisma } from '@prisma/client'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  documentType: z.enum(['CUIT', 'CUIL', 'DNI', 'PASSPORT', 'OTHER']).optional(),
  documentNumber: z.string().optional().nullable(),
  ivaCondition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_RESPONSABLE', 'SUJETO_NO_CATEGORIZADO']).optional(),
  groupId: z.string().optional().nullable(),
  zoneId: z.string().optional().nullable(),
  deliveryRouteId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  birthDate: z.string().optional().nullable(),
  creditLimit: z.number().min(0).optional().nullable(),
  creditRisk: z.enum(['BAJO', 'MEDIO', 'ALTO', 'BLOQUEADO']).optional(),
  sector: z.string().optional().nullable(),
  activity: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

async function getCustomer(id: string, companyId: string) {
  return prisma.customer.findFirst({ where: { id, companyId } })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        group: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        deliveryRoute: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
        sales: {
          orderBy: { date: 'desc' },
          take: 10,
          select: { id: true, number: true, type: true, status: true, date: true, total: true },
        },
      },
    })

    if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    return NextResponse.json({ data: customer })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const existing = await getCustomer(params.id, session.user.companyId)
    if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const { birthDate, creditLimit, ...rest } = parsed.data
    const data: Prisma.CustomerUncheckedUpdateInput = {
      ...rest,
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(creditLimit !== undefined && { creditLimit: creditLimit ?? 0 }),
    }
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data,
    })

    await audit({
      companyId: session.user.companyId, userId: session.user.id,
      action: 'UPDATE', module: 'clientes', entityType: 'Customer', entityId: updated.id,
      oldValues: existing as any, newValues: updated as any,
    })

    return NextResponse.json({ data: updated, success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Eliminar clientes es acción crítica listada explícitamente en las
    // reglas de negocio: requiere permiso customer.delete, no alcanza con
    // que el botón esté visible en el frontend.
    await requirePermission(session, PERMISSIONS.CUSTOMER_DELETE)

    const existing = await getCustomer(params.id, session.user.companyId)
    if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Soft delete — nunca eliminar físicamente un cliente con movimientos
    await prisma.customer.update({ where: { id: params.id }, data: { isActive: false } })

    await audit({
      ...requestMeta(req),
      companyId: session.user.companyId, userId: session.user.id,
      action: 'DELETE', module: 'clientes', entityType: 'Customer', entityId: params.id,
      oldValues: existing as any,
    })

    return NextResponse.json({ success: true, message: 'Cliente eliminado' })
  } catch (err) {
    const permErr = handlePermissionError(err)
    if (permErr) return permErr
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
