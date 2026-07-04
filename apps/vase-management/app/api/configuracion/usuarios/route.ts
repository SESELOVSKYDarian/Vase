// app/api/configuracion/usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requirePlanLimit, handlePlanLimitError } from '@/lib/plan-limits'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId: session.user.companyId },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } })

    return NextResponse.json({ data: companyUsers, roles })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { email, name, password, roleId } = body

    await requirePlanLimit(session.user.companyId, 'users')

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const hashedPassword = await bcrypt.hash(password ?? 'temporal123', 10)
      user = await prisma.user.create({
        data: { email, name, password: hashedPassword },
      })
    }

    const existing = await prisma.companyUser.findUnique({
      where: { companyId_userId: { companyId: session.user.companyId, userId: user.id } },
    })
    if (existing) return NextResponse.json({ error: 'El usuario ya pertenece a esta empresa' }, { status: 400 })

    const companyUser = await prisma.companyUser.create({
      data: { companyId: session.user.companyId, userId: user.id, roleId },
      include: { user: { select: { name: true, email: true } }, role: true },
    })

    return NextResponse.json({ data: companyUser, success: true }, { status: 201 })
  } catch (err) {
    const limitErr = handlePlanLimitError(err)
    if (limitErr) return limitErr
    console.error('[POST /api/configuracion/usuarios]', err)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
