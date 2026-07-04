// app/api/super-admin/empresas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, handleSuperAdminError } from '@/lib/super-admin'
import { PLAN_LIMITS } from '@/lib/plan-limits'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    requireSuperAdmin(session)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const planFilter = searchParams.get('plan')
    const statusFilter = searchParams.get('status') // active | suspended

    const companies = await prisma.company.findMany({
      where: {
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(planFilter && { plan: planFilter as any }),
        ...(statusFilter === 'active' && { isActive: true }),
        ...(statusFilter === 'suspended' && { isActive: false }),
      },
      include: {
        _count: { select: { customers: true, products: true, sales: true, companyUsers: true } },
        planOverride: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const enriched = await Promise.all(
      companies.map(async (c) => {
        const invoicesThisMonth = await prisma.invoice.count({
          where: { companyId: c.id, date: { gte: monthStart }, status: { not: 'CANCELLED' } },
        })
        const limits = PLAN_LIMITS[c.plan] ?? PLAN_LIMITS.BASIC
        return {
          id: c.id,
          name: c.name,
          cuit: c.cuit,
          plan: c.plan,
          isActive: c.isActive,
          suspendedAt: c.suspendedAt,
          suspendedReason: c.suspendedReason,
          createdAt: c.createdAt,
          usage: {
            users: c._count.companyUsers,
            products: c._count.products,
            customers: c._count.customers,
            sales: c._count.sales,
            invoicesThisMonth,
          },
          limits: c.planOverride ? {
            maxUsers: c.planOverride.maxUsers ?? limits.maxUsers,
            maxProducts: c.planOverride.maxProducts ?? limits.maxProducts,
            maxCustomers: c.planOverride.maxCustomers ?? limits.maxCustomers,
            maxInvoicesPerMonth: c.planOverride.maxInvoicesPerMonth ?? limits.maxInvoicesPerMonth,
          } : limits,
          hasOverride: !!c.planOverride,
        }
      })
    )

    return NextResponse.json({ data: enriched })
  } catch (err) {
    const saErr = handleSuperAdminError(err)
    if (saErr) return saErr
    console.error('[GET /api/super-admin/empresas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
