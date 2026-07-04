// app/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor, calcPercentChange } from '@/utils'
import { DashboardCharts } from '@/components/modules/dashboard/DashboardCharts'
import { 
  TrendingUp, TrendingDown, Users, Package, AlertTriangle, 
  DollarSign, ShoppingCart, FileText, Wallet, ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils'

async function getDashboardData(companyId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    salesThisMonth,
    salesLastMonth,
    pendingReceivables,
    cashMovements,
    lowStockProducts,
    recentSales,
    topProducts,
    topCustomers,
  ] = await Promise.all([
    // Ventas este mes
    prisma.sale.aggregate({
      where: { companyId, date: { gte: startOfMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
      _sum: { total: true },
      _count: true,
    }),
    // Ventas mes pasado
    prisma.sale.aggregate({
      where: { companyId, date: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
      _sum: { total: true },
    }),
    // Cuentas por cobrar
    prisma.sale.aggregate({
      where: { companyId, status: { in: ['INVOICED', 'DELIVERED'] }, paidAmount: { lt: prisma.sale.fields.total as any } },
      _sum: { total: true },
    }),
    // Caja
    prisma.cashMovement.groupBy({
      by: ['type'],
      where: { companyId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    // Productos con stock bajo
    prisma.product.findMany({
      where: { companyId, isActive: true },
      take: 50,
      select: { id: true, code: true, name: true, stock: true, minStock: true },
    }),
    // Últimas ventas
    prisma.sale.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
    // Top productos vendidos
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { companyId, date: { gte: startOfMonth } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),
    // Top clientes
    prisma.sale.groupBy({
      by: ['customerId'],
      where: { companyId, date: { gte: startOfMonth }, customerId: { not: null } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),
  ])

  // Resolver nombres de productos y clientes
  const topProductIds = topProducts.map((tp: any) => tp.productId)
  const topCustomerIds = topCustomers.map((tc: any) => tc.customerId).filter(Boolean) as string[]

  const [productDetails, customerDetails] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true, code: true } }),
    prisma.customer.findMany({ where: { id: { in: topCustomerIds } }, select: { id: true, name: true } }),
  ])

  const income = cashMovements.find((m: any) => m.type === 'INCOME')?._sum?.amount ?? 0
  const expense = cashMovements.find((m: any) => m.type === 'EXPENSE')?._sum?.amount ?? 0

  const filteredLowStock = lowStockProducts.filter((p: any) => Number(p.stock) <= Number(p.minStock)).slice(0, 5)

  return {
    salesAmount: Number(salesThisMonth._sum.total ?? 0),
    salesCount: salesThisMonth._count,
    salesLastMonthAmount: Number(salesLastMonth._sum.total ?? 0),
    pendingReceivables: Number(pendingReceivables._sum.total ?? 0),
    cashBalance: Number(income) - Number(expense),
    lowStockProducts: filteredLowStock,
    lowStockCount: filteredLowStock.length,
    recentSales,
    topProducts: topProducts.map((tp: any) => ({
      ...tp,
      product: productDetails.find((p) => p.id === tp.productId),
    })),
    topCustomers: topCustomers.map((tc: any) => ({
      ...tc,
      customer: customerDetails.find((c) => c.id === tc.customerId),
    })),
  }
}

// Datos del gráfico de ventas
async function getSalesChartData(companyId: string) {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
  }

  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      date: { gte: days[0] },
      status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] },
    },
    select: { date: true, total: true, type: true },
  })

  return days.map((d) => {
    const daySales = sales.filter((s) => {
      const sd = new Date(s.date)
      return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth()
    })
    return {
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      ventas: daySales.reduce((sum, s) => sum + Number(s.total), 0),
    }
  })
}

export default async function DashboardPage() {
  const session = await auth()
  const companyId = session?.user?.companyId

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No tenés empresa asignada. Contactá al administrador.</p>
      </div>
    )
  }

  const [data, chartData] = await Promise.all([
    getDashboardData(companyId),
    getSalesChartData(companyId),
  ])

  const salesChange = calcPercentChange(data.salesAmount, data.salesLastMonthAmount)

  const metrics = [
    {
      title: 'Ventas del mes',
      value: formatCurrency(data.salesAmount),
      sub: `${data.salesCount} operaciones`,
      change: salesChange,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/dashboard/ventas',
    },
    {
      title: 'Caja este mes',
      value: formatCurrency(data.cashBalance),
      sub: 'Ingresos menos egresos',
      icon: Wallet,
      color: data.cashBalance >= 0 ? 'text-green-600' : 'text-red-600',
      bg: data.cashBalance >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      href: '/dashboard/tesoreria',
    },
    {
      title: 'Por cobrar',
      value: formatCurrency(data.pendingReceivables),
      sub: 'Facturas pendientes',
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      href: '/dashboard/tesoreria/cobrar',
    },
    {
      title: 'Stock crítico',
      value: String(data.lowStockCount),
      sub: 'Productos bajo mínimo',
      icon: AlertTriangle,
      color: data.lowStockCount > 0 ? 'text-red-600' : 'text-green-600',
      bg: data.lowStockCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20',
      href: '/dashboard/stock/critico',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenido, {session?.user?.name}. Aquí está el resumen de tu empresa.
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Link key={metric.title} href={metric.href} className="metric-card group">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', metric.bg)}>
                  <Icon size={20} className={metric.color} />
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{metric.value}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {metric.change !== undefined && (
                    <span className={cn(
                      'text-xs font-medium flex items-center gap-0.5',
                      metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {metric.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(metric.change).toFixed(1)}% vs mes anterior
                    </span>
                  )}
                  {metric.change === undefined && (
                    <span className="text-xs text-muted-foreground">{metric.sub}</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Gráfico de ventas */}
      <DashboardCharts data={chartData} />

      {/* Tablas inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas ventas */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Últimas ventas</h3>
            <Link href="/dashboard/ventas" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Total</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale: any) => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/ventas/${sale.id}`} className="font-medium hover:text-primary transition-colors">
                        {sale.customer?.name ?? 'Consumidor Final'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(sale.date)}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatCurrency(sale.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={getStatusColor(sale.status)}>{getStatusLabel(sale.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock crítico */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Stock crítico
            </h3>
            <Link href="/dashboard/stock/critico" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Package size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">¡Excelente! No hay productos con stock bajo.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.lowStockProducts.map((product: any) => (
                <div key={product.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.code}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-red-600">{Number(product.stock).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">mín: {Number(product.minStock).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
