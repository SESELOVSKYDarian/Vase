// app/dashboard/contabilidad/page.tsx
import { Metadata } from 'next'
import { ContabilidadPanel } from '@/components/modules/contabilidad/ContabilidadPanel'

export const metadata: Metadata = { title: 'Contabilidad' }

export default function ContabilidadPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contabilidad</h1>
          <p className="page-subtitle">Libros IVA, plan de cuentas y exportación para contador</p>
        </div>
      </div>
      <ContabilidadPanel />
    </div>
  )
}
