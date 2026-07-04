// app/api/pos/sync/route.ts
//
// ALCANCE HONESTO: esto es un building block real para modo offline, NO
// una PWA offline completa. Lo que hace:
//   - Recibe un lote de ventas generadas en el cliente mientras no había
//     conexión (cada una con un clientTxId único generado en el dispositivo).
//   - Es idempotente: si la misma venta se reenvía dos veces (por reintento
//     de red), no se duplica — se detecta por clientTxId único.
//   - Persiste cada intento en OfflineSyncQueue para auditoría de qué se
//     sincronizó y cuándo, incluso si falla.
//
// Lo que NO incluye esta pasada (pendiente, documentado en el reporte):
//   - Service Worker para cachear el shell del POS y que la página cargue
//     sin red.
//   - Cola de escritura en IndexedDB del lado del cliente — hoy el cliente
//     tendría que implementar su propia cola y llamar a este endpoint
//     cuando detecta que volvió la conexión.
//   - Manejo de conflictos de stock: si dos ventas offline del mismo POS
//     vendieron el último producto disponible, la segunda en sincronizar
//     puede fallar por stock insuficiente — se reporta por ítem, no se
//     resuelve automáticamente.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { applyStockMovement } from '@/lib/stock.service'
import { consumeBatchesFefo } from '@/lib/batch.service'

const offlineSaleSchema = z.object({
  clientTxId: z.string().min(1),
  createdAt: z.string(),
  payload: z.object({
    customerId: z.string().optional().nullable(),
    items: z.array(z.object({
      productId: z.string(), quantity: z.number().positive(),
      unitPrice: z.number().min(0), ivaRate: z.number().min(0).max(27),
    })).min(1),
    payments: z.array(z.object({
      method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO', 'CHECK', 'OTHER']),
      amount: z.number().positive(),
    })).min(1),
  }),
})

const syncBatchSchema = z.object({
  sales: z.array(offlineSaleSchema).min(1).max(50),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const { sales } = syncBatchSchema.parse(await req.json())

    const results: { clientTxId: string; status: 'SYNCED' | 'DUPLICATE' | 'FAILED'; saleId?: string; error?: string }[] = []

    for (const offlineSale of sales) {
      const existing = await prisma.offlineSyncQueue.findUnique({ where: { clientTxId: offlineSale.clientTxId } })
      if (existing) {
        results.push({ clientTxId: offlineSale.clientTxId, status: 'DUPLICATE', saleId: existing.saleId ?? undefined })
        continue
      }

      const queueEntry = await prisma.offlineSyncQueue.create({
        data: {
          companyId: ctx.companyId,
          clientTxId: offlineSale.clientTxId,
          payload: offlineSale.payload,
          status: 'PENDING',
          createdAt: new Date(offlineSale.createdAt),
        },
      })

      try {
        const { items, payments, customerId } = offlineSale.payload

        for (const item of items) {
          const p = await prisma.product.findFirst({ where: { id: item.productId, companyId: ctx.companyId } })
          if (!p) throw new Error(`Producto inválido: ${item.productId}`)
        }

        const itemsWithTotals = items.map((item) => {
          const subtotal = item.quantity * item.unitPrice
          const ivaAmount = subtotal * (item.ivaRate / 100)
          return { ...item, subtotal, ivaAmount, total: subtotal + ivaAmount }
        })
        const subtotal = itemsWithTotals.reduce((s, i) => s + i.subtotal, 0)
        const ivaAmount = itemsWithTotals.reduce((s, i) => s + i.ivaAmount, 0)
        const total = subtotal + ivaAmount

        const count = await prisma.sale.count({ where: { companyId: ctx.companyId, type: 'SALE' } })
        const number = `V-${String(count + 1).padStart(4, '0')}`

        const sale = await prisma.$transaction(async (tx) => {
          const s = await tx.sale.create({
            data: {
              companyId: ctx.companyId, customerId: customerId || null, userId: ctx.userId,
              number, type: 'SALE', status: 'DELIVERED',
              date: new Date(offlineSale.createdAt),
              subtotal, ivaAmount, total, paidAmount: total, balance: 0,
              items: { create: itemsWithTotals.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, ivaRate: i.ivaRate, subtotal: i.subtotal, ivaAmount: i.ivaAmount, total: i.total })) },
            },
          })

          const warehouse = await tx.warehouse.findFirst({ where: { companyId: ctx.companyId, isMain: true } })
          for (const item of itemsWithTotals) {
            await applyStockMovement({
              tx, companyId: ctx.companyId, productId: item.productId, warehouseId: warehouse?.id,
              type: 'SALE', quantity: item.quantity, reference: `POS offline ${s.number} (sync)`,
            })
            await consumeBatchesFefo(tx, item.productId, item.quantity)
          }

          for (const payment of payments) {
            await tx.cashMovement.create({
              data: { companyId: ctx.companyId, type: 'INCOME', category: 'Ventas POS (offline)', amount: payment.amount, description: `Venta POS offline ${s.number}`, method: payment.method, reference: s.number },
            })
          }

          return s
        })

        await prisma.offlineSyncQueue.update({
          where: { id: queueEntry.id },
          data: { status: 'SYNCED', saleId: sale.id, syncedAt: new Date() },
        })

        results.push({ clientTxId: offlineSale.clientTxId, status: 'SYNCED', saleId: sale.id })
      } catch (err: any) {
        await prisma.offlineSyncQueue.update({
          where: { id: queueEntry.id },
          data: { status: 'FAILED', error: err.message },
        })
        results.push({ clientTxId: offlineSale.clientTxId, status: 'FAILED', error: err.message })
      }
    }

    return NextResponse.json({ results, synced: results.filter((r) => r.status === 'SYNCED').length })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/pos/sync]', err)
    return NextResponse.json({ error: 'Error al sincronizar' }, { status: 500 })
  }
}
