// app/api/alertas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const alert = await prisma.systemAlert.update({
      where: { id: params.id },
      data: {
        ...(body.isRead !== undefined && { isRead: body.isRead }),
        ...(body.isDismissed !== undefined && { isDismissed: body.isDismissed }),
      },
    })
    return NextResponse.json({ data: alert, success: true })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
