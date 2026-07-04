// lib/plan-limits.ts
//
// Límites reales por plan. No es un valor decorativo en la UI: cada límite
// acá se verifica en backend antes de permitir la creación del recurso
// correspondiente (ver requirePlanLimit). Un PlanOverride en la base puede
// pisar puntualmente uno de estos valores para un cliente específico
// (ej: ENTERPRISE con un límite negociado distinto al estándar).

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export interface PlanLimits {
  maxUsers: number
  maxInvoicesPerMonth: number
  maxProducts: number
  maxCustomers: number
  maxStorageMb: number
}

// -1 = sin límite (ENTERPRISE)
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  BASIC: {
    maxUsers: 3,
    maxInvoicesPerMonth: 100,
    maxProducts: 200,
    maxCustomers: 200,
    maxStorageMb: 500,
  },
  PROFESSIONAL: {
    maxUsers: 10,
    maxInvoicesPerMonth: 1000,
    maxProducts: 2000,
    maxCustomers: 2000,
    maxStorageMb: 5000,
  },
  ENTERPRISE: {
    maxUsers: -1,
    maxInvoicesPerMonth: -1,
    maxProducts: -1,
    maxCustomers: -1,
    maxStorageMb: -1,
  },
}

export class PlanLimitExceededError extends Error {
  constructor(public resource: string, public limit: number, public current: number) {
    super(`Límite del plan alcanzado para ${resource}: ${current}/${limit}. Actualizá tu plan para continuar.`)
    this.name = 'PlanLimitExceededError'
  }
}

/** Resuelve los límites efectivos de una empresa: plan base + override puntual si existe. */
export async function getEffectiveLimits(companyId: string): Promise<PlanLimits> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } })
  const base = PLAN_LIMITS[company.plan] ?? PLAN_LIMITS.BASIC

  const override = await prisma.planOverride.findUnique({ where: { companyId } })
  if (!override) return base

  return {
    maxUsers: override.maxUsers ?? base.maxUsers,
    maxInvoicesPerMonth: override.maxInvoicesPerMonth ?? base.maxInvoicesPerMonth,
    maxProducts: override.maxProducts ?? base.maxProducts,
    maxCustomers: override.maxCustomers ?? base.maxCustomers,
    maxStorageMb: override.maxStorageMb ?? base.maxStorageMb,
  }
}

type LimitedResource = 'users' | 'invoicesPerMonth' | 'products' | 'customers'

async function getCurrentUsage(companyId: string, resource: LimitedResource): Promise<number> {
  switch (resource) {
    case 'users':
      return prisma.companyUser.count({ where: { companyId, isActive: true } })
    case 'products':
      return prisma.product.count({ where: { companyId, isActive: true } })
    case 'customers':
      return prisma.customer.count({ where: { companyId, isActive: true } })
    case 'invoicesPerMonth': {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return prisma.invoice.count({ where: { companyId, date: { gte: monthStart }, status: { not: 'CANCELLED' } } })
    }
  }
}

const LIMIT_KEY: Record<LimitedResource, keyof PlanLimits> = {
  users: 'maxUsers',
  invoicesPerMonth: 'maxInvoicesPerMonth',
  products: 'maxProducts',
  customers: 'maxCustomers',
}

/**
 * Lanza PlanLimitExceededError si crear un recurso más superaría el límite
 * del plan. Diseñado para llamarse ANTES de crear el registro (cuenta lo
 * que ya existe y compara contra el límite + 1 que se está por crear).
 */
export async function requirePlanLimit(companyId: string, resource: LimitedResource): Promise<void> {
  const limits = await getEffectiveLimits(companyId)
  const max = limits[LIMIT_KEY[resource]]
  if (max === -1) return // sin límite (ENTERPRISE o override explícito)

  const current = await getCurrentUsage(companyId, resource)
  if (current >= max) {
    throw new PlanLimitExceededError(resource, max, current)
  }
}

export function handlePlanLimitError(err: unknown): NextResponse | null {
  if (err instanceof PlanLimitExceededError) {
    return NextResponse.json(
      { error: err.message, code: 'PLAN_LIMIT_EXCEEDED', resource: err.resource, limit: err.limit, current: err.current },
      { status: 402 } // 402 Payment Required — semánticamente correcto para "necesitás upgradear"
    )
  }
  return null
}
