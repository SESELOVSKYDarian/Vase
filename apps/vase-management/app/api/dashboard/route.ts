// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const companyId = session.user.companyId
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      salesThisMonth,
      salesLastMonth,
      invoicesThisMonth,
      purchasesThisMonth,
      cashIncome,
      cashExpense,
      lowStockCount,
      activeCustomers,
      totalProducts,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { companyId, date: { gte: startOfMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
        _sum: { total: true }, _count: true,
      }),
      prisma.sale.aggregate({
        where: { companyId, date: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { companyId, date: { gte: startOfMonth }, status: 'AUTHORIZED' },
        _sum: { total: true }, _count: true,
      }),
      prisma.purchase.aggregate({
        where: { companyId, date: { gte: startOfMonth } },
        _sum: { total: true }, _count: true,
      }),
      prisma.cashMovement.aggregate({
        where: { companyId, type: 'INCOME', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { companyId, type: 'EXPENSE', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.product.count({
        where: { companyId, isActive: true, stock: { lte: 5 } },
      }),
      prisma.customer.count({ where: { companyId, isActive: true } }),
      prisma.product.count({ where: { companyId, isActive: true } }),
    ])

    return NextResponse.json({
      salesAmount: Number(salesThisMonth._sum.total ?? 0),
      salesCount: salesThisMonth._count,
      salesLastMonth: Number(salesLastMonth._sum.total ?? 0),
      invoicesAmount: Number(invoicesThisMonth._sum.total ?? 0),
      invoicesCount: invoicesThisMonth._count,
      purchasesAmount: Number(purchasesThisMonth._sum.total ?? 0),
      cashBalance: Number(cashIncome._sum.amount ?? 0) - Number(cashExpense._sum.amount ?? 0),
      lowStockCount,
      activeCustomers,
      totalProducts,
    })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
