// app/api/productos/categorias/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const data = await prisma.category.findMany({ where: { companyId: session.user.companyId, isActive: true }, orderBy: { name: 'asc' } })
    return NextResponse.json({ data })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { name, description } = await req.json()
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    const data = await prisma.category.create({ data: { companyId: session.user.companyId, name, description } })
    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Error al crear' }, { status: 500 }) }
}
