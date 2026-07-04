// app/api/reportes/exportar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { executeReport } from '@/lib/reports/executor'
import { generateExcel } from '@/lib/export/excel'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { reportId, format = 'excel', rows, columns, title, summary } = body

    let reportData: { columns: any[]; rows: any[]; summary?: any } | null = null
    let reportTitle = title ?? 'Reporte'

    if (reportId) {
      // Ejecutar reporte guardado
      const report = await prisma.savedReport.findFirst({
        where: { id: reportId, companyId: session.user.companyId },
      })
      if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
      reportData = await executeReport(report, session.user.companyId)
      reportTitle = report.name
    } else if (rows && columns) {
      // Exportar datos pasados directamente
      reportData = { columns, rows, summary }
    }

    if (!reportData) return NextResponse.json({ error: 'Sin datos para exportar' }, { status: 400 })

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    })

    if (format === 'excel' || format === 'xlsx') {
      const buffer = generateExcel({
        title: reportTitle,
        subtitle: `Empresa: ${company?.name ?? ''}`,
        company: 'Vase Management',
        columns: reportData.columns,
        rows: reportData.rows,
        summary: reportData.summary,
        filename: reportTitle.toLowerCase().replace(/\s+/g, '_'),
      })

      // NextResponse espera BodyInit (Web API); Buffer de Node no siempre
      // satisface ese tipo bajo strict mode pese a ser compatible en runtime.
      // Uint8Array sí es un BodyInit válido y Buffer es un Uint8Array real.
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(reportTitle)}.xlsx"`,
          'Content-Length': buffer.length.toString(),
        },
      })
    }

    // Fallback: JSON
    return NextResponse.json({ data: reportData })
  } catch (err) {
    console.error('[POST /api/reportes/exportar]', err)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
