// lib/tenant.ts
//
// Punto único para resolver y validar el tenant (empresa) activo de una
// request. Regla crítica del prompt maestro: NUNCA confiar en companyId
// que venga del frontend (body, query params); siempre derivarlo de la
// sesión server-side.
//
// Este helper no migra automáticamente todos los endpoints existentes
// (eso es un refactor grande, ver reportes de etapa anteriores), pero
// define el patrón correcto y se usa en todo el código nuevo. IMPORTANTE:
// solo los endpoints que llaman a getTenantContext() respetan la suspensión
// de empresa (Company.isActive=false) del panel Super Admin — los que
// todavía usan session.user.companyId directo NO la respetan. Ver reporte
// de Etapa 3 para el listado de qué endpoints faltan migrar.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export class NoTenantError extends Error {
  constructor() {
    super('El usuario no tiene una empresa activa asociada')
    this.name = 'NoTenantError'
  }
}

export class CompanySuspendedError extends Error {
  constructor(public reason?: string | null) {
    super(`Esta empresa está suspendida${reason ? `: ${reason}` : ''}. Contactá a soporte.`)
    this.name = 'CompanySuspendedError'
  }
}

interface SessionLike {
  user?: {
    id?: string
    companyId?: string | null
    isSuperAdmin?: boolean
  } | null
}

export interface TenantContext {
  companyId: string
  userId: string
  isSuperAdmin: boolean
}

/**
 * Devuelve el companyId activo desde la SESIÓN (nunca desde el body/query).
 * Lanza NoTenantError si el usuario no tiene empresa asociada, o
 * CompanySuspendedError si la empresa fue suspendida desde el panel
 * Super Admin — el caller debe capturar ambos (ver handleTenantError).
 *
 * Importante: esto NO resuelve el caso de selección de empresa activa
 * cuando el usuario pertenece a varias (eso requiere guardar la selección
 * en la sesión/cookie tras un endpoint de "switch company" — pendiente,
 * ver reporte de cierre de etapa). Hoy se usa la primera CompanyUser activa,
 * que es el mismo comportamiento que ya tenía el sistema.
 */
export async function getTenantContext(session: SessionLike): Promise<TenantContext> {
  if (!session.user?.id) throw new NoTenantError()
  if (!session.user.companyId) throw new NoTenantError()

  // Super admin puede operar aunque la empresa esté suspendida (necesita
  // poder investigar/reactivarla); cualquier otro usuario, no.
  if (!session.user.isSuperAdmin) {
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { isActive: true, suspendedReason: true },
    })
    if (company && !company.isActive) {
      throw new CompanySuspendedError(company.suspendedReason)
    }
  }

  return {
    companyId: session.user.companyId,
    userId: session.user.id,
    isSuperAdmin: !!session.user.isSuperAdmin,
  }
}

export function handleTenantError(err: unknown): NextResponse | null {
  if (err instanceof NoTenantError) {
    return NextResponse.json({ error: 'No autorizado: falta empresa activa' }, { status: 401 })
  }
  if (err instanceof CompanySuspendedError) {
    return NextResponse.json({ error: err.message, code: 'COMPANY_SUSPENDED' }, { status: 403 })
  }
  return null
}

/**
 * Verifica que una entidad ya cargada (con su companyId) pertenezca al
 * tenant activo. Usar siempre después de un findFirst/findUnique por id
 * antes de operar sobre el registro, para que un ID adivinado de otra
 * empresa nunca pase un chequeo por accidente.
 */
export function assertSameTenant(entityCompanyId: string, ctx: TenantContext) {
  if (ctx.isSuperAdmin) return
  if (entityCompanyId !== ctx.companyId) {
    throw new NoTenantError()
  }
}
