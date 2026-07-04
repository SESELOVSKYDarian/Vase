// app/api/tesoreria/cheques/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { audit, requestMeta } from '@/lib/audit'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'DEPOSITED', 'CLEARED', 'REJECTED', 'DELIVERED']),
  notes: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const existing = await prisma.check.findFirst({ where: { id: params.id, companyId: session.user.companyId } })
    if (!existing) return NextResponse.json({ error: 'Cheque no encontrado' }, { status: 404 })

    const data = updateSchema.parse(await req.json())
    const updated = await prisma.check.update({ where: { id: params.id }, data })

    await audit({
      ...requestMeta(req),
      companyId: session.user.companyId, userId: session.user.id,
      action: 'UPDATE', module: 'tesoreria', entityType: 'Check', entityId: params.id,
      oldValues: { status: existing.status }, newValues: { status: data.status },
    })

    return NextResponse.json({ data: updated, success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
