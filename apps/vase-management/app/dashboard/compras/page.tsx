// app/dashboard/compras/page.tsx
import { Metadata } from 'next'
import { ComprasPanel } from '@/components/modules/compras/ComprasPanel'

export const metadata: Metadata = { title: 'Compras' }

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Órdenes de compra y facturas de proveedores</p>
        </div>
      </div>
      <ComprasPanel />
    </div>
  )
}
