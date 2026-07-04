// app/api/distribucion/hoja-ruta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    const sheets = await prisma.deliveryRouteSheet.findMany({
      where: {
        route: { companyId: session.user.companyId },
        ...(date && {
          date: {
            gte: new Date(date + 'T00:00:00'),
            lte: new Date(date + 'T23:59:59'),
          },
        }),
      },
      include: {
        route: { select: { name: true } },
        stops: {
          include: {
            sale: { include: { customer: { select: { name: true, address: true, phone: true } } } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ data: sheets })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { routeId, date, vehicle, saleIds } = body

    const sheet = await prisma.deliveryRouteSheet.create({
      data: {
        routeId,
        date: new Date(date),
        vehicle,
        stops: {
          create: (saleIds as string[]).map((saleId, index) => ({
            saleId,
            order: index,
          })),
        },
      },
      include: { stops: { include: { sale: { include: { customer: true } } } } },
    })

    return NextResponse.json({ data: sheet, success: true }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/distribucion/hoja-ruta]', err)
    return NextResponse.json({ error: 'Error al crear hoja de ruta' }, { status: 500 })
  }
}
