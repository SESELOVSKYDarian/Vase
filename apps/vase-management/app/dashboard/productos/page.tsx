// app/dashboard/productos/page.tsx
import { Metadata } from 'next'
import { ProductosTable } from '@/components/modules/productos/ProductosTable'

export const metadata: Metadata = { title: 'Productos' }

export default function ProductosPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Catálogo de productos y servicios</p>
        </div>
      </div>
      <ProductosTable />
    </div>
  )
}
