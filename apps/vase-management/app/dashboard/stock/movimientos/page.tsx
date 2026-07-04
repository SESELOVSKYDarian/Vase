// app/dashboard/stock/movimientos/page.tsx
import { Metadata } from 'next'
import { MovimientosStock } from '@/components/modules/stock/MovimientosStock'

export const metadata: Metadata = { title: 'Movimientos de Stock' }

export default function MovimientosPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Movimientos de Stock</h1>
          <p className="page-subtitle">Historial completo de entradas, salidas y ajustes</p>
        </div>
      </div>
      <MovimientosStock />
    </div>
  )
}
