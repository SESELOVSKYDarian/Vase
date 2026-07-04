// components/layout/Sidebar.tsx — v2.0 ERP Completo
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/utils'
import type { SessionUser } from '@/types'
import { AnimatePresence, m } from 'motion/react'
import { BrandMark } from '@/components/ui/BrandMark'
import {
  LayoutDashboard, Users, Package, Layers, ShoppingCart,
  Receipt, Wallet, BookOpen, BarChart2, Bot, Building2,
  ChevronDown, Menu, X, TrendingUp, Truck, Bell,
  Settings, Wrench, FileText, PieChart, Zap,
  Map, Archive, AlertCircle, Database, Shield,
  Tag, FolderOpen, DollarSign, RefreshCw, Monitor
} from 'lucide-react'

interface NavChild { title: string; href: string }
interface NavItem {
  title: string; href?: string
  icon: React.ReactNode
  badge?: number
  children?: NavChild[]
  section?: string
}

const buildNav = (alertCount: number, isSuperAdmin: boolean): NavItem[] => [
  { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={17} /> },
  { title: 'Punto de Venta', href: '/dashboard/pos', icon: <Monitor size={17} /> },

  // ─── VENTAS ────────────────────────────────────────────────────────
  {
    title: 'Ventas', icon: <TrendingUp size={17} />, section: 'COMERCIAL',
    children: [
      { title: 'Presupuestos', href: '/dashboard/ventas?tipo=BUDGET' },
      { title: 'Pedidos', href: '/dashboard/ventas?tipo=ORDER' },
      { title: 'Remitos', href: '/dashboard/ventas?tipo=REMITO' },
      { title: 'Ventas / Tickets', href: '/dashboard/ventas' },
    ],
  },
  {
    title: 'Facturación', icon: <Receipt size={17} />,
    children: [
      { title: 'Todas las facturas', href: '/dashboard/facturacion' },
      { title: 'Notas de crédito', href: '/dashboard/facturacion?tipo=CREDIT_NOTE' },
      { title: 'Notas de débito', href: '/dashboard/facturacion?tipo=DEBIT_NOTE' },
    ],
  },
  {
    title: 'Clientes', icon: <Users size={17} />,
    children: [
      { title: 'Listado', href: '/dashboard/clientes' },
      { title: 'Grupos', href: '/dashboard/clientes/grupos' },
      { title: 'Estado de cuenta', href: '/dashboard/clientes/estado-cuenta' },
      { title: 'Riesgo crediticio', href: '/dashboard/clientes/riesgo' },
    ],
  },

  // ─── COMPRAS ───────────────────────────────────────────────────────
  {
    title: 'Compras', icon: <ShoppingCart size={17} />, section: 'COMPRAS',
    children: [
      { title: 'Órdenes de compra', href: '/dashboard/compras' },
      { title: 'Facturas de compra', href: '/dashboard/compras/facturas' },
      { title: 'Proveedores', href: '/dashboard/compras/proveedores' },
      { title: 'Cuentas por pagar', href: '/dashboard/tesoreria/pagar' },
    ],
  },

  // ─── STOCK ─────────────────────────────────────────────────────────
  {
    title: 'Stock', icon: <Layers size={17} />, section: 'OPERACIONES',
    children: [
      { title: 'Inventario general', href: '/dashboard/stock' },
      { title: 'Movimientos', href: '/dashboard/stock/movimientos' },
      { title: 'Depósitos', href: '/dashboard/stock/depositos' },
      { title: 'Transferencias', href: '/dashboard/stock/transferencias' },
      { title: 'Ajustes / Regulariz.', href: '/dashboard/stock/ajustes' },
      { title: 'Kardex por producto', href: '/dashboard/stock/kardex' },
      { title: 'Stock crítico', href: '/dashboard/stock/critico' },
    ],
  },
  {
    title: 'Productos', icon: <Package size={17} />,
    children: [
      { title: 'Catálogo', href: '/dashboard/productos' },
      { title: 'Categorías', href: '/dashboard/productos/categorias' },
      { title: 'Familias', href: '/dashboard/productos/familias' },
      { title: 'Marcas', href: '/dashboard/productos/marcas' },
    ],
  },

  // ─── DISTRIBUCIÓN ──────────────────────────────────────────────────
  {
    title: 'Distribución', icon: <Truck size={17} />, section: 'DISTRIBUCIÓN',
    children: [
      { title: 'Rutas', href: '/dashboard/distribucion/rutas' },
      { title: 'Hoja de ruta', href: '/dashboard/distribucion/hoja-ruta' },
      { title: 'Entregas pendientes', href: '/dashboard/distribucion/pendientes' },
    ],
  },

  // ─── TESORERÍA ─────────────────────────────────────────────────────
  {
    title: 'Tesorería', icon: <Wallet size={17} />, section: 'FINANZAS',
    children: [
      { title: 'Resumen', href: '/dashboard/tesoreria' },
      { title: 'Caja diaria', href: '/dashboard/tesoreria/caja' },
      { title: 'Bancos', href: '/dashboard/tesoreria/bancos' },
      { title: 'Cheques', href: '/dashboard/tesoreria/cheques' },
      { title: 'Cuentas por cobrar', href: '/dashboard/tesoreria/cobrar' },
      { title: 'Cuentas por pagar', href: '/dashboard/tesoreria/pagar' },
      { title: 'Flujo de fondos', href: '/dashboard/tesoreria/flujo' },
    ],
  },
  {
    title: 'Contabilidad', icon: <BookOpen size={17} />,
    children: [
      { title: 'IVA Ventas', href: '/dashboard/contabilidad' },
      { title: 'IVA Compras', href: '/dashboard/contabilidad?tab=compras' },
      { title: 'Plan de cuentas', href: '/dashboard/contabilidad?tab=cuentas' },
    ],
  },

  // ─── REPORTES ──────────────────────────────────────────────────────
  {
    title: 'Reportes', icon: <BarChart2 size={17} />, section: 'ANÁLISIS',
    children: [
      { title: 'Reportes predefinidos', href: '/dashboard/reportes' },
      { title: 'Reportes guardados', href: '/dashboard/reportes/guardados' },
      { title: 'Generador con IA', href: '/dashboard/reportes/generador' },
      { title: 'Exportar', href: '/dashboard/reportes/exportar' },
    ],
  },
  {
    title: 'Asistente IA', icon: <Bot size={17} />,
    children: [
      { title: 'Chat de consultas', href: '/dashboard/asistente-ia' },
      { title: 'Generar reportes IA', href: '/dashboard/reportes/generador' },
    ],
  },
  { title: 'Automatizaciones', href: '/dashboard/automatizaciones', icon: <Zap size={17} /> },

  // ─── CONFIGURACIÓN ─────────────────────────────────────────────────
  {
    title: 'Configuración', icon: <Settings size={17} />, section: 'SISTEMA',
    children: [
      { title: 'Empresa', href: '/dashboard/configuracion' },
      { title: 'Sucursales', href: '/dashboard/configuracion?tab=sucursales' },
      { title: 'Puntos de venta', href: '/dashboard/configuracion?tab=pdv' },
      { title: 'Usuarios y roles', href: '/dashboard/configuracion?tab=usuarios' },
    ],
  },
  {
    title: 'Alertas',
    icon: <Bell size={17} />,
    href: '/dashboard/alertas',
    badge: alertCount > 0 ? alertCount : undefined,
  },
  {
    title: 'Multi-empresa', icon: <Building2 size={17} />,
    href: '/dashboard/multiempresa',
  },
  {
    title: 'Utilidades', icon: <Wrench size={17} />,
    children: [
      { title: 'Cierre de día', href: '/dashboard/utilidades/cierre' },
      { title: 'Procesos', href: '/dashboard/utilidades/procesos' },
      { title: 'Auditoría', href: '/dashboard/utilidades/auditoria' },
    ],
  },
  ...(isSuperAdmin ? [{
    title: 'Super Admin', icon: <Shield size={17} />,
    href: '/dashboard/super-admin', section: 'PLATAFORMA',
  }] : []),
]

interface Props { user: SessionUser }

export function isSidebarRouteActive(
  pathname: string,
  searchParams: Pick<URLSearchParams, 'get' | 'has'>,
  href: string
) {
  const [targetPath, query = ''] = href.split('?')
  if (pathname !== targetPath) {
    return !query && targetPath !== '/dashboard' && pathname.startsWith(`${targetPath}/`)
  }

  const required = new URLSearchParams(query)
  if ([...required].some(([key, value]) => searchParams.get(key) !== value)) return false

  const discriminatorByPath: Record<string, string> = {
    '/dashboard/ventas': 'tipo',
    '/dashboard/contabilidad': 'tab',
    '/dashboard/configuracion': 'tab',
  }
  const discriminator = discriminatorByPath[targetPath]
  if (!query && discriminator && searchParams.has(discriminator)) return false
  return true
}

export function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [openSections, setOpenSections] = useState<string[]>(['Ventas', 'Reportes'])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const isSuperAdmin = user.isSuperAdmin

  // Obtener conteo de alertas
  useEffect(() => {
    fetch('/api/alertas?unread=true&limit=1')
      .then(r => r.json())
      .then(d => { if (d.unreadCount !== undefined) setAlertCount(d.unreadCount) })
      .catch(() => {})
  }, [])

  // Auto-abrir sección activa
  useEffect(() => {
    const nav = buildNav(0, isSuperAdmin)
    for (const item of nav) {
      if (item.children?.some(c => isActive(c.href))) {
        setOpenSections(prev => prev.includes(item.title) ? prev : [...prev, item.title])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams, isSuperAdmin])

  const navItems = buildNav(alertCount, isSuperAdmin)

  function toggleSection(title: string) {
    setOpenSections(prev =>
      prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]
    )
  }

  function isActive(href: string) {
    return isSidebarRouteActive(pathname, searchParams, href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex h-[4.5rem] flex-shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <BrandMark showName={!collapsed} compact className="text-sidebar-foreground" />
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
          className="hidden h-10 w-10 items-center justify-center rounded-full text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
        >
          <Menu size={14} />
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {(() => {
          let lastSection = ''
          return navItems.map((item) => {
            const sectionHeader = item.section && item.section !== lastSection
              ? (() => { lastSection = item.section!; return item.section })()
              : null

            return (
              <div key={item.title}>
                {sectionHeader && !collapsed && (
                  <div className="px-2 pt-4 pb-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/30">{sectionHeader}</p>
                  </div>
                )}

                {item.href ? (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200',
                      isActive(item.href)
                        ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {isActive(item.href) && (
                          <m.span layoutId="sidebar-active" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                        )}
                        {item.badge !== undefined && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => !collapsed && toggleSection(item.title)}
                      className={cn(
                        'relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200',
                        item.children?.some(c => isActive(c.href))
                          ? 'bg-sidebar-accent text-sidebar-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.title}</span>
                          <ChevronDown
                            size={13}
                            className={cn('flex-shrink-0 transition-transform text-sidebar-foreground/40',
                              openSections.includes(item.title) && 'rotate-180'
                            )}
                          />
                        </>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                    {!collapsed && openSections.includes(item.title) && item.children && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="ml-4 overflow-hidden border-l border-sidebar-border/60 pl-3"
                      >
                        {item.children.map(child => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'relative my-1 flex min-h-10 items-center rounded-lg px-3 py-2 text-xs transition-colors duration-200',
                              isActive(child.href)
                                ? 'bg-sidebar-primary/10 font-semibold text-sidebar-primary'
                                : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
                            )}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </m.div>
                    )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )
          })
        })()}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-3 py-3 flex-shrink-0">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 ring-1 ring-sidebar-primary/25">
            <span className="text-xs font-bold text-sidebar-primary">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-9 h-9 rounded-lg bg-sidebar-background border border-sidebar-border flex items-center justify-center shadow-lg"
      >
        <Menu size={17} className="text-sidebar-foreground" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
      {mobileOpen && (
        <m.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <m.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 top-0 w-[min(84vw,19rem)] bg-sidebar-background shadow-2xl"
          >
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent">
              <X size={16} />
            </button>
            <SidebarContent />
          </m.div>
        </m.div>
      )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={cn(
        'sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background shadow-[18px_0_50px_-38px_rgba(0,0,0,.65)] transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-[17rem]'
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}
