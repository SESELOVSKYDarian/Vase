// app/api/facturacion/[id]/anular/route.ts
//
// Anular una factura ya autorizada por AFIP NO es un DELETE ni un simple
// cambio de estado: fiscal y contablemente, lo correcto es emitir una Nota
// de Crédito que la compense. Este endpoint:
//   1. Valida permiso invoice.cancel (fail-closed)
//   2. Valida que el período fiscal de la factura esté abierto
//   3. Exige motivo obligatorio (regla explícita del prompt maestro)
//   4. Genera una Invoice type=CREDIT_NOTE vinculada (relatedInvoiceId)
//   5. Revierte el movimiento de stock si la factura tenía venta asociada
//   6. Revierte el ledger del cliente (movimiento HABER que cancela el DEBE)
//   7. Todo en una única transacción atómica + AuditLog

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { audit, requestMeta } from '@/lib/audit'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { requirePermission, handlePermissionError, PERMISSIONS } from '@/lib/permissions'
import { assertPeriodOpen, handlePeriodClosedError } from '@/lib/fiscal-period'
import { recordCustomerMovement } from '@/lib/ledger.service'
import { applyStockMovement } from '@/lib/stock.service'

const cancelSchema = z.object({
  reason: z.string().min(10, 'El motivo de anulación debe ser detallado (mínimo 10 caracteres)'),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    await requirePermission(session, PERMISSIONS.INVOICE_CANCEL)

    const body = await req.json()
    const { reason } = cancelSchema.parse(body)

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { items: true, sale: { include: { items: true } }, customer: true, pointOfSale: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'La factura ya está anulada' }, { status: 400 })
    if (invoice.type !== 'INVOICE') return NextResponse.json({ error: 'Solo se pueden anular facturas, no notas de crédito/débito' }, { status: 400 })

    // Regla explícita: no modificar comprobantes de un período cerrado sin autorización especial
    await assertPeriodOpen(ctx.companyId, invoice.date)

    const result = await prisma.$transaction(async (tx) => {
      // ─── 1. Nota de crédito que compensa la factura completa ───
      const lastCN = await tx.invoice.findFirst({
        where: { companyId: ctx.companyId, type: 'CREDIT_NOTE', letter: invoice.letter, pointOfSaleId: invoice.pointOfSaleId },
        orderBy: { number: 'desc' },
      })
      const cnNumber = (lastCN?.number ?? 0) + 1

      const creditNote = await tx.invoice.create({
        data: {
          companyId: ctx.companyId,
          customerId: invoice.customerId,
          saleId: invoice.saleId,
          userId: ctx.userId,
          pointOfSaleId: invoice.pointOfSaleId,
          type: 'CREDIT_NOTE',
          letter: invoice.letter,
          number: cnNumber,
          date: new Date(),
          status: 'AUTHORIZED', // nota: en un flujo con AFIP real, esto también debería pasar por afipService.authorize()
          subtotal: invoice.subtotal,
          ivaAmount: invoice.ivaAmount,
          total: invoice.total,
          balance: 0, // la NC no genera saldo propio, solo compensa
          relatedInvoiceId: invoice.id,
          notes: `Anulación de factura ${invoice.letter}${invoice.number}. Motivo: ${reason}`,
          items: {
            create: invoice.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              ivaRate: it.ivaRate,
              subtotal: it.subtotal,
              ivaAmount: it.ivaAmount,
              total: it.total,
            })),
          },
        },
      })

      // ─── 2. Marcar la factura original como CANCELLED ───
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'CANCELLED', cancellationReason: reason, balance: 0 },
      })

      // ─── 3. Revertir stock si había venta asociada con items ───
      if (invoice.sale?.items?.length) {
        const warehouse = await tx.warehouse.findFirst({ where: { companyId: ctx.companyId, isMain: true } })
        for (const item of invoice.sale.items) {
          await applyStockMovement({
            tx, companyId: ctx.companyId, productId: item.productId, warehouseId: warehouse?.id,
            type: 'RETURN', quantity: Number(item.quantity),
            reference: `Anulación factura ${invoice.letter}${invoice.number} — NC ${cnNumber}`,
            allowNegative: true,
          })
        }
      }

      // ─── 4. Ledger: movimiento HABER que cancela el DEBE original ───
      if (invoice.customerId) {
        await recordCustomerMovement(tx, {
          companyId: ctx.companyId,
          customerId: invoice.customerId,
          type: 'CREDIT_NOTE',
          haber: Number(invoice.total),
          sourceType: 'invoice',
          sourceId: creditNote.id,
          notes: `NC por anulación de factura ${invoice.letter}${invoice.number}`,
          createdById: ctx.userId,
        })
      }

      return { invoice: await tx.invoice.findUnique({ where: { id: invoice.id } }), creditNote }
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CANCEL', module: 'facturacion', entityType: 'Invoice', entityId: invoice.id,
      oldValues: { status: invoice.status, total: Number(invoice.total) },
      newValues: { status: 'CANCELLED', reason, creditNoteId: result.creditNote.id, creditNoteNumber: result.creditNote.number },
    })

    return NextResponse.json({ data: result, success: true })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    const permErr = handlePermissionError(err)
    if (permErr) return permErr
    const periodErr = handlePeriodClosedError(err)
    if (periodErr) return NextResponse.json({ error: periodErr.error, code: periodErr.code }, { status: periodErr.status })
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/facturacion/[id]/anular]', err)
    return NextResponse.json({ error: 'Error al anular factura' }, { status: 500 })
  }
}
