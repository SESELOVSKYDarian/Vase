// app/dashboard/stock/critico/page.tsx
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatNumber, formatCurrency } from '@/utils'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Stock Crítico' }

export default async function StockCriticoPage() {
  const session = await auth()
  if (!session?.user?.companyId) return null

  const products = await prisma.product.findMany({
    where: { companyId: session.user.companyId, isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { stock: 'asc' },
  })

  const critical = products.filter((p) => Number(p.stock) <= Number(p.minStock))
  const warning = products.filter((p) => Number(p.stock) > Number(p.minStock) && Number(p.stock) <= Number(p.minStock) * 1.5)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Crítico</h1>
          <p className="page-subtitle">Productos que requieren reposición inmediata</p>
        </div>
        <Link href="/dashboard/compras" className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          Nueva orden de compra
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-red-600" />
            <span className="font-semibold text-red-800 dark:text-red-300">Sin stock / Crítico</span>
          </div>
          <p className="text-3xl font-bold text-red-700 dark:text-red-400">{critical.length}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">productos bajo el mínimo</p>
        </div>
        <div className="rounded-xl border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-yellow-600" />
            <span className="font-semibold text-yellow-800 dark:text-yellow-300">Stock bajo</span>
          </div>
          <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{warning.length}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">productos cerca del mínimo</p>
        </div>
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={20} className="text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-300">Stock OK</span>
          </div>
          <p className="text-3xl font-bold text-green-700 dark:text-green-400">{products.length - critical.length - warning.length}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">productos con stock suficiente</p>
        </div>
      </div>

      {/* Tabla críticos */}
      {critical.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <h3 className="font-semibold flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle size={16} />Productos bajo el mínimo ({critical.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Categoría</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Stock actual</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Mínimo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Faltante</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Costo reponer</th>
              </tr>
            </thead>
            <tbody>
              {critical.map((p) => {
                const shortage = Number(p.minStock) - Number(p.stock)
                const replenishCost = shortage * Number(p.cost)
                return (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{p.code}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.category ? <span className="badge-neutral">{p.category.name}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-red-600">{formatNumber(p.stock, 0)}</span>
                      <span className="text-xs text-muted-foreground ml-1">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{formatNumber(p.minStock, 0)} {p.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-orange-600">-{formatNumber(shortage, 0)} {p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell font-mono text-sm">{formatCurrency(replenishCost)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {critical.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="font-bold text-lg mb-1">¡Excelente! Todo el stock está en orden</h3>
          <p className="text-muted-foreground text-sm">No hay productos por debajo del stock mínimo configurado.</p>
        </div>
      )}
    </div>
  )
}
