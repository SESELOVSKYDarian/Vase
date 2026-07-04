// app/api/configuracion/sucursales/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const branches = await prisma.branch.findMany({
      where: { companyId: session.user.companyId },
      include: { pointsOfSale: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ data: branches })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const branch = await prisma.branch.create({
      data: { ...body, companyId: session.user.companyId },
    })
    return NextResponse.json({ data: branch, success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Error al crear' }, { status: 500 }) }
}
