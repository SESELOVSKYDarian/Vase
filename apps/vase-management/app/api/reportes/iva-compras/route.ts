// app/api/reportes/iva-compras/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const companyId = session.user.companyId
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')
    const now = new Date()
    const dateFrom = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const dateTo = to ? new Date(to + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const data = await prisma.purchase.findMany({
      where: { companyId, date: { gte: dateFrom, lte: dateTo } },
      include: { supplier: { select: { name: true, documentNumber: true } } },
      orderBy: { date: 'asc' },
    })

    const totals = data.reduce((acc: any, p: any) => ({
      subtotal: acc.subtotal + Number(p.subtotal),
      iva: acc.iva + Number(p.ivaAmount),
      total: acc.total + Number(p.total),
    }), { subtotal: 0, iva: 0, total: 0 })

    return NextResponse.json({ data, totals, count: data.length })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
