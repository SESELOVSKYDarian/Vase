// app/dashboard/stock/page.tsx
import { Metadata } from 'next'
import { StockInventario } from '@/components/modules/stock/StockInventario'

export const metadata: Metadata = { title: 'Stock e Inventario' }

export default function StockPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock e Inventario</h1>
          <p className="page-subtitle">Control de existencias y movimientos de stock</p>
        </div>
      </div>
      <StockInventario />
    </div>
  )
}
