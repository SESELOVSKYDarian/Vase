// app/api/productos/marcas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const updated = await prisma.brand.update({ where: { id: params.id }, data: body })
    return NextResponse.json({ data: updated, success: true })
  } catch { return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    await prisma.brand.update({ where: { id: params.id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 }) }
}
