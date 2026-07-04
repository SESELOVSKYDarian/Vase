// app/api/distribucion/paradas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const stop = await prisma.deliveryStop.update({
      where: { id: params.id },
      data: {
        status: body.status,
        notes: body.notes,
        signature: body.signature,
        ...(body.status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    })

    return NextResponse.json({ data: stop, success: true })
  } catch { return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 }) }
}
