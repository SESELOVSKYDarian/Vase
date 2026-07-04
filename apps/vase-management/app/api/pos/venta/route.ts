// app/api/pos/venta/route.ts
//
// Venta de mostrador (POS): a diferencia de /api/ventas (que crea un
// documento comercial que puede ser presupuesto/pedido/remito sin mover
// nada todavía), esta ruta asume venta inmediata con entrega inmediata:
// descuenta stock en el momento, registra los pagos (posiblemente mixtos:
// parte efectivo + parte tarjeta) como CashMovement, y opcionalmente
// factura en el mismo paso si el cliente lo pide.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { applyStockMovement, InsufficientStockError } from '@/lib/stock.service'
import { consumeBatchesFefo } from '@/lib/batch.service'
import { recordCustomerMovement } from '@/lib/ledger.service'
import { audit, requestMeta } from '@/lib/audit'
import { evaluateTrigger } from '@/lib/automation.service'

const paymentSplitSchema = z.object({
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO', 'CHECK', 'OTHER']),
  amount: z.number().positive(),
})

const itemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  ivaRate: z.number().min(0).max(27),
})

const posSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  posSessionId: z.string().optional().nullable(), // sesión de POS abierta (caja) — opcional para ventas sin caja formal
  items: z.array(itemSchema).min(1),
  payments: z.array(paymentSplitSchema).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const body = await req.json()
    const data = posSaleSchema.parse(body)

    // Validar tenant de referencias
    for (const item of data.items) {
      const p = await prisma.product.findFirst({ where: { id: item.productId, companyId: ctx.companyId } })
      if (!p) return NextResponse.json({ error: `Producto inválido: ${item.productId}` }, { status: 400 })
    }
    if (data.customerId) {
      const c = await prisma.customer.findFirst({ where: { id: data.customerId, companyId: ctx.companyId } })
      if (!c) return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })
    }

    const itemsWithTotals = data.items.map((item) => {
      const subtotal = item.quantity * item.unitPrice
      const ivaAmount = subtotal * (item.ivaRate / 100)
      return { ...item, subtotal, ivaAmount, total: subtotal + ivaAmount }
    })

    const subtotal = itemsWithTotals.reduce((s, i) => s + i.subtotal, 0)
    const ivaAmount = itemsWithTotals.reduce((s, i) => s + i.ivaAmount, 0)
    const total = subtotal + ivaAmount

    const paymentsTotal = data.payments.reduce((s, p) => s + p.amount, 0)
    // Tolerancia de 1 centavo por redondeo de floats
    if (Math.abs(paymentsTotal - total) > 0.01) {
      return NextResponse.json(
        { error: `El total pagado ($${paymentsTotal.toFixed(2)}) no coincide con el total de la venta ($${total.toFixed(2)})` },
        { status: 400 }
      )
    }

    const count = await prisma.sale.count({ where: { companyId: ctx.companyId, type: 'SALE' } })
    const number = `V-${String(count + 1).padStart(4, '0')}`

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          companyId: ctx.companyId,
          customerId: data.customerId || null,
          userId: ctx.userId,
          number,
          type: 'SALE',
          status: 'DELIVERED', // en POS la entrega es inmediata
          date: new Date(),
          subtotal, ivaAmount, total,
          paidAmount: total,
          balance: 0,
          items: {
            create: itemsWithTotals.map((i) => ({
              productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice,
              ivaRate: i.ivaRate, subtotal: i.subtotal, ivaAmount: i.ivaAmount, total: i.total,
            })),
          },
        },
        include: { items: { include: { product: { select: { name: true } } } } },
      })

      // Descontar stock inmediatamente
      const warehouse = await tx.warehouse.findFirst({ where: { companyId: ctx.companyId, isMain: true } })
      for (const item of itemsWithTotals) {
        await applyStockMovement({
          tx, companyId: ctx.companyId, productId: item.productId, warehouseId: warehouse?.id,
          type: 'SALE', quantity: item.quantity, reference: `POS ${sale.number}`,
        })
        // Trazabilidad de lote: descuenta primero el lote más próximo a
        // vencer (FEFO). No-op si el producto no tiene control de lotes.
        await consumeBatchesFefo(tx, item.productId, item.quantity)
      }

      // Registrar cada tramo del pago como movimiento de caja
      for (const payment of data.payments) {
        await tx.cashMovement.create({
          data: {
            companyId: ctx.companyId,
            type: 'INCOME',
            category: 'Ventas POS',
            amount: payment.amount,
            description: `Venta POS ${sale.number}`,
            method: payment.method,
            reference: sale.number,
          },
        })
      }

      // Si hay cliente identificado, igual queda registrado en su cuenta
      // corriente como DEBE+HABER simultáneo (venta contado no genera deuda,
      // pero sí queremos el movimiento para el historial/estadísticas).
      if (data.customerId) {
        await recordCustomerMovement(tx, {
          companyId: ctx.companyId, customerId: data.customerId, type: 'INVOICE',
          debe: total, sourceType: 'sale', sourceId: sale.id, createdById: ctx.userId,
        })
        await recordCustomerMovement(tx, {
          companyId: ctx.companyId, customerId: data.customerId, type: 'PAYMENT',
          haber: total, sourceType: 'sale', sourceId: sale.id, createdById: ctx.userId,
          notes: 'Venta de contado — cancelada en el momento',
        })
      }

      // Vincular a la sesión de POS si se pasó una
      if (data.posSessionId) {
        const posSession = await tx.posSession.findFirst({ where: { id: data.posSessionId, companyId: ctx.companyId } })
        if (posSession) {
          await tx.posSale.create({
            data: { posSessionId: data.posSessionId, saleId: sale.id, paymentSplits: data.payments },
          })
        }
      }

      return sale
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CREATE', module: 'pos', entityType: 'Sale', entityId: result.id,
      newValues: { number: result.number, total, payments: data.payments },
    })

    evaluateTrigger('SALE_CREATED', {
      companyId: ctx.companyId, entityType: 'sale', entityId: result.id,
      data: { saleNumber: result.number, total },
    }).catch((err) => console.error('[automation SALE_CREATED]', err))

    return NextResponse.json({ data: result, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof InsufficientStockError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/pos/venta]', err)
    return NextResponse.json({ error: 'Error al procesar venta' }, { status: 500 })
  }
}
