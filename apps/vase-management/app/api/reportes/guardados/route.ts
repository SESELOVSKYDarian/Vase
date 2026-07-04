// app/api/reportes/guardados/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { computeNextRun } from '@/lib/reports/schedule'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entity: z.string().min(1),
  filters: z.any().optional(),
  columns: z.any().optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
  groupBy: z.string().optional(),
  dateRange: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(['TABLE', 'CHART', 'EXCEL', 'PDF']).optional(),
  chartType: z.string().optional(),
  isPublic: z.boolean().optional(),
  isScheduled: z.boolean().optional(),
  schedule: z.object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    dayOfWeek: z.number().optional(),
    dayOfMonth: z.number().optional(),
    time: z.string().optional(),
  }).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))

    const reports = await prisma.savedReport.findMany({
      where: {
        companyId: session.user.companyId,
        ...(entity && { entity }),
        OR: [
          { userId: session.user.id! },
          { isPublic: true },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
        schedules: { where: { isActive: true } },
        executions: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { executions: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    })

    const total = await prisma.savedReport.count({
      where: {
        companyId: session.user.companyId,
        ...(entity && { entity }),
      },
    })

    return NextResponse.json({ data: reports, total, page, limit })
  } catch (err) {
    console.error('[GET /api/reportes/guardados]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const data = createSchema.parse(body)
    const { schedule, ...reportData } = data

    const report = await prisma.savedReport.create({
      data: {
        ...reportData,
        companyId: session.user.companyId,
        userId: session.user.id!,
        dateFrom: reportData.dateFrom ? new Date(reportData.dateFrom) : undefined,
        dateTo: reportData.dateTo ? new Date(reportData.dateTo) : undefined,
        ...(schedule && {
          isScheduled: true,
          schedules: {
            create: {
              ...schedule,
              nextRunAt: computeNextRun(schedule),
            },
          },
        }),
      },
      include: {
        user: { select: { name: true, email: true } },
        schedules: true,
      },
    })

    return NextResponse.json({ data: report, success: true }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/reportes/guardados]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// computeNextRun se movió a lib/reports/schedule.ts (evita duplicación —
// antes había 3 copias de esta misma lógica en el proyecto).
