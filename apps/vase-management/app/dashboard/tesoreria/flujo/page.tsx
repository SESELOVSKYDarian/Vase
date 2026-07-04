// app/dashboard/tesoreria/flujo/page.tsx
import { Metadata } from 'next'
import { FlujoCajaPanel } from '@/components/modules/tesoreria/FlujoCajaPanel'

export const metadata: Metadata = { title: 'Flujo de Fondos' }

export default function FlujoPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Flujo de Fondos</h1><p className="page-subtitle">Evolución de ingresos y egresos en el tiempo</p></div>
      </div>
      <FlujoCajaPanel />
    </div>
  )
}
