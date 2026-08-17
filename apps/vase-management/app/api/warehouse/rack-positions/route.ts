import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const body = await req.json()
    if (!body?.sectorId || !body?.rack || !body?.row || !body?.productId) {
      return NextResponse.json({ error: 'sectorId, rack, row y productId son requeridos' }, { status: 400 })
    }

    const location = await prisma.warehouseProductLocation.upsert({
      where: { companyId_productId: { companyId, productId: body.productId } },
      create: {
        companyId,
        productId: body.productId,
        sectorId: body.sectorId,
        rack: String(body.rack),
        row: String(body.row),
        box: body.box !== undefined && body.box !== null ? String(body.box) : null,
        ledNumber: body.ledNumber !== undefined && body.ledNumber !== null ? Number(body.ledNumber) : null,
        active: true,
      },
      update: {
        sectorId: body.sectorId,
        rack: String(body.rack),
        row: String(body.row),
        box: body.box !== undefined && body.box !== null ? String(body.box) : null,
        ledNumber: body.ledNumber !== undefined && body.ledNumber !== null ? Number(body.ledNumber) : null,
        active: true,
      },
      include: { sector: true, product: { select: { id: true, code: true, name: true } } }
    })

    return NextResponse.json(location)
  } catch (error) {
    return NextResponse.json({ error: 'Error al asignar posición de rack' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const body = await req.json()
    if (!body?.productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 })
    }

    const existing = await prisma.warehouseProductLocation.findUnique({
      where: { companyId_productId: { companyId, productId: body.productId } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })
    }

    const location = await prisma.warehouseProductLocation.update({
      where: { companyId_productId: { companyId, productId: body.productId } },
      data: { active: false }
    })

    return NextResponse.json(location)
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar ubicación' }, { status: 500 })
  }
}
