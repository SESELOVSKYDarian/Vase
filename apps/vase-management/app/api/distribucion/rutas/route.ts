// app/api/distribucion/rutas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const routes = await prisma.deliveryRoute.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      include: { _count: { select: { customers: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: routes })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const route = await prisma.deliveryRoute.create({
      data: { ...body, companyId: session.user.companyId },
    })
    return NextResponse.json({ data: route, success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Error al crear' }, { status: 500 }) }
}
