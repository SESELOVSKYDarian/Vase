// app/dashboard/asistente-ia/page.tsx
import { Metadata } from 'next'
import { AsistenteIA } from '@/components/modules/ia/AsistenteIA'

export const metadata: Metadata = { title: 'Asistente IA' }

export default function AsistenteIAPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Asistente IA</h1>
          <p className="page-subtitle">Consultá datos de tu empresa con lenguaje natural</p>
        </div>
      </div>
      <AsistenteIA />
    </div>
  )
}
