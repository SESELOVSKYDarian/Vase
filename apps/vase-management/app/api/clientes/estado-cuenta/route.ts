// app/api/clientes/estado-cuenta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!customerId) return NextResponse.json({ error: 'customerId requerido' }, { status: 400 })

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const [customer, invoices, payments] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, companyId: session.user.companyId },
        include: { group: true, zone: true },
      }),
      prisma.invoice.findMany({
        where: {
          customerId,
          companyId: session.user.companyId,
          ...(Object.keys(dateFilter).length && { date: dateFilter }),
        },
        orderBy: { date: 'asc' },
      }),
      prisma.payment.findMany({
        where: {
          companyId: session.user.companyId,
          type: 'INCOME',
          sale: { customerId },
          ...(Object.keys(dateFilter).length && { date: dateFilter }),
        },
        orderBy: { date: 'asc' },
      }),
    ])

    if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Construir extracto de cuenta corriente
    let runningBalance = 0
    const movements: any[] = []

    const allItems = [
      ...invoices.map(inv => ({
        date: inv.date,
        type: 'FACTURA',
        number: `F${inv.letter}${inv.number}`,
        debe: Number(inv.total),
        haber: 0,
        status: inv.status,
        id: inv.id,
      })),
      ...payments.map(pay => ({
        date: pay.date,
        type: 'COBRO',
        number: pay.reference ?? '',
        debe: 0,
        haber: Number(pay.amount),
        status: 'PAID',
        id: pay.id,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    for (const item of allItems) {
      runningBalance = runningBalance + item.debe - item.haber
      movements.push({ ...item, saldo: runningBalance, date: item.date.toISOString().slice(0, 10) })
    }

    const totals = {
      totalFacturado: invoices.reduce((s, i) => s + Number(i.total), 0),
      totalCobrado: payments.reduce((s, p) => s + Number(p.amount), 0),
      saldoPendiente: Number(customer.totalDebt),
      creditLimit: Number(customer.creditLimit),
      available: Number(customer.creditLimit) - Number(customer.totalDebt),
    }

    return NextResponse.json({ customer, movements, totals })
  } catch (err) {
    console.error('[GET /api/clientes/estado-cuenta]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
