// lib/super-admin.ts
//
// Guard para endpoints/páginas exclusivas de Super Admin (operador de la
// plataforma, no de una empresa cliente). isSuperAdmin vive en User, no en
// CompanyUser — es una capacidad global, no atada a ningún tenant.

import { NextResponse } from 'next/server'

export class NotSuperAdminError extends Error {
  constructor() {
    super('Esta acción requiere permisos de Super Admin')
    this.name = 'NotSuperAdminError'
  }
}

interface SessionLike {
  user?: { isSuperAdmin?: boolean } | null
}

export function requireSuperAdmin(session: SessionLike): void {
  if (!session.user?.isSuperAdmin) throw new NotSuperAdminError()
}

export function handleSuperAdminError(err: unknown): NextResponse | null {
  if (err instanceof NotSuperAdminError) {
    return NextResponse.json({ error: err.message }, { status: 403 })
  }
  return null
}
