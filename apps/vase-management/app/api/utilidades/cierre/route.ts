// app/api/utilidades/cierre/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit, requestMeta } from '@/lib/audit'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { requirePermission, handlePermissionError, PERMISSIONS } from '@/lib/permissions'
import { reconstructCustomerBalance, reconstructSupplierBalance } from '@/lib/ledger.service'
import { reconstructProductStock } from '@/lib/stock.service'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const processes = await prisma.closingProcess.findMany({
      where: { companyId: session.user.companyId },
      include: { user: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({ data: processes })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    // Cerrar período es una de las acciones más críticas del sistema:
    // bloquea la posibilidad de modificar comprobantes retroactivamente.
    await requirePermission(session, PERMISSIONS.PERIOD_CLOSE)

    const body = await req.json()
    const { type } = body // DAY, MONTH, YEAR

    const process = await prisma.closingProcess.create({
      data: { companyId: ctx.companyId, userId: ctx.userId, type, status: 'RUNNING' },
    })

    const results: Record<string, any> = {}

    try {
      const now = new Date()

      if (type === 'DAY') {
        // Cierre de caja diaria: si hay sesiones de CashRegister abiertas,
        // NO se cierran automáticamente acá (eso requiere arqueo físico
        // manual vía /api/tesoreria/caja/sesiones/[id]/cerrar). Este proceso
        // solo genera el resumen consolidado del día para auditoría.
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const movements = await prisma.cashMovement.findMany({
          where: { companyId: ctx.companyId, date: { gte: todayStart } },
        })
        const income = movements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + Number(m.amount), 0)
        const expense = movements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + Number(m.amount), 0)
        const sales = await prisma.sale.count({ where: { companyId: ctx.companyId, date: { gte: todayStart } } })
        const openSessions = await prisma.cashSession.count({
          where: { cashRegister: { companyId: ctx.companyId }, status: 'OPEN' },
        })

        results.cashSummary = { income, expense, balance: income - expense, movementCount: movements.length, salesCount: sales }
        if (openSessions > 0) {
          results.warning = `Hay ${openSessions} sesión(es) de caja sin cerrar formalmente. El cierre de día NO las cierra automáticamente.`
        }
      }

      if (type === 'MONTH') {
        // Recalcular saldos vía el ledger real (fuente de verdad = movimientos),
        // no vía un conteo aproximado de facturas sueltas como antes.
        const customers = await prisma.customer.findMany({ where: { companyId: ctx.companyId } })
        let updatedCustomers = 0
        for (const c of customers) {
          const reconstructed = await reconstructCustomerBalance(c.id)
          if (Math.abs(reconstructed - Number(c.totalDebt)) > 0.01) {
            await prisma.customer.update({ where: { id: c.id }, data: { totalDebt: reconstructed } })
            updatedCustomers++
          }
        }

        const suppliers = await prisma.supplier.findMany({ where: { companyId: ctx.companyId } })
        let updatedSuppliers = 0
        for (const s of suppliers) {
          const reconstructed = await reconstructSupplierBalance(s.id)
          if (Math.abs(reconstructed - Number(s.totalDebt)) > 0.01) {
            await prisma.supplier.update({ where: { id: s.id }, data: { totalDebt: reconstructed } })
            updatedSuppliers++
          }
        }

        results.recalculatedCustomers = updatedCustomers
        results.recalculatedSuppliers = updatedSuppliers

        // Marcar período fiscal como cerrado — a partir de acá, cualquier
        // intento de crear/anular comprobantes con fecha dentro de este mes
        // será rechazado por lib/fiscal-period.ts (assertPeriodOpen).
        await prisma.fiscalPeriod.upsert({
          where: { companyId_year_month: { companyId: ctx.companyId, year: now.getFullYear(), month: now.getMonth() + 1 } },
          update: { status: 'CLOSED', closedAt: now, closedById: ctx.userId },
          create: {
            companyId: ctx.companyId, year: now.getFullYear(), month: now.getMonth() + 1,
            status: 'CLOSED', closedAt: now, closedById: ctx.userId,
          },
        })
        results.periodClosed = `${now.getMonth() + 1}/${now.getFullYear()}`
      }

      if (type === 'YEAR') {
        // Recalcular stock vía el servicio único (misma fuente de verdad que
        // usan ventas/compras/ajustes/transferencias), no una copia local del cálculo.
        const products = await prisma.product.findMany({ where: { companyId: ctx.companyId } })
        let recalculated = 0
        await prisma.$transaction(async (tx) => {
          for (const p of products) {
            const stock = await reconstructProductStock(tx, p.id)
            if (Math.abs(stock - Number(p.stock)) > 0.001) {
              await tx.product.update({ where: { id: p.id }, data: { stock } })
              recalculated++
            }
          }
        })
        results.recalculatedProducts = recalculated
      }

      const completed = await prisma.closingProcess.update({
        where: { id: process.id },
        data: { status: 'COMPLETED', completedAt: new Date(), results },
      })

      await audit({
        ...requestMeta(req),
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: 'CLOSE_PERIOD',
        module: 'utilidades',
        entityType: 'ClosingProcess',
        entityId: process.id,
        newValues: { type, results },
      })

      return NextResponse.json({ data: completed, success: true })
    } catch (procErr: any) {
      await prisma.closingProcess.update({
        where: { id: process.id },
        data: { status: 'FAILED', errors: { message: procErr.message } },
      })
      throw procErr
    }
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    const permErr = handlePermissionError(err)
    if (permErr) return permErr
    console.error('[POST /api/utilidades/cierre]', err)
    return NextResponse.json({ error: 'Error en el proceso de cierre' }, { status: 500 })
  }
}
