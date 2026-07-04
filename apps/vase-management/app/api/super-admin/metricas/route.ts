// app/api/super-admin/metricas/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, handleSuperAdminError } from '@/lib/super-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    requireSuperAdmin(session)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const last30Days = new Date(now.getTime() - 30 * 864e5)

    const [
      totalCompanies, activeCompanies, suspendedCompanies,
      companiesByPlan, totalUsers, invoicesThisMonth,
      salesThisMonth, newCompaniesLast30d, recentEvents,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.company.count({ where: { isActive: false } }),
      prisma.company.groupBy({ by: ['plan'], _count: true }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.invoice.count({ where: { date: { gte: monthStart }, status: { not: 'CANCELLED' } } }),
      prisma.sale.aggregate({ where: { date: { gte: monthStart } }, _sum: { total: true }, _count: true }),
      prisma.company.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.subscriptionEvent.findMany({
        orderBy: { createdAt: 'desc' }, take: 20,
        include: { company: { select: { name: true } } },
      }),
    ])

    return NextResponse.json({
      data: {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          suspended: suspendedCompanies,
          newLast30Days: newCompaniesLast30d,
          byPlan: companiesByPlan.map((p) => ({ plan: p.plan, count: p._count })),
        },
        usage: {
          totalUsers,
          invoicesThisMonth,
          salesThisMonth: salesThisMonth._count,
          salesAmountThisMonth: Number(salesThisMonth._sum.total ?? 0),
        },
        recentEvents,
      },
    })
  } catch (err) {
    const saErr = handleSuperAdminError(err)
    if (saErr) return saErr
    console.error('[GET /api/super-admin/metricas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
