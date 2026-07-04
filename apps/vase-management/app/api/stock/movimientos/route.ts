// app/api/stock/movimientos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId
    const productId = req.nextUrl.searchParams.get('productId')

    const where: any = { companyId, ...(productId && { productId }) }

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, code: true, unit: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}
