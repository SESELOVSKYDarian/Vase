// app/dashboard/tesoreria/pagar/page.tsx
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, cn } from '@/utils'
import { DollarSign, AlertCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Cuentas por Pagar' }

export default async function PagarPage() {
  const session = await auth()
  if (!session?.user?.companyId) return null
  const companyId = session.user.companyId

  const purchases = await prisma.purchase.findMany({
    where: { companyId, status: { in: ['PENDING', 'PARTIAL', 'RECEIVED'] } },
    include: { supplier: { select: { name: true, phone: true, email: true } } },
    orderBy: { date: 'asc' },
  })

  const totalPending = purchases.reduce((sum, p) => sum + Number(p.total) - Number(p.paidAmount), 0)
  const now = new Date()
  const overdue = purchases.filter((p) => p.dueDate && new Date(p.dueDate) < now)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Cuentas por Pagar</h1><p className="page-subtitle">Compras y facturas pendientes de pago</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <DollarSign size={18} className="text-red-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Total a pagar</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-1">{purchases.length} facturas de proveedores</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <AlertCircle size={18} className="text-orange-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{overdue.length}</p>
          <p className="text-xs text-muted-foreground mt-1">facturas con fecha vencida</p>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Proveedor</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">N° Factura</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Fecha</th>
              <th className="table-cell text-left font-medium hidden lg:table-cell">Vencimiento</th>
              <th className="table-cell text-right font-medium">Total</th>
              <th className="table-cell text-right font-medium">Pendiente</th>
              <th className="table-cell text-center font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center py-16">
                <DollarSign size={36} className="mx-auto text-green-400 mb-3" />
                <p className="text-muted-foreground text-sm">No hay cuentas pendientes de pago 🎉</p>
              </td></tr>
            ) : purchases.map((p) => {
              const pendingAmount = Number(p.total) - Number(p.paidAmount)
              const isOverdue = p.dueDate && new Date(p.dueDate) < now
              return (
                <tr key={p.id} className={cn('table-row', isOverdue && 'bg-red-50/30 dark:bg-red-900/10')}>
                  <td className="table-cell font-medium">{p.supplier?.name}</td>
                  <td className="table-cell hidden sm:table-cell font-mono text-xs text-muted-foreground">{p.number ?? '—'}</td>
                  <td className="table-cell hidden md:table-cell text-muted-foreground">{formatDate(p.date)}</td>
                  <td className="table-cell hidden lg:table-cell">
                    {p.dueDate
                      ? <span className={cn('text-sm', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>{formatDate(p.dueDate)}</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="table-cell text-right font-mono">{formatCurrency(p.total)}</td>
                  <td className="table-cell text-right font-mono font-bold text-red-600">{formatCurrency(pendingAmount)}</td>
                  <td className="table-cell text-center">
                    {isOverdue
                      ? <span className="badge-error">Vencida</span>
                      : p.status === 'PARTIAL' ? <span className="badge-warning">Pago parcial</span>
                      : <span className="badge-warning">Pendiente</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
