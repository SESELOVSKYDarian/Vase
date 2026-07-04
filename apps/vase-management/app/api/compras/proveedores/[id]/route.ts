// app/api/compras/proveedores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { purchases: { orderBy: { date: 'desc' }, take: 10 } },
    })
    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    return NextResponse.json({ data: supplier })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const supplier = await prisma.supplier.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

    const updated = await prisma.supplier.update({ where: { id: params.id }, data: body })
    return NextResponse.json({ data: updated, success: true })
  } catch { return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supplier = await prisma.supplier.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

    await prisma.supplier.update({ where: { id: params.id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 }) }
}
