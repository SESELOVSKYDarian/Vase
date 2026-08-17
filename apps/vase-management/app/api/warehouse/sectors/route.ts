import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const sectors = await prisma.warehouseSector.findMany({
      where: { companyId, active: true },
      include: { _count: { select: { locations: true } } },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(sectors)
  } catch (error) {
    return NextResponse.json({ error: 'Error al listar sectores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const body = await req.json()
    if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const normalizedName = body.name.trim().toLowerCase().replace(/\s+/g, '_')
    const sector = await prisma.warehouseSector.create({
      data: {
        companyId,
        name: body.name.trim(),
        normalizedName,
        description: body.description ?? null
      }
    })

    return NextResponse.json(sector, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear sector' }, { status: 500 })
  }
}
