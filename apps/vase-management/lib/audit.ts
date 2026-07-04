// lib/audit.ts
// Sistema de auditoría de acciones — Vase Business

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export interface AuditEntry {
  companyId?: string
  userId?: string
  action: string
  module: string
  entityType?: string
  entityId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ip?: string
  userAgent?: string
}

/**
 * Extrae IP y user-agent de una NextRequest. En producción detrás de un
 * proxy/load balancer, la IP real viene en x-forwarded-for (Vercel, la
 * mayoría de PaaS) — se toma el primer valor de esa cadena. req.ip solo
 * existe en algunos runtimes, por eso el fallback en cascada.
 *
 * Uso recomendado: pasar el resultado directo al spread de audit():
 *   await audit({ ...requestMeta(req), companyId, userId, action: 'DELETE', ... })
 */
export function requestMeta(req: NextRequest): { ip?: string; userAgent?: string } {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? undefined
  const userAgent = req.headers.get('user-agent') ?? undefined
  return { ip, userAgent }
}

/**
 * Registra una acción en el log de auditoría.
 * No lanza error si falla (para no interrumpir el flujo principal).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry })
  } catch (err) {
    console.error('[AUDIT] Error al registrar entrada:', err)
  }
}

/**
 * Obtiene el historial de auditoría de una empresa.
 */
export async function getAuditLog(companyId: string, options?: {
  module?: string
  entityType?: string
  entityId?: string
  userId?: string
  limit?: number
  offset?: number
}) {
  return prisma.auditLog.findMany({
    where: {
      companyId,
      ...(options?.module && { module: options.module }),
      ...(options?.entityType && { entityType: options.entityType }),
      ...(options?.entityId && { entityId: options.entityId }),
      ...(options?.userId && { userId: options.userId }),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

// Acciones predefinidas
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  PRINT: 'PRINT',
  AUTHORIZE: 'AUTHORIZE',
  CANCEL: 'CANCEL',
} as const

// Módulos predefinidos
export const AUDIT_MODULES = {
  CUSTOMERS: 'clientes',
  PRODUCTS: 'productos',
  STOCK: 'stock',
  SALES: 'ventas',
  INVOICES: 'facturacion',
  PURCHASES: 'compras',
  TREASURY: 'tesoreria',
  USERS: 'usuarios',
  COMPANY: 'empresa',
} as const
