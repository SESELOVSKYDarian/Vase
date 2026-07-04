// lib/batch.service.ts
//
// Trazabilidad de lote real: cuando se vende un producto que tiene lotes
// activos (hasBatchControl=true), la cantidad vendida se descuenta de los
// lotes existentes siguiendo FEFO (First-Expire-First-Out — se consume
// primero el lote que vence antes). Sin esto, ProductBatch.quantity queda
// congelado en el valor de ingreso y nunca refleja lo realmente disponible
// por lote, lo cual invalida cualquier alerta de vencimiento a mediano plazo.

import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

/**
 * Descuenta `quantity` unidades de los lotes activos de un producto,
 * consumiendo primero los que vencen antes (o sin vencimiento al final).
 * No lanza si el producto no tiene control de lotes (no-op silencioso) —
 * eso es normal para la mayoría de los productos.
 */
export async function consumeBatchesFefo(tx: Tx, productId: string, quantity: number): Promise<void> {
  const product = await tx.product.findUnique({ where: { id: productId }, select: { hasBatchControl: true } })
  if (!product?.hasBatchControl) return // producto sin trazabilidad de lote — no aplica

  const batches = await tx.productBatch.findMany({
    where: { productId, isActive: true, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
  })

  let remaining = quantity
  for (const batch of batches) {
    if (remaining <= 0) break
    const available = Number(batch.quantity)
    const consumed = Math.min(available, remaining)

    await tx.productBatch.update({
      where: { id: batch.id },
      data: { quantity: available - consumed },
    })

    remaining -= consumed
  }

  // Si no había suficiente en los lotes registrados, no bloqueamos la venta
  // (el stock agregado del producto ya se valida en stock.service.ts) —
  // pero sí queda como una inconsistencia de trazabilidad detectable: el
  // Product.stock alcanza pero los lotes no coinciden. Se registra para
  // que quien mire el kardex por lote lo note, en vez de fallar la venta.
  if (remaining > 0) {
    console.warn(`[batch.service] Producto ${productId}: ${remaining} unidades vendidas sin lote de origen identificable`)
  }
}
