// components/modules/multiempresa/MultiempresaPanel.tsx
'use client'

import { useState } from 'react'
import { cn, formatDate, getIvaConditionLabel } from '@/utils'
import { Building2, MapPin, Users, CreditCard, Store, Package, ShoppingCart, ChevronRight, BadgeCheck, Globe } from 'lucide-react'

interface Props {
  company: any
}

const TAB_LABELS = [
  { id: 'info', label: 'Información', icon: Building2 },
  { id: 'sucursales', label: 'Sucursales', icon: MapPin },
  { id: 'pos', label: 'Puntos de venta', icon: Store },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
]

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'badge-error',
  ADMIN: 'badge-info',
  VENDEDOR: 'badge-success',
  COMPRAS: 'badge-warning',
  DEPOSITO: 'badge-neutral',
  CONTADOR: 'badge-neutral',
  USUARIO: 'badge-neutral',
}

export function MultiempresaPanel({ company }: Props) {
  const [tab, setTab] = useState('info')

  if (!company) return (
    <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
      No hay empresa configurada.
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header empresa */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
          <Building2 size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{company.name}</h2>
            <span className="badge-success flex items-center gap-1"><BadgeCheck size={12} /> Activa</span>
            <span className="badge-info">{company.plan}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{company.legalName}</p>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CreditCard size={12} />CUIT: {company.cuit}</span>
            {company.email && <span className="flex items-center gap-1"><Globe size={12} />{company.email}</span>}
            {company.city && <span className="flex items-center gap-1"><MapPin size={12} />{company.city}</span>}
          </div>
        </div>
        <div className="flex gap-4 text-center">
          {[
            { label: 'Clientes', value: company._count?.customers ?? 0, icon: Users },
            { label: 'Productos', value: company._count?.products ?? 0, icon: Package },
            { label: 'Ventas', value: company._count?.sales ?? 0, icon: ShoppingCart },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TAB_LABELS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Información general */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Datos fiscales</h3>
            {[
              { label: 'Razón social', value: company.legalName },
              { label: 'CUIT', value: company.cuit },
              { label: 'Condición IVA', value: getIvaConditionLabel(company.ivaCondition) },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-right">{item.value ?? '—'}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contacto y dirección</h3>
            {[
              { label: 'Dirección', value: company.address },
              { label: 'Ciudad', value: company.city },
              { label: 'Provincia', value: company.province },
              { label: 'Código Postal', value: company.postalCode },
              { label: 'Teléfono', value: company.phone },
              { label: 'Email', value: company.email },
              { label: 'Web', value: company.website },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-right">{item.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sucursales */}
      {tab === 'sucursales' && (
        <div className="space-y-3">
          {company.branches?.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground text-sm">No hay sucursales registradas.</div>
          ) : company.branches?.map((b: any) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', b.isMain ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted')}>
                  <MapPin size={18} className={b.isMain ? 'text-blue-600' : 'text-muted-foreground'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{b.name}</p>
                    {b.isMain && <span className="badge-info">Principal</span>}
                  </div>
                  {b.address && <p className="text-xs text-muted-foreground mt-0.5">{b.address}{b.city ? `, ${b.city}` : ''}</p>}
                  {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {/* Puntos de venta */}
      {tab === 'pos' && (
        <div className="space-y-3">
          {company.pointsOfSale?.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground text-sm">No hay puntos de venta.</div>
          ) : company.pointsOfSale?.map((pos: any) => (
            <div key={pos.id} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <span className="font-bold text-green-700 dark:text-green-400 text-sm">{String(pos.number).padStart(4, '0')}</span>
              </div>
              <div>
                <p className="font-medium">{pos.name}</p>
                <p className="text-xs text-muted-foreground">Punto de venta #{String(pos.number).padStart(4, '0')}</p>
              </div>
              <div className="ml-auto">
                <span className={pos.isActive ? 'badge-success' : 'badge-neutral'}>
                  {pos.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usuarios */}
      {tab === 'usuarios' && (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-border">
                <th className="table-cell text-left font-medium">Usuario</th>
                <th className="table-cell text-left font-medium hidden sm:table-cell">Email</th>
                <th className="table-cell text-center font-medium">Rol</th>
                <th className="table-cell text-center font-medium hidden md:table-cell">Estado</th>
              </tr>
            </thead>
            <tbody>
              {company.companyUsers?.length === 0 ? (
                <tr><td colSpan={4} className="table-cell text-center py-10 text-muted-foreground">No hay usuarios.</td></tr>
              ) : company.companyUsers?.map((cu: any) => (
                <tr key={cu.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-foreground">
                          {cu.user?.name?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <p className="font-medium">{cu.user?.name}</p>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-muted-foreground">{cu.user?.email}</td>
                  <td className="table-cell text-center">
                    <span className={ROLE_COLORS[cu.role?.name] ?? 'badge-neutral'}>{cu.role?.name}</span>
                  </td>
                  <td className="table-cell text-center hidden md:table-cell">
                    <span className={cu.isActive ? 'badge-success' : 'badge-neutral'}>
                      {cu.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
