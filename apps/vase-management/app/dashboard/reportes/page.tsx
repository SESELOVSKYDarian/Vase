// app/dashboard/reportes/page.tsx
import { Metadata } from 'next'
import { ReportesPanel } from '@/components/modules/reportes/ReportesPanel'

export const metadata: Metadata = { title: 'Reportes' }

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Análisis de ventas, compras, stock y más</p>
        </div>
      </div>
      <ReportesPanel />
    </div>
  )
}
