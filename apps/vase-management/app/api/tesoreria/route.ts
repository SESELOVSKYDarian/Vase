// app/api/tesoreria/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'

const movSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.string().optional(),
  amount: z.number().positive(),
  description: z.string().min(2),
  date: z.string(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO', 'CHECK', 'OTHER']),
  reference: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId
    const type = req.nextUrl.searchParams.get('tipo')
    const method = req.nextUrl.searchParams.get('method')
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    const where: any = {
      companyId,
      ...(type && { type }),
      ...(method && { method }),
      ...(from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to + 'T23:59:59') }),
        },
      },
    }

    const [data, total, summary] = await Promise.all([
      prisma.cashMovement.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cashMovement.count({ where }),
      prisma.cashMovement.groupBy({
        by: ['type'],
        where: { companyId, ...(from || to) && { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to + 'T23:59:59') }) } } },
        _sum: { amount: true },
      }),
    ])

    const income = summary.find((s: any) => s.type === 'INCOME')?._sum?.amount ?? 0
    const expense = summary.find((s: any) => s.type === 'EXPENSE')?._sum?.amount ?? 0

    return NextResponse.json({
      data, total, page, limit,
      totalPages: Math.ceil(total / limit),
      summary: { income: Number(income), expense: Number(expense), balance: Number(income) - Number(expense) },
    })
  } catch (err) {
    console.error('[GET /api/tesoreria]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const parsed = movSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const data = await prisma.cashMovement.create({
      data: { ...parsed.data, companyId: session.user.companyId, date: new Date(parsed.data.date) },
    })
    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/tesoreria]', err)
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 })
  }
}
