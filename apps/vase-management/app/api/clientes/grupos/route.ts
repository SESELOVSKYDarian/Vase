// app/api/clientes/grupos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const groups = await prisma.customerGroup.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      include: { _count: { select: { customers: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: groups })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const group = await prisma.customerGroup.create({
      data: { ...body, companyId: session.user.companyId },
    })
    return NextResponse.json({ data: group, success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Error al crear' }, { status: 500 }) }
}
