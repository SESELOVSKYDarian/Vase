// app/api/ia/reportes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseReportIntent, ConversationMessage } from '@/lib/ai/report-parser'
import { executeReport } from '@/lib/reports/executor'
import { computeNextRun } from '@/lib/reports/schedule'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { message, history = [], action, intent, saveConfig } = body

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurada. Agregá tu clave en .env.local' }, { status: 503 })

    // ── Acción: Generar reporte a partir de intent ya parseado ──────────
    if (action === 'generate' && intent) {
      const report = {
        entity: intent.entity,
        filters: intent.filters ?? {},
        columns: intent.columns,
        orderBy: intent.orderBy,
        orderDir: intent.orderDir,
        dateRange: intent.dateRange ?? 'CURRENT_MONTH',
        dateFrom: intent.dateFrom,
        dateTo: intent.dateTo,
      }

      const result = await executeReport(report, session.user.companyId)

      // Registrar en BD para historial
      await prisma.aIReportRequest.create({
        data: {
          companyId: session.user.companyId,
          userId: session.user.id!,
          prompt: history[history.length - 1]?.content ?? 'Reporte generado',
          parsedIntent: intent,
          status: 'EXECUTED',
        },
      })

      return NextResponse.json({ data: result, success: true })
    }

    // ── Acción: Guardar reporte después de generarlo ────────────────────
    if (action === 'save' && intent && saveConfig) {
      const saved = await prisma.savedReport.create({
        data: {
          companyId: session.user.companyId,
          userId: session.user.id!,
          name: saveConfig.name,
          description: saveConfig.description,
          entity: intent.entity,
          filters: intent.filters,
          columns: intent.columns,
          orderBy: intent.orderBy,
          orderDir: intent.orderDir ?? 'desc',
          dateRange: saveConfig.dateRange ?? intent.dateRange ?? 'CURRENT_MONTH',
          format: saveConfig.format ?? 'TABLE',
          isScheduled: !!saveConfig.frequency && saveConfig.frequency !== 'no_save',
          ...(saveConfig.frequency && saveConfig.frequency !== 'no_save' && {
            schedules: {
              create: {
                frequency: saveConfig.frequency.toUpperCase(),
                time: saveConfig.time ?? '08:00',
                dayOfWeek: saveConfig.dayOfWeek,
                dayOfMonth: saveConfig.dayOfMonth,
                nextRunAt: computeNextRun({
                  frequency: saveConfig.frequency.toUpperCase(),
                  dayOfWeek: saveConfig.dayOfWeek, dayOfMonth: saveConfig.dayOfMonth, time: saveConfig.time,
                }),
              },
            },
          }),
        },
      })
      return NextResponse.json({ savedReport: saved, success: true })
    }

    // ── Acción principal: Parsear lenguaje natural ──────────────────────
    const typedHistory = (history as ConversationMessage[]).slice(-10) // máximo 10 mensajes de contexto
    const { intent: parsedIntent, reply, needsClarification } = await parseReportIntent(message, typedHistory, groqKey)

    return NextResponse.json({
      reply,
      intent: parsedIntent,
      needsClarification,
      postReportPrompt: !needsClarification ? '¿Querés guardar este reporte para usarlo de nuevo?' : null,
    })

  } catch (err) {
    console.error('[POST /api/ia/reportes]', err)
    return NextResponse.json({ error: 'Error al procesar la solicitud de IA' }, { status: 500 })
  }
}
