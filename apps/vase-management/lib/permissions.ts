// lib/permissions.ts
//
// Validación REAL de permisos en backend. La UI puede ocultar botones por
// comodidad, pero la única verificación que cuenta es esta: si un endpoint
// no llama a requirePermission()/requireAuthorization(), no está protegido,
// sin importar lo que muestre el frontend.
//
// Estado actual: el modelo Role/Permission/RolePermission ya existe en el
// schema. Este helper lo usa para resolver permisos efectivos del usuario
// y expone también el flujo de "autorización especial" (AuthorizationRequest)
// para las acciones críticas listadas en el prompt maestro (anular
// comprobantes, ajustar stock, cerrar período, etc.)

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export class PermissionDeniedError extends Error {
  constructor(public code: string) {
    super(`Permiso denegado: ${code}`)
    this.name = 'PermissionDeniedError'
  }
}

/** Códigos de permiso. Mapean 1 a 1 con Permission.code en la base. */
export const PERMISSIONS = {
  // Ventas / facturación
  INVOICE_AUTHORIZE: 'invoice.authorize',
  INVOICE_CANCEL: 'invoice.cancel',
  INVOICE_RENUMBER: 'invoice.renumber',
  SALE_CANCEL: 'sale.cancel',
  // Precios
  PRICE_BULK_UPDATE: 'price.bulk_update',
  // Clientes / productos
  CUSTOMER_DELETE: 'customer.delete',
  PRODUCT_DELETE: 'product.delete',
  // Stock
  STOCK_ADJUST: 'stock.adjust',
  STOCK_ZERO_OUT: 'stock.zero_out',
  // Cuenta corriente
  BALANCE_ADJUST: 'balance.adjust',
  // Cierres
  PERIOD_CLOSE: 'period.close',
  CASH_CLOSE: 'cash.close',
  // Reprocesos
  STOCK_REPROCESS: 'stock.reprocess',
  DEBT_RECALCULATE: 'debt.recalculate',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

interface SessionLike {
  user?: {
    id?: string
    companyId?: string | null
    roleId?: string | null
    isSuperAdmin?: boolean
  } | null
}

/**
 * Devuelve true/false según si el usuario de la sesión tiene el permiso dado.
 * Super admin siempre pasa. Si el usuario no tiene rol asignado, no tiene
 * ningún permiso (fail closed, no fail open).
 */
export async function hasPermission(session: SessionLike, code: PermissionCode): Promise<boolean> {
  if (!session.user) return false
  if (session.user.isSuperAdmin) return true
  if (!session.user.roleId) return false

  const grant = await prisma.rolePermission.findFirst({
    where: { roleId: session.user.roleId, permission: { code } },
  })
  return !!grant
}

/**
 * Guard para usar al inicio de un handler de API route. Lanza
 * PermissionDeniedError si no tiene el permiso — el caller debe capturarlo
 * y devolver 403 (ver `withPermissionError` más abajo para el wrapper).
 */
export async function requirePermission(session: SessionLike, code: PermissionCode): Promise<void> {
  const ok = await hasPermission(session, code)
  if (!ok) throw new PermissionDeniedError(code)
}

/** Convierte un PermissionDeniedError en una respuesta 403 estándar. Uso: catch(err) { return handlePermissionError(err) } */
export function handlePermissionError(err: unknown): NextResponse | null {
  if (err instanceof PermissionDeniedError) {
    return NextResponse.json(
      { error: 'No tenés permiso para realizar esta acción', code: err.code },
      { status: 403 }
    )
  }
  return null
}

// ───────────────────────── Autorización especial (4-eyes) ─────────────────────────
//
// Para las acciones más críticas (anular factura ya autorizada por AFIP,
// poner stock en cero, cerrar período), no alcanza con "tener el permiso":
// se requiere una AuthorizationRequest aprobada por otro usuario con rol
// habilitante. Este helper crea la solicitud; el endpoint que la dispara
// debe devolver "pendiente de autorización" en vez de ejecutar directo.

export async function createAuthorizationRequest(params: {
  companyId: string
  requesterId: string
  action: string
  entityType?: string
  entityId?: string
  reason: string
}) {
  return prisma.authorizationRequest.create({
    data: {
      companyId: params.companyId,
      requesterId: params.requesterId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      reason: params.reason,
      status: 'PENDING',
    },
  })
}

export async function approveAuthorizationRequest(id: string, approverId: string) {
  return prisma.authorizationRequest.update({
    where: { id },
    data: { status: 'APPROVED', approverId, resolvedAt: new Date() },
  })
}

export async function rejectAuthorizationRequest(id: string, approverId: string, notes?: string) {
  return prisma.authorizationRequest.update({
    where: { id },
    data: { status: 'REJECTED', approverId, resolvedAt: new Date(), notes },
  })
}
