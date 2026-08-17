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

    const locations = await prisma.warehouseProductLocation.findMany({
      where: { companyId, sectorId, active: true },
      select: {
        id: true,
        rack: true,
        row: true,
        box: true,
        ledNumber: true,
        productId: true,
        product: { select: { id: true, code: true, name: true } }
      },
      orderBy: [{ rack: 'asc' }, { row: 'asc' }]
    })

    // Group by rack
    const racks: Record<string, any[]> = {}
    for (const loc of locations) {
      if (!racks[loc.rack]) racks[loc.rack] = []
      racks[loc.rack].push(loc)
    }

    return NextResponse.json(
      Object.entries(racks).map(([rack, positions]) => ({
        rack,
        positions,
        totalPositions: positions.length,
        assignedLeds: positions.filter(p => p.ledNumber != null).length
      }))
    )
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener racks del sector' }, { status: 500 })
  }
}
