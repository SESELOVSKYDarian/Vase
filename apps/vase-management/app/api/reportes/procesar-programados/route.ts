// app/api/reportes/procesar-programados/route.ts
//
// Procesa todos los SavedReportSchedule cuyo nextRunAt ya pasó: ejecuta el
// reporte, guarda el ReportExecution, y calcula el próximo nextRunAt.
//
// IMPORTANTE — esto NO se dispara solo. El schema y el flujo de guardado ya
// existían de una etapa anterior, pero nunca había un endpoint que
// efectivamente ejecutara los reportes vencidos: las reglas quedaban
// guardadas sin nadie que las corriera. Este endpoint cierra ese hueco,
// pero sigue necesitando algo externo que lo llame periódicamente — Vercel
// Cron, un cron de sistema operativo, o un servicio como cron-job.org
// pegándole a esta URL cada N minutos con el CRON_SECRET correcto.
// No hay ningún scheduler corriendo dentro de la app Next.js misma (Next.js
// no tiene un runtime de background jobs propio).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executeReport } from '@/lib/reports/executor'
import { computeNextRun } from '@/lib/reports/schedule'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado — este endpoint está deshabilitado por seguridad' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const now = new Date()
  const dueSchedules = await prisma.savedReportSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { report: true },
  })

  const results: { scheduleId: string; reportName: string; status: string; error?: string }[] = []

  for (const schedule of dueSchedules) {
    const execution = await prisma.reportExecution.create({
      data: { reportId: schedule.reportId, status: 'RUNNING' },
    })

    try {
      const start = Date.now()
      const result = await executeReport(schedule.report, schedule.report.companyId)
      const duration = Date.now() - start

      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED', rowCount: result.rows?.length ?? 0, duration },
      })

      const nextRunAt = computeNextRun({
        frequency: schedule.frequency, dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth, time: schedule.time,
      })
      await prisma.savedReportSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt },
      })

      results.push({ scheduleId: schedule.id, reportName: schedule.report.name, status: 'COMPLETED' })
    } catch (err: any) {
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', error: err.message },
      })
      results.push({ scheduleId: schedule.id, reportName: schedule.report.name, status: 'FAILED', error: err.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
