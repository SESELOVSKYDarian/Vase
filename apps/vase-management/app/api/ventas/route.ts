// app/api/ventas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'
import { audit, requestMeta } from '@/lib/audit'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { applyStockMovement, InsufficientStockError } from '@/lib/stock.service'
import { consumeBatchesFefo } from '@/lib/batch.service'
import { recordCustomerMovement } from '@/lib/ledger.service'
import { assertPeriodOpen, handlePeriodClosedError } from '@/lib/fiscal-period'

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).default(0),
  ivaRate: z.number().min(0).max(27),
  subtotal: z.number(),
  ivaAmount: z.number(),
  total: z.number(),
})

const saleSchema = z.object({
  customerId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  type: z.enum(['BUDGET', 'ORDER', 'REMITO', 'SALE']).default('SALE'),
  date: z.string(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Se requiere al menos un ítem'),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit, search, orderDir } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId
    const tipo = req.nextUrl.searchParams.get('tipo')
    const status = req.nextUrl.searchParams.get('status')

    const where: any = {
      companyId,
      ...(tipo && { type: tipo }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { number: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, documentNumber: true, address: true, phone: true } },
          items: { include: { product: { select: { name: true, code: true } } } },
          user: { select: { name: true } },
        },
        orderBy: { date: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[GET /api/ventas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const body = await req.json()
    const parsed = saleSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const companyId = ctx.companyId

    // Validar tenant de referencias entrantes (nunca confiar en IDs del body sin chequear)
    if (parsed.data.customerId) {
      const c = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId } })
      if (!c) return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })
    }
    for (const item of parsed.data.items) {
      const p = await prisma.product.findFirst({ where: { id: item.productId, companyId } })
      if (!p) return NextResponse.json({ error: `Producto inválido: ${item.productId}` }, { status: 400 })
    }

    // No se puede cargar un comprobante con fecha dentro de un período ya cerrado
    await assertPeriodOpen(companyId, new Date(parsed.data.date))

    const count = await prisma.sale.count({ where: { companyId, type: parsed.data.type } })
    const prefix = { BUDGET: 'PRE', ORDER: 'PED', REMITO: 'REM', SALE: 'V' }[parsed.data.type]
    const number = `${prefix}-${String(count + 1).padStart(4, '0')}`

    const subtotal = parsed.data.items.reduce((s, i) => s + i.subtotal, 0)
    const ivaAmount = parsed.data.items.reduce((s, i) => s + i.ivaAmount, 0)
    const total = subtotal + ivaAmount

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          companyId,
          customerId: parsed.data.customerId || null,
          branchId: parsed.data.branchId || null,
          userId: ctx.userId,
          number,
          type: parsed.data.type,
          status: 'PENDING',
          date: new Date(parsed.data.date),
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          subtotal,
          ivaAmount,
          total,
          balance: total,
          notes: parsed.data.notes,
          items: {
            create: parsed.data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPct: item.discountPct,
              ivaRate: item.ivaRate,
              subtotal: item.subtotal,
              ivaAmount: item.ivaAmount,
              total: item.total,
            })),
          },
        },
        include: { customer: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
      })

      // Solo las ventas directas (type SALE) mueven stock ya; presupuestos/pedidos/remitos
      // recién mueven stock cuando se convierten (flujo de conversión — ver reporte de cierre).
      if (parsed.data.type === 'SALE') {
        const warehouse = await tx.warehouse.findFirst({ where: { companyId, isMain: true } })
        for (const item of parsed.data.items) {
          await applyStockMovement({
            tx, companyId, productId: item.productId, warehouseId: warehouse?.id,
            type: 'SALE', quantity: item.quantity, reference: `Venta ${created.number}`,
          })
          await consumeBatchesFefo(tx, item.productId, item.quantity)
        }

        if (parsed.data.customerId) {
          await recordCustomerMovement(tx, {
            companyId, customerId: parsed.data.customerId, type: 'INVOICE',
            debe: total, sourceType: 'sale', sourceId: created.id, createdById: ctx.userId,
          })
        }
      }

      return created
    })

    await audit({
      ...requestMeta(req),
      companyId, userId: ctx.userId,
      action: 'CREATE', module: 'ventas', entityType: 'Sale', entityId: sale.id,
      newValues: { number: sale.number, total: Number(sale.total) },
    })

    return NextResponse.json({ data: sale, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    const periodErr = handlePeriodClosedError(err)
    if (periodErr) return NextResponse.json({ error: periodErr.error, code: periodErr.code }, { status: periodErr.status })
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error('[POST /api/ventas]', err)
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 })
  }
}
