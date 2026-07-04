// lib/stock.service.ts
//
// ÚNICA puerta de entrada para mutar stock en todo el sistema.
//
// Fuente de verdad: StockMovement (historial inmutable).
// Cachés derivados, actualizados atómicamente en la misma transacción:
//   - Product.stock        → suma agregada de todos los depósitos
//   - StockLevel            → cantidad/disponible por depósito puntual
//
// Antes de este servicio, ventas/compras/ajustes/transferencias mutaban
// Product.stock y StockLevel cada uno con su propia lógica duplicada e
// inconsistente. Esto centraliza la regla y previene drift entre ambas
// fuentes — y bloquea stock negativo salvo que se pase allowNegative.

import type { Prisma, StockMovementType } from '@prisma/client'

type Tx = Prisma.TransactionClient

export class InsufficientStockError extends Error {
  constructor(productId: string, available: number, requested: number) {
    super(`Stock insuficiente para producto ${productId}: disponible ${available}, solicitado ${requested}`)
    this.name = 'InsufficientStockError'
  }
}

export interface ApplyStockMovementParams {
  tx: Tx
  companyId: string
  productId: string
  warehouseId?: string | null
  type: StockMovementType
  /**
   * Cantidad del movimiento. Para ENTRY/EXIT/SALE/PURCHASE/etc SIEMPRE positiva
   * (el signo lo decide `type`). Para ADJUSTMENT puede ser positiva o negativa:
   * representa el delta real a aplicar (ej: -3 si el conteo físico dio 3 unidades
   * menos que el sistema).
   */
  quantity: number
  unitCost?: number | null
  reference?: string
  notes?: string
  batchNumber?: string
  serialNumber?: string
  allowNegative?: boolean
}

const ENTRY_TYPES: StockMovementType[] = ['ENTRY', 'PURCHASE', 'TRANSFER_IN', 'RETURN', 'PRODUCTION']
const EXIT_TYPES: StockMovementType[] = ['EXIT', 'SALE', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY']

/**
 * Aplica un movimiento de stock de forma atómica: crea el StockMovement,
 * actualiza Product.stock y, si hay warehouseId, actualiza StockLevel.
 * Debe llamarse siempre dentro de una transacción Prisma (`tx`).
 */
export async function applyStockMovement(params: ApplyStockMovementParams) {
  const { tx, companyId, productId, warehouseId, type, quantity, unitCost, reference, notes, batchNumber, serialNumber } = params

  if (type !== 'ADJUSTMENT' && quantity <= 0) {
    throw new Error('La cantidad de un movimiento de stock debe ser positiva (salvo ADJUSTMENT)')
  }
  if (type === 'ADJUSTMENT' && quantity === 0) {
    throw new Error('Un ajuste con delta 0 no genera movimiento')
  }

  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } })

  let delta = 0
  if (ENTRY_TYPES.includes(type)) delta = quantity
  else if (EXIT_TYPES.includes(type)) delta = -quantity
  else if (type === 'ADJUSTMENT') delta = quantity // signo real, tal cual lo pasa el caller

  const newStock = Number(product.stock) + delta

  if (newStock < 0 && !params.allowNegative) {
    throw new InsufficientStockError(productId, Number(product.stock), Math.abs(quantity))
  }

  await tx.product.update({ where: { id: productId }, data: { stock: newStock } })

  // StockMovement.quantity guarda magnitud absoluta para todo tipo EXCEPTO
  // ADJUSTMENT, donde se guarda el delta con signo real. Esto es intencional:
  // un ajuste puede ser + o -, y sin el signo no se puede reconstruir el
  // historial ni distinguir "sobrante" de "faltante" en el kardex. Todo el
  // código que lee StockMovement (kardex, reconstructProductStock) asume
  // esta misma convención — si se cambia acá, hay que actualizar ambos.
  await tx.stockMovement.create({
    data: {
      companyId,
      productId,
      warehouseId: warehouseId ?? undefined,
      type,
      quantity: type === 'ADJUSTMENT' ? delta : Math.abs(delta),
      unitCost: unitCost ?? undefined,
      reference,
      notes,
      batchNumber,
      serialNumber,
    },
  })

  if (warehouseId) {
    const level = await tx.stockLevel.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    })
    const newQty = (level ? Number(level.quantity) : 0) + delta
    const newAvailable = (level ? Number(level.available) : 0) + delta

    await tx.stockLevel.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: { quantity: newQty, available: newAvailable },
      create: { productId, warehouseId, quantity: newQty, available: newAvailable },
    })
  }

  return { newStock, delta }
}

/**
 * Transfiere stock entre dos depósitos como un par de movimientos atómicos
 * (TRANSFER_OUT en origen, TRANSFER_IN en destino).
 */
export async function applyWarehouseTransfer(params: {
  tx: Tx
  companyId: string
  productId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  reference: string
}) {
  await applyStockMovement({
    tx: params.tx,
    companyId: params.companyId,
    productId: params.productId,
    warehouseId: params.fromWarehouseId,
    type: 'TRANSFER_OUT',
    quantity: params.quantity,
    reference: params.reference,
  })
  await applyStockMovement({
    tx: params.tx,
    companyId: params.companyId,
    productId: params.productId,
    warehouseId: params.toWarehouseId,
    type: 'TRANSFER_IN',
    quantity: params.quantity,
    reference: params.reference,
  })
}

/**
 * Recalcula Product.stock desde cero sumando TODOS los StockMovement.
 * Usado por el proceso de cierre anual / reparación de inconsistencias.
 * Devuelve el stock recalculado sin escribirlo (el caller decide aplicar).
 */
export async function reconstructProductStock(tx: Tx, productId: string): Promise<number> {
  const movements = await tx.stockMovement.findMany({ where: { productId } })
  let stock = 0
  for (const m of movements) {
    const qty = Number(m.quantity)
    if (ENTRY_TYPES.includes(m.type)) stock += qty
    else if (EXIT_TYPES.includes(m.type)) stock -= qty
    else if (m.type === 'ADJUSTMENT') stock += qty
  }
  return stock
}
