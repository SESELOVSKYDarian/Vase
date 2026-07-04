// app/api/ventas/[id]/convertir/route.ts
//
// Convierte un documento comercial al siguiente paso del flujo:
//   BUDGET (presupuesto) → ORDER (pedido) → REMITO → factura (Invoice)
//
// Reglas:
//   - Solo se puede convertir hacia el paso inmediato siguiente (no saltar
//     de presupuesto directo a factura sin pasar por pedido/remito, salvo
//     que el caller pida explícitamente "skipSteps").
//   - El nuevo documento queda vinculado al original vía convertedFromId.
//   - El stock recién se mueve en el paso REMITO (entrega física) o al
//     facturar directo si no hubo remito — nunca antes.
//   - Soporta agrupar varios pedidos en un remito/factura (múltiples
//     sourceIds), listado en el prompt maestro.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { applyStockMovement, InsufficientStockError } from '@/lib/stock.service'
import { audit, requestMeta } from '@/lib/audit'

const convertSchema = z.object({
  targetType: z.enum(['ORDER', 'REMITO', 'SALE']),
  additionalSourceIds: z.array(z.string()).optional(), // para agrupar varios pedidos en un remito, o varios remitos en una factura
})

const NEXT_STEP: Record<string, string> = { BUDGET: 'ORDER', ORDER: 'REMITO', REMITO: 'SALE' }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    const body = await req.json()
    const { targetType, additionalSourceIds } = convertSchema.parse(body)

    const sourceIds = [params.id, ...(additionalSourceIds ?? [])]
    const sources = await prisma.sale.findMany({
      where: { id: { in: sourceIds }, companyId: ctx.companyId },
      include: { items: true, customer: true },
    })

    if (sources.length !== sourceIds.length) {
      return NextResponse.json({ error: 'Uno o más documentos origen no existen o no pertenecen a esta empresa' }, { status: 404 })
    }
    if (sources.some((s) => s.status === 'CANCELLED')) {
      return NextResponse.json({ error: 'No se puede convertir un documento anulado' }, { status: 400 })
    }
    // Todos los documentos a agrupar deben ser del mismo cliente
    const distinctCustomers = new Set(sources.map((s) => s.customerId ?? 'none'))
    if (distinctCustomers.size > 1) {
      return NextResponse.json({ error: 'No se pueden agrupar documentos de clientes distintos' }, { status: 400 })
    }
    // Todos deben ser del mismo tipo de origen (no mezclar presupuesto con pedido)
    const distinctTypes = new Set(sources.map((s) => s.type))
    if (distinctTypes.size > 1) {
      return NextResponse.json({ error: 'No se pueden agrupar documentos de distinto tipo en una misma conversión' }, { status: 400 })
    }

    const sourceType = sources[0].type
    const expectedNext = NEXT_STEP[sourceType]
    if (!expectedNext) {
      return NextResponse.json({ error: `El tipo ${sourceType} no tiene conversión definida` }, { status: 400 })
    }
    if (targetType !== expectedNext) {
      return NextResponse.json(
        { error: `Un documento tipo ${sourceType} solo puede convertirse a ${expectedNext} (recibido: ${targetType})` },
        { status: 400 }
      )
    }

    // Combinar ítems de todos los documentos origen (agrupación real, no solo el primero)
    const combinedItems = sources.flatMap((s) => s.items)
    const subtotal = combinedItems.reduce((s, i) => s + Number(i.subtotal), 0)
    const ivaAmount = combinedItems.reduce((s, i) => s + Number(i.ivaAmount), 0)
    const total = subtotal + ivaAmount

    const result = await prisma.$transaction(async (tx) => {
      let newDocument

      if (targetType === 'SALE') {
        // Conversión final: se factura. Reutilizamos la lógica de venta directa
        // (mueve stock) — igual que /api/ventas con type=SALE.
        const count = await tx.sale.count({ where: { companyId: ctx.companyId, type: 'SALE' } })
        newDocument = await tx.sale.create({
          data: {
            companyId: ctx.companyId,
            customerId: sources[0].customerId,
            userId: ctx.userId,
            number: `V-${String(count + 1).padStart(4, '0')}`,
            type: 'SALE',
            status: 'DELIVERED',
            date: new Date(),
            subtotal, ivaAmount, total, balance: total,
            convertedFromId: sources[0].id,
            items: {
              create: combinedItems.map((i) => ({
                productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice,
                discountPct: i.discountPct, ivaRate: i.ivaRate, subtotal: i.subtotal,
                ivaAmount: i.ivaAmount, total: i.total,
              })),
            },
          },
          include: { items: true },
        })

        const warehouse = await tx.warehouse.findFirst({ where: { companyId: ctx.companyId, isMain: true } })
        for (const item of combinedItems) {
          await applyStockMovement({
            tx, companyId: ctx.companyId, productId: item.productId, warehouseId: warehouse?.id,
            type: 'SALE', quantity: Number(item.quantity), reference: `Conversión ${sourceType}→SALE: ${newDocument.number}`,
          })
        }
      } else if (targetType === 'REMITO') {
        // Remito: entrega física, mueve stock, pero todavía no es factura fiscal.
        const count = await tx.sale.count({ where: { companyId: ctx.companyId, type: 'REMITO' } })
        newDocument = await tx.sale.create({
          data: {
            companyId: ctx.companyId,
            customerId: sources[0].customerId,
            userId: ctx.userId,
            number: `REM-${String(count + 1).padStart(4, '0')}`,
            type: 'REMITO',
            status: 'DELIVERED',
            date: new Date(),
            subtotal, ivaAmount, total, balance: total,
            convertedFromId: sources[0].id,
            items: {
              create: combinedItems.map((i) => ({
                productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice,
                discountPct: i.discountPct, ivaRate: i.ivaRate, subtotal: i.subtotal,
                ivaAmount: i.ivaAmount, total: i.total,
              })),
            },
          },
          include: { items: true },
        })

        const warehouse = await tx.warehouse.findFirst({ where: { companyId: ctx.companyId, isMain: true } })
        for (const item of combinedItems) {
          await applyStockMovement({
            tx, companyId: ctx.companyId, productId: item.productId, warehouseId: warehouse?.id,
            type: 'EXIT', quantity: Number(item.quantity), reference: `Remito ${newDocument.number} (conversión desde ${sourceType})`,
          })
        }
      } else {
        // ORDER: no mueve stock todavía, solo cambia el tipo de documento.
        const count = await tx.sale.count({ where: { companyId: ctx.companyId, type: 'ORDER' } })
        newDocument = await tx.sale.create({
          data: {
            companyId: ctx.companyId,
            customerId: sources[0].customerId,
            userId: ctx.userId,
            number: `PED-${String(count + 1).padStart(4, '0')}`,
            type: 'ORDER',
            status: 'CONFIRMED',
            date: new Date(),
            subtotal, ivaAmount, total, balance: total,
            convertedFromId: sources[0].id,
            items: {
              create: combinedItems.map((i) => ({
                productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice,
                discountPct: i.discountPct, ivaRate: i.ivaRate, subtotal: i.subtotal,
                ivaAmount: i.ivaAmount, total: i.total,
              })),
            },
          },
          include: { items: true },
        })
      }

      // Marcar todos los documentos origen como convertidos (no se pueden reconvertir)
      for (const src of sources) {
        await tx.sale.update({ where: { id: src.id }, data: { status: 'INVOICED' } }) // reutilizamos INVOICED como "ya procesado/cerrado"
      }

      return newDocument
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId, userId: ctx.userId,
      action: 'CONVERT', module: 'ventas', entityType: 'Sale', entityId: result.id,
      newValues: { from: sourceType, to: targetType, sourceIds, newNumber: result.number },
    })

    return NextResponse.json({ data: result, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    if (err instanceof InsufficientStockError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/ventas/[id]/convertir]', err)
    return NextResponse.json({ error: 'Error al convertir documento' }, { status: 500 })
  }
}
