// app/dashboard/tesoreria/cobrar/page.tsx
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, cn } from '@/utils'
import { DollarSign, AlertCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Cuentas por Cobrar' }

export default async function CobrarPage() {
  const session = await auth()
  if (!session?.user?.companyId) return null
  const companyId = session.user.companyId

  const pendingSales = await prisma.sale.findMany({
    where: { companyId, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
    include: { customer: { select: { name: true, phone: true, email: true } } },
    orderBy: { date: 'asc' },
  })

  const pending = pendingSales.filter((s) => Number(s.paidAmount) < Number(s.total))
  const totalPending = pending.reduce((sum, s) => sum + Number(s.total) - Number(s.paidAmount), 0)

  const now = new Date()
  const overdue = pending.filter((s) => s.dueDate && new Date(s.dueDate) < now)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Cuentas por Cobrar</h1><p className="page-subtitle">Ventas pendientes de cobro</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <DollarSign size={18} className="text-orange-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Total pendiente</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-1">{pending.length} operaciones</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle size={18} className="text-red-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
          <p className="text-xs text-muted-foreground mt-1">con fecha vencida</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <DollarSign size={18} className="text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Monto vencido</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(overdue.reduce((s, v) => s + Number(v.total) - Number(v.paidAmount), 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">en facturas vencidas</p>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Cliente</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Contacto</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Fecha</th>
              <th className="table-cell text-left font-medium hidden lg:table-cell">Vencimiento</th>
              <th className="table-cell text-right font-medium">Total</th>
              <th className="table-cell text-right font-medium">Pendiente</th>
              <th className="table-cell text-center font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center py-16">
                <DollarSign size={36} className="mx-auto text-green-400 mb-3" />
                <p className="text-muted-foreground text-sm">No hay cuentas pendientes de cobro 🎉</p>
              </td></tr>
            ) : pending.map((s) => {
              const pendingAmount = Number(s.total) - Number(s.paidAmount)
              const isOverdue = s.dueDate && new Date(s.dueDate) < now
              return (
                <tr key={s.id} className={cn('table-row', isOverdue && 'bg-red-50/30 dark:bg-red-900/10')}>
                  <td className="table-cell font-medium">{s.customer?.name ?? 'Consumidor Final'}</td>
                  <td className="table-cell hidden md:table-cell">
                    <div className="text-xs text-muted-foreground">
                      {s.customer?.phone && <p>{s.customer.phone}</p>}
                      {s.customer?.email && <p>{s.customer.email}</p>}
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-muted-foreground">{formatDate(s.date)}</td>
                  <td className="table-cell hidden lg:table-cell">
                    {s.dueDate
                      ? <span className={cn('text-sm', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>{formatDate(s.dueDate)}</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="table-cell text-right font-mono">{formatCurrency(s.total)}</td>
                  <td className="table-cell text-right font-mono font-bold text-red-600">{formatCurrency(pendingAmount)}</td>
                  <td className="table-cell text-center">
                    {isOverdue
                      ? <span className="badge-error">Vencida</span>
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
