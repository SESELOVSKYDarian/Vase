// app/api/productos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { audit, requestMeta } from '@/lib/audit'
import { requirePermission, handlePermissionError, PERMISSIONS } from '@/lib/permissions'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  familyId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  unit: z.string().optional(),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  ivaRate: z.number().min(0).max(27).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        category: true,
        brand: true,
        family: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20, include: { warehouse: { select: { name: true } } } },
      },
    })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    return NextResponse.json({ data: product })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const existing = await prisma.product.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!existing) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const updated = await prisma.product.update({ where: { id: params.id }, data: parsed.data })

    await audit({
      companyId: session.user.companyId, userId: session.user.id,
      action: 'UPDATE', module: 'productos', entityType: 'Product', entityId: updated.id,
      oldValues: existing as any, newValues: updated as any,
    })

    return NextResponse.json({ data: updated, success: true })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    await requirePermission(session, PERMISSIONS.PRODUCT_DELETE)

    const existing = await prisma.product.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!existing) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    await prisma.product.update({ where: { id: params.id }, data: { isActive: false } })

    await audit({
      ...requestMeta(req),
      companyId: session.user.companyId, userId: session.user.id,
      action: 'DELETE', module: 'productos', entityType: 'Product', entityId: params.id,
      oldValues: existing as any,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const permErr = handlePermissionError(err)
    if (permErr) return permErr
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
