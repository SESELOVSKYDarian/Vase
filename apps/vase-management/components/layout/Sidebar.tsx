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
  LayoutDashboard, Package, Receipt, Wallet, BarChart2,
  ChevronDown, Menu, X, Settings, Monitor, Factory
} from 'lucide-react'

interface NavChild { title: string; href: string; badge?: number }
interface NavItem {
  title: string; href?: string
  icon: React.ReactNode
  badge?: number
  children?: NavChild[]
  matchPrefixes?: string[]
}

const buildNav = (alertCount: number, isSuperAdmin: boolean): NavItem[] => [
  { title: 'Inicio', href: '/dashboard', icon: <LayoutDashboard size={17} /> },
  { title: 'Punto de Venta', href: '/dashboard/pos', icon: <Monitor size={17} /> },
  {
    title: 'Industria', icon: <Factory size={17} />, matchPrefixes: ['/dashboard/industria'],
    children: [
      { title: 'Panel industrial', href: '/dashboard/industria/dashboard' },
      { title: 'Clientes', href: '/dashboard/industria/clientes' },
      { title: 'Presupuestos', href: '/dashboard/industria/presupuestos' },
      { title: 'Producción', href: '/dashboard/industria/produccion' },
      { title: 'Entregas', href: '/dashboard/industria/entregas' },
      { title: 'Facturación', href: '/dashboard/industria/facturacion' },
      { title: 'Analíticas', href: '/dashboard/industria/analiticas' },
      { title: 'Configuración', href: '/dashboard/industria/configuracion' },
    ],
  },
  {
    title: 'Comercial', icon: <Receipt size={17} />,
    matchPrefixes: ['/dashboard/ventas', '/dashboard/facturacion', '/dashboard/clientes', '/dashboard/compras'],
    children: [
      { title: 'Ventas', href: '/dashboard/ventas' },
      { title: 'Facturación', href: '/dashboard/facturacion' },
      { title: 'Clientes', href: '/dashboard/clientes' },
      { title: 'Compras y proveedores', href: '/dashboard/compras' },
    ],
  },
  {
    title: 'Operaciones', icon: <Package size={17} />,
    matchPrefixes: ['/dashboard/stock', '/dashboard/productos', '/dashboard/deposito-ia', '/dashboard/distribucion'],
    children: [
      { title: 'Stock', href: '/dashboard/stock' },
      { title: 'Productos', href: '/dashboard/productos' },
      { title: 'Depósito IA', href: '/dashboard/deposito-ia' },
      { title: 'Distribución', href: '/dashboard/distribucion/rutas' },
    ],
  },
  {
    title: 'Finanzas', icon: <Wallet size={17} />,
    matchPrefixes: ['/dashboard/tesoreria', '/dashboard/contabilidad'],
    children: [
      { title: 'Tesorería', href: '/dashboard/tesoreria' },
      { title: 'Contabilidad', href: '/dashboard/contabilidad' },
    ],
  },
  {
    title: 'Análisis e IA', icon: <BarChart2 size={17} />,
    matchPrefixes: ['/dashboard/reportes', '/dashboard/asistente-ia', '/dashboard/automatizaciones'],
    children: [
      { title: 'Reportes', href: '/dashboard/reportes' },
      { title: 'Asistente IA', href: '/dashboard/asistente-ia' },
      { title: 'Automatizaciones', href: '/dashboard/automatizaciones' },
    ],
  },
  {
    title: 'Administración', icon: <Settings size={17} />,
    matchPrefixes: ['/dashboard/configuracion', '/dashboard/alertas', '/dashboard/multiempresa', '/dashboard/utilidades', '/dashboard/super-admin'],
    children: [
      { title: 'Configuración', href: '/dashboard/configuracion' },
      { title: 'Alertas', href: '/dashboard/alertas', badge: alertCount > 0 ? alertCount : undefined },
      { title: 'Multi-empresa', href: '/dashboard/multiempresa' },
      { title: 'Cierre de día', href: '/dashboard/utilidades/cierre' },
      { title: 'Auditoría', href: '/dashboard/utilidades/auditoria' },
      ...(isSuperAdmin ? [{ title: 'Super Admin', href: '/dashboard/super-admin' }] : []),
    ],
  },
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
  const [openSections, setOpenSections] = useState<string[]>([])
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
      if (isItemActive(item)) {
        setOpenSections([item.title])
        break
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams, isSuperAdmin])

  const navItems = buildNav(alertCount, isSuperAdmin)

  function isActive(href: string) {
    return isSidebarRouteActive(pathname, searchParams, href)
  }

  function isItemActive(item: NavItem) {
    return item.children?.some(child => isActive(child.href)) ||
      item.matchPrefixes?.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
      false
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
      <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        {navItems.map((item) => {
          const itemActive = item.href ? isActive(item.href) : isItemActive(item)
          const itemOpen = openSections.includes(item.title)
          return (
              <div key={item.title}>
                {item.href ? (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={itemActive ? 'page' : undefined}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      'relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200',
                      itemActive
                        ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {itemActive && (
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
                      onClick={() => {
                        if (collapsed) {
                          setCollapsed(false)
                          setOpenSections([item.title])
                          return
                        }
                        setOpenSections(itemOpen ? [] : [item.title])
                      }}
                      aria-expanded={!collapsed && itemOpen}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        'relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200',
                        itemActive
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
                              itemOpen && 'rotate-180'
                            )}
                          />
                        </>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                    {!collapsed && itemOpen && item.children && (
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
                            aria-current={isActive(child.href) ? 'page' : undefined}
                            className={cn(
                              'relative my-0.5 flex min-h-10 items-center rounded-lg px-3 py-2 text-xs transition-colors duration-200',
                              isActive(child.href)
                                ? 'bg-sidebar-primary/10 font-semibold text-sidebar-primary'
                                : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
                            )}
                          >
                            <span className="flex-1 truncate">{child.title}</span>
                            {child.badge !== undefined && (
                              <span className="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                                {child.badge > 9 ? '9+' : child.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </m.div>
                    )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )
          })}
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
        aria-label="Abrir navegación"
        className="fixed top-3 left-3 z-50 lg:hidden w-9 h-9 rounded-lg bg-sidebar border border-sidebar-border flex items-center justify-center shadow-lg"
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
            className="absolute bottom-0 left-0 top-0 w-[min(84vw,19rem)] bg-sidebar shadow-2xl"
          >
            <button onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent">
              <X size={16} />
            </button>
            <SidebarContent />
          </m.div>
        </m.div>
      )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={cn(
        'sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar shadow-[18px_0_50px_-38px_rgba(0,0,0,.65)] transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-[15.5rem]'
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}
