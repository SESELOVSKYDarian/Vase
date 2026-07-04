// app/api/stock/transferencias/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { applyWarehouseTransfer, InsufficientStockError } from '@/lib/stock.service'
import { audit, requestMeta } from '@/lib/audit'

const createSchema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = 20

    const transfers = await prisma.warehouseTransfer.findMany({
      where: { companyId: session.user.companyId },
      include: {
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        items: { include: { product: { select: { name: true, code: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    })

    const total = await prisma.warehouseTransfer.count({ where: { companyId: session.user.companyId } })
    return NextResponse.json({ data: transfers, total, page, limit })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const body = await req.json()
    const data = createSchema.parse(body)

    if (data.fromWarehouseId === data.toWarehouseId) {
      return NextResponse.json({ error: 'El depósito origen y destino deben ser diferentes' }, { status: 400 })
    }

    // Validar que ambos depósitos pertenezcan al tenant activo
    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: data.fromWarehouseId, companyId: ctx.companyId } }),
      prisma.warehouse.findFirst({ where: { id: data.toWarehouseId, companyId: ctx.companyId } }),
    ])
    if (!fromWh || !toWh) return NextResponse.json({ error: 'Depósito inválido' }, { status: 400 })

    const transfer = await prisma.$transaction(async (tx) => {
      const t = await tx.warehouseTransfer.create({
        data: {
          companyId: ctx.companyId,
          fromWarehouseId: data.fromWarehouseId,
          toWarehouseId: data.toWarehouseId,
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: data.notes,
          items: { create: data.items },
        },
        include: { fromWarehouse: true, toWarehouse: true, items: { include: { product: true } } },
      })

      for (const item of data.items) {
        await applyWarehouseTransfer({
          tx, companyId: ctx.companyId, productId: item.productId,
          fromWarehouseId: data.fromWarehouseId, toWarehouseId: data.toWarehouseId,
          quantity: item.quantity,
          reference: `Transferencia: ${t.fromWarehouse.name} → ${t.toWarehouse.name}`,
        })
      }

      return t
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'TRANSFER', module: 'stock', entityType: 'WarehouseTransfer', entityId: transfer.id,
      newValues: { from: fromWh.name, to: toWh.name, items: data.items.length },
    })

    return NextResponse.json({ data: transfer, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof InsufficientStockError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/stock/transferencias]', err)
    return NextResponse.json({ error: 'Error al crear transferencia' }, { status: 500 })
  }
}
