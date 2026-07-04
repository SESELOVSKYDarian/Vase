// app/api/reportes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const companyId = session.user.companyId
    const tipo = req.nextUrl.searchParams.get('tipo') ?? 'ventas_mes'
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    const now = new Date()
    const dateFrom = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const dateTo = to ? new Date(to + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    switch (tipo) {
      case 'ventas_mes': {
        const sales = await prisma.sale.findMany({
          where: { companyId, date: { gte: dateFrom, lte: dateTo }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
          include: { customer: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
          orderBy: { date: 'desc' },
        })
        const totalAmount = sales.reduce((s: number, v: any) => s + Number(v.total), 0)
        const byDay = groupByDay(sales, dateFrom, dateTo)
        return NextResponse.json({ data: sales, total: sales.length, totalAmount, byDay })
      }

      case 'productos_top': {
        const items = await prisma.saleItem.groupBy({
          by: ['productId'],
          where: { sale: { companyId, date: { gte: dateFrom, lte: dateTo }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } } },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 15,
        })
        const productIds = items.map((i: any) => i.productId)
        const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, code: true } })
        const data = items.map((i: any) => ({
          ...i,
          product: products.find((p) => p.id === i.productId),
          revenue: Number(i._sum.total ?? 0),
          quantity: Number(i._sum.quantity ?? 0),
        }))
        return NextResponse.json({ data })
      }

      case 'clientes_top': {
        const grouped = await prisma.sale.groupBy({
          by: ['customerId'],
          where: { companyId, date: { gte: dateFrom, lte: dateTo }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] }, customerId: { not: null } },
          _sum: { total: true },
          _count: true,
          orderBy: { _sum: { total: 'desc' } },
          take: 10,
        })
        const customerIds = grouped.map((g: any) => g.customerId).filter(Boolean) as string[]
        const customers = await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, documentNumber: true } })
        const data = grouped.map((g: any) => ({
          ...g,
          customer: customers.find((c) => c.id === g.customerId),
          total: Number(g._sum.total ?? 0),
        }))
        return NextResponse.json({ data })
      }

      case 'stock_critico': {
        const data = await prisma.product.findMany({
          where: { companyId, isActive: true },
          include: { category: { select: { name: true } } },
          orderBy: { stock: 'asc' },
        })
        const critical = data.filter((p: any) => Number(p.stock) <= Number(p.minStock))
        return NextResponse.json({ data: critical, total: critical.length })
      }

      case 'iva_ventas': {
        const invoices = await prisma.invoice.findMany({
          where: { companyId, type: 'INVOICE', date: { gte: dateFrom, lte: dateTo }, status: 'AUTHORIZED' },
          include: { customer: { select: { name: true, documentNumber: true, ivaCondition: true } }, items: true },
          orderBy: { date: 'asc' },
        })
        const totals = invoices.reduce((acc: any, inv: any) => ({
          subtotal: acc.subtotal + Number(inv.subtotal),
          iva: acc.iva + Number(inv.ivaAmount),
          total: acc.total + Number(inv.total),
        }), { subtotal: 0, iva: 0, total: 0 })
        return NextResponse.json({ data: invoices, totals, count: invoices.length })
      }

      case 'cuentas_cobrar': {
        const data = await prisma.sale.findMany({
          where: { companyId, status: { in: ['INVOICED', 'DELIVERED'] } },
          include: { customer: { select: { name: true } } },
          orderBy: { date: 'asc' },
        })
        const pending = data.filter((s: any) => Number(s.paidAmount) < Number(s.total))
        const totalPending = pending.reduce((sum: number, s: any) => sum + Number(s.total) - Number(s.paidAmount), 0)
        return NextResponse.json({ data: pending, totalPending })
      }

      case 'flujo_caja': {
        const [income, expense] = await Promise.all([
          prisma.cashMovement.findMany({ where: { companyId, type: 'INCOME', date: { gte: dateFrom, lte: dateTo } }, orderBy: { date: 'asc' } }),
          prisma.cashMovement.findMany({ where: { companyId, type: 'EXPENSE', date: { gte: dateFrom, lte: dateTo } }, orderBy: { date: 'asc' } }),
        ])
        const totalIncome = income.reduce((s: number, m: any) => s + Number(m.amount), 0)
        const totalExpense = expense.reduce((s: number, m: any) => s + Number(m.amount), 0)
        return NextResponse.json({ income, expense, totalIncome, totalExpense, balance: totalIncome - totalExpense })
      }

      default:
        return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 })
    }
  } catch (err) {
    console.error('[GET /api/reportes]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function groupByDay(items: any[], from: Date, to: Date) {
  const days: Record<string, number> = {}
  const cur = new Date(from)
  while (cur <= to) {
    const key = cur.toISOString().slice(0, 10)
    days[key] = 0
    cur.setDate(cur.getDate() + 1)
  }
  for (const item of items) {
    const key = new Date(item.date).toISOString().slice(0, 10)
    if (key in days) days[key] += Number(item.total)
  }
  return Object.entries(days).map(([date, total]) => ({ date, total }))
}
