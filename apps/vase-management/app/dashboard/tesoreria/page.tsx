// app/dashboard/tesoreria/page.tsx
import { Metadata } from 'next'
import { TesoreriaPanel } from '@/components/modules/tesoreria/TesoreriaPanel'

export const metadata: Metadata = { title: 'Tesorería' }

export default function TesoreriaPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tesorería</h1>
          <p className="page-subtitle">Caja diaria, bancos y flujo de fondos</p>
        </div>
      </div>
      <TesoreriaPanel />
    </div>
  )
}
