// app/api/compras/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'
import { audit, requestMeta } from '@/lib/audit'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { applyStockMovement } from '@/lib/stock.service'
import { recordSupplierMovement } from '@/lib/ledger.service'

const itemSchema = z.object({
  productId: z.string(),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  ivaRate: z.number().min(0).max(100).default(21),
  subtotal: z.number(),
  ivaAmount: z.number(),
  total: z.number(),
  batchNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  expiryDate: z.string().optional(),
})

const purchaseSchema = z.object({
  supplierId: z.string(),
  number: z.string().optional(),
  type: z.enum(['ORDER', 'INVOICE', 'CREDIT_NOTE']).default('INVOICE'),
  date: z.string(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId

    const [data, total] = await Promise.all([
      prisma.purchase.findMany({
        where: { companyId },
        include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where: { companyId } }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const body = await req.json()
    const parsed = purchaseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const companyId = ctx.companyId
    const { items, ...purchaseData } = parsed.data

    const supplier = await prisma.supplier.findFirst({ where: { id: purchaseData.supplierId, companyId } })
    if (!supplier) return NextResponse.json({ error: 'Proveedor inválido' }, { status: 400 })
    for (const item of items) {
      const p = await prisma.product.findFirst({ where: { id: item.productId, companyId } })
      if (!p) return NextResponse.json({ error: `Producto inválido: ${item.productId}` }, { status: 400 })
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
    const ivaAmount = items.reduce((s, i) => s + i.ivaAmount, 0)
    const total = subtotal + ivaAmount

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          supplierId: purchaseData.supplierId,
          number: purchaseData.number,
          type: purchaseData.type,
          companyId,
          date: new Date(purchaseData.date),
          dueDate: purchaseData.dueDate ? new Date(purchaseData.dueDate) : null,
          notes: purchaseData.notes,
          subtotal, ivaAmount, total, balance: total,
          items: { create: items.map(({ expiryDate, ...i }) => ({ ...i, expiryDate: expiryDate ? new Date(expiryDate) : undefined })) },
        },
        include: { supplier: { select: { name: true } }, items: true },
      })

      // Recepción de mercadería: mover stock vía el servicio único (mismas
      // garantías que ventas — sin duplicar la lógica de actualización).
      if (purchaseData.type === 'INVOICE') {
        const warehouse = await tx.warehouse.findFirst({ where: { companyId, isMain: true } })
        for (const item of items) {
          await applyStockMovement({
            tx, companyId, productId: item.productId, warehouseId: warehouse?.id,
            type: 'PURCHASE', quantity: item.quantity, unitCost: item.unitCost,
            reference: `Compra ${created.number ?? created.id.slice(0, 8)}`,
            batchNumber: item.batchNumber, serialNumber: item.serialNumber,
            allowNegative: true, // una compra siempre suma, nunca puede fallar por "stock insuficiente"
          })
          await tx.product.update({ where: { id: item.productId }, data: { cost: item.unitCost } })

          // Trazabilidad real: si el ítem trae lote y/o vencimiento, se
          // registra en ProductBatch (antes se descartaba silenciosamente).
          if (item.batchNumber || item.expiryDate) {
            await tx.productBatch.create({
              data: {
                productId: item.productId,
                batchNumber: item.batchNumber ?? `SIN-LOTE-${created.number ?? created.id.slice(0, 6)}`,
                quantity: item.quantity,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                notes: `Ingreso por compra ${created.number ?? created.id.slice(0, 8)}`,
              },
            })
            await tx.product.update({ where: { id: item.productId }, data: { hasBatchControl: true, ...(item.expiryDate && { hasExpiry: true }) } })
          }

          // Trazabilidad de número de serie individual (ej: electrónica de alto valor)
          if (item.serialNumber) {
            await tx.productSerialNumber.create({
              data: { productId: item.productId, serialNumber: item.serialNumber, status: 'AVAILABLE', purchaseDate: new Date(purchaseData.date) },
            })
            await tx.product.update({ where: { id: item.productId }, data: { hasSerialNumber: true } })
          }
        }

        await recordSupplierMovement(tx, {
          companyId, supplierId: purchaseData.supplierId, type: 'PURCHASE',
          debe: total, sourceType: 'purchase', sourceId: created.id,
          dueDate: purchaseData.dueDate ? new Date(purchaseData.dueDate) : null,
          createdById: ctx.userId,
        })
      }

      return created
    })

    await audit({
      ...requestMeta(req),
      companyId, userId: ctx.userId,
      action: 'CREATE', module: 'compras', entityType: 'Purchase', entityId: purchase.id,
      newValues: { number: purchase.number, total: Number(purchase.total) },
    })

    return NextResponse.json({ data: purchase, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    console.error('[POST /api/compras]', err)
    return NextResponse.json({ error: 'Error al crear compra' }, { status: 500 })
  }
}
