// app/api/tesoreria/cajas-registradoras/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const registers = await prisma.cashRegister.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      include: {
        sessions: { where: { status: 'OPEN' }, take: 1, include: { closing: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      data: registers.map((r) => ({ ...r, currentSession: r.sessions[0] ?? null, sessions: undefined })),
    })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { name, branchId } = await req.json()
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const register = await prisma.cashRegister.create({
      data: { companyId: session.user.companyId, name, branchId },
    })
    return NextResponse.json({ data: register, success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Error al crear' }, { status: 500 }) }
}
