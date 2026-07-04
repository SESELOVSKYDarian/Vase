// app/dashboard/ventas/page.tsx
import { Metadata } from 'next'
import { VentasTable } from '@/components/modules/ventas/VentasTable'

export const metadata: Metadata = { title: 'Ventas' }

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Gestión de ventas, pedidos y presupuestos</p>
        </div>
      </div>
      <VentasTable />
    </div>
  )
}
