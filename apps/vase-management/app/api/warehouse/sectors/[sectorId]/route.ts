import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { sectorId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId
    const { sectorId } = params

    const sector = await prisma.warehouseSector.findFirst({
      where: { id: sectorId, companyId },
      include: {
        locations: {
          where: { active: true },
          include: { product: { select: { id: true, code: true, name: true } } },
          orderBy: [{ rack: 'asc' }, { row: 'asc' }]
        }
      }
    })

    if (!sector) {
      return NextResponse.json({ error: 'Sector no encontrado' }, { status: 404 })
    }

    return NextResponse.json(sector)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener sector' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { sectorId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId
    const { sectorId } = params

    const existing = await prisma.warehouseSector.findFirst({
      where: { id: sectorId, companyId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Sector no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const dataToUpdate: { name?: string; normalizedName?: string; description?: string | null } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      }
      dataToUpdate.name = body.name.trim()
      dataToUpdate.normalizedName = body.name.trim().toLowerCase().replace(/\s+/g, '_')
    }

    if (body.description !== undefined) {
      dataToUpdate.description = body.description
    }

    const updated = await prisma.warehouseSector.update({
      where: { id: sectorId },
      data: dataToUpdate
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar sector' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sectorId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId
    const { sectorId } = params

    const existing = await prisma.warehouseSector.findFirst({
      where: { id: sectorId, companyId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Sector no encontrado' }, { status: 404 })
    }

    const deleted = await prisma.warehouseSector.update({
      where: { id: sectorId },
      data: { active: false }
    })

    return NextResponse.json(deleted)
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar sector' }, { status: 500 })
  }
}
