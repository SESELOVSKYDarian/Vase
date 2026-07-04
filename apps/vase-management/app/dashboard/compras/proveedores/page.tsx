// app/dashboard/compras/proveedores/page.tsx
import { Metadata } from 'next'
import { ProveedoresTable } from '@/components/modules/compras/ProveedoresTable'

export const metadata: Metadata = { title: 'Proveedores' }

export default function ProveedoresPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">Administrá tu cartera de proveedores</p>
        </div>
      </div>
      <ProveedoresTable />
    </div>
  )
}
