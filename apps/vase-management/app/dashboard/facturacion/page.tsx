// app/dashboard/facturacion/page.tsx
import { Metadata } from 'next'
import { FacturacionTable } from '@/components/modules/facturacion/FacturacionTable'

export const metadata: Metadata = { title: 'Facturación' }

export default function FacturacionPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturación Electrónica</h1>
          <p className="page-subtitle">Comprobantes AFIP/ARCA — Facturas A, B, C y más</p>
        </div>
      </div>
      <FacturacionTable />
    </div>
  )
}
