// app/api/ventas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sale = await prisma.sale.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, code: true, unit: true } } } },
        invoices: true,
        payments: true,
        user: { select: { name: true } },
      },
    })
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    return NextResponse.json({ data: sale })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sale = await prisma.sale.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })

    const { status, notes } = await req.json()
    const updated = await prisma.sale.update({
      where: { id: params.id },
      data: { ...(status && { status }), ...(notes !== undefined && { notes }) },
    })
    return NextResponse.json({ data: updated, success: true })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sale = await prisma.sale.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    if (sale.status === 'INVOICED') return NextResponse.json({ error: 'No se puede eliminar una venta facturada' }, { status: 400 })

    await prisma.sale.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al cancelar venta' }, { status: 500 })
  }
}
