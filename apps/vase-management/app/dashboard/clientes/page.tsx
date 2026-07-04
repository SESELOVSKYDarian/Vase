// app/dashboard/clientes/page.tsx
import { Metadata } from 'next'
import { ClientesTable } from '@/components/modules/clientes/ClientesTable'

export const metadata: Metadata = { title: 'Clientes' }

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Administrá tu cartera de clientes</p>
        </div>
      </div>
      <ClientesTable />
    </div>
  )
}
