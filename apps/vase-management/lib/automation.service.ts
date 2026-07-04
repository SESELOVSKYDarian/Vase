// lib/automation.service.ts
//
// Motor de automatizaciones tipo "si esto, entonces esto". Es deliberadamente
// chico: soporta 6 triggers y 3 tipos de acción, ejecutados de verdad (no
// simulados). No es un builder visual de workflows arbitrarios — eso es un
// producto en sí mismo y está fuera de alcance de esta pasada. Documentado
// explícitamente como tal en el reporte de cierre.
//
// Triggers soportados:
//   LOW_STOCK, INVOICE_OVERDUE, NEW_CUSTOMER, PRODUCT_EXPIRING,
//   CREDIT_LIMIT_EXCEEDED, SALE_CREATED
//
// Acciones soportadas:
//   CREATE_ALERT  → escribe un SystemAlert real (visible en /dashboard/alertas)
//   WEBHOOK       → hace un POST HTTP real a una URL externa con el payload del evento
//   SEND_EMAIL    → delega a emailService (que hoy es un stub — ver services/email.service.ts,
//                   así que esta acción queda registrada pero NO envía un email real todavía)

import { prisma } from '@/lib/prisma'
import { emailService } from '@/services/email.service'

export type AutomationTrigger =
  | 'LOW_STOCK' | 'INVOICE_OVERDUE' | 'NEW_CUSTOMER'
  | 'PRODUCT_EXPIRING' | 'CREDIT_LIMIT_EXCEEDED' | 'SALE_CREATED'

export interface AutomationAction {
  type: 'CREATE_ALERT' | 'WEBHOOK' | 'SEND_EMAIL'
  // CREATE_ALERT
  title?: string
  message?: string
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  // WEBHOOK
  url?: string
  // SEND_EMAIL
  to?: string
  subject?: string
}

interface EventContext {
  companyId: string
  entityType: string
  entityId: string
  data: Record<string, any> // datos del evento (ej: {productName, currentStock, minStock})
}

/** Interpola variables tipo {{campo}} en un string con los datos del evento. */
function interpolate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''))
}

async function executeAction(action: AutomationAction, ctx: EventContext): Promise<{ ok: boolean; detail?: string }> {
  try {
    switch (action.type) {
      case 'CREATE_ALERT': {
        await prisma.systemAlert.create({
          data: {
            companyId: ctx.companyId,
            type: 'SISTEMA',
            severity: action.severity ?? 'INFO',
            title: action.title ? interpolate(action.title, ctx.data) : 'Automatización disparada',
            message: action.message ? interpolate(action.message, ctx.data) : `Evento: ${ctx.entityType}`,
            entityType: ctx.entityType,
            entityId: ctx.entityId,
          },
        })
        return { ok: true }
      }
      case 'WEBHOOK': {
        if (!action.url) return { ok: false, detail: 'Falta URL de webhook' }
        const res = await fetch(action.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: ctx.entityType, entityId: ctx.entityId, data: ctx.data, timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(8000), // no dejar la automatización colgada si el endpoint externo no responde
        })
        return { ok: res.ok, detail: `HTTP ${res.status}` }
      }
      case 'SEND_EMAIL': {
        if (!action.to) return { ok: false, detail: 'Falta destinatario' }
        const sent = await emailService.send({
          to: action.to,
          subject: action.subject ? interpolate(action.subject, ctx.data) : 'Notificación automática — Vase Business',
          html: `<p>${action.message ? interpolate(action.message, ctx.data) : 'Automatización disparada'}</p>`,
        })
        // emailService.send() hoy es un stub que devuelve false si SMTP no está
        // configurado — lo reportamos tal cual, sin fingir que se envió.
        return { ok: sent, detail: sent ? 'Enviado' : 'SMTP no configurado (stub) — no se envió realmente' }
      }
    }
  } catch (err: any) {
    return { ok: false, detail: err.message }
  }
}

/**
 * Evalúa todas las reglas activas de una empresa para un trigger dado y
 * ejecuta las que matchean. Se registra un AutomationLog por cada ejecución
 * (éxito, falla o skip), para trazabilidad — igual criterio que AuditLog.
 */
export async function evaluateTrigger(trigger: AutomationTrigger, ctx: EventContext): Promise<number> {
  const rules = await prisma.automationRule.findMany({
    where: { companyId: ctx.companyId, trigger, isActive: true },
  })

  let executed = 0

  for (const rule of rules) {
    try {
      // Condiciones simples tipo {minAmount: 10000} — comparación >= sobre
      // ctx.data[key]. No es un motor de reglas genérico (sin AND/OR
      // complejos), pero cubre el caso real de "solo si el monto supera X".
      const conditions = (rule.conditions as Record<string, number> | null) ?? {}
      const passesConditions = Object.entries(conditions).every(([key, minValue]) => {
        const actual = ctx.data[key]
        return typeof actual === 'number' ? actual >= minValue : true
      })

      if (!passesConditions) {
        await prisma.automationLog.create({
          data: { ruleId: rule.id, triggeredBy: `${ctx.entityType}:${ctx.entityId}`, status: 'SKIPPED' },
        })
        continue
      }

      const actions = (rule.actions as unknown as AutomationAction[]) ?? []
      const results = []
      let allOk = true
      for (const action of actions) {
        const result = await executeAction(action, ctx)
        results.push({ type: action.type, ...result })
        if (!result.ok) allOk = false
      }

      await prisma.automationLog.create({
        data: {
          ruleId: rule.id,
          triggeredBy: `${ctx.entityType}:${ctx.entityId}`,
          status: allOk ? 'SUCCESS' : 'FAILED',
          actionsRun: results,
        },
      })

      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { lastRunAt: new Date(), runCount: { increment: 1 } },
      })

      executed++
    } catch (err: any) {
      await prisma.automationLog.create({
        data: { ruleId: rule.id, triggeredBy: `${ctx.entityType}:${ctx.entityId}`, status: 'FAILED', error: err.message },
      })
    }
  }

  return executed
}
