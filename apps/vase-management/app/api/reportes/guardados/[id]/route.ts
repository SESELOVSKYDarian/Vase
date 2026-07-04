// app/api/reportes/guardados/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { executeReport } from '@/lib/reports/executor'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const report = await prisma.savedReport.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        user: { select: { name: true, email: true } },
        schedules: true,
        executions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    return NextResponse.json({ data: report })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const report = await prisma.savedReport.update({
      where: { id: params.id },
      data: {
        ...body,
        dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
        dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
      },
    })
    return NextResponse.json({ data: report, success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    await prisma.savedReport.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}

// POST /api/reportes/guardados/[id] → ejecutar reporte
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const report = await prisma.savedReport.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    })
    if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

    const execution = await prisma.reportExecution.create({
      data: { reportId: params.id, status: 'RUNNING' },
    })

    try {
      const start = Date.now()
      const result = await executeReport(report, session.user.companyId)
      const duration = Date.now() - start

      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          rowCount: result.rows?.length ?? 0,
          duration,
        },
      })

      return NextResponse.json({ data: result, executionId: execution.id, duration })
    } catch (execErr: any) {
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', error: execErr.message },
      })
      throw execErr
    }
  } catch (err) {
    console.error('[POST /api/reportes/guardados/[id]]', err)
    return NextResponse.json({ error: 'Error al ejecutar reporte' }, { status: 500 })
  }
}
