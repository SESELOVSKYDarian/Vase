// app/api/facturacion/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        customer: true,
        items: true,
        user: { select: { name: true } },
        company: true,
        pointOfSale: true,
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    return NextResponse.json({ data: invoice })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    })
    if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (invoice.status === 'AUTHORIZED') {
      return NextResponse.json({ error: 'No se puede eliminar una factura autorizada por AFIP' }, { status: 400 })
    }

    await prisma.invoice.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al anular' }, { status: 500 })
  }
}
