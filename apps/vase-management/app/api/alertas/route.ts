// app/api/alertas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAlerts } from '@/lib/alerts/system-alerts'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))

    const alerts = await prisma.systemAlert.findMany({
      where: {
        companyId: session.user.companyId,
        isDismissed: false,
        ...(unreadOnly && { isRead: false }),
        ...(type && { type: type as any }),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })

    const unreadCount = await prisma.systemAlert.count({
      where: { companyId: session.user.companyId, isRead: false, isDismissed: false },
    })

    return NextResponse.json({ data: alerts, unreadCount })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/alertas → generar alertas automáticas
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const created = await generateAlerts(session.user.companyId)
    return NextResponse.json({ created, success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al generar alertas' }, { status: 500 })
  }
}
