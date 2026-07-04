// components/layout/Header.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { cn } from '@/utils'
import type { SessionUser } from '@/types'
import {
  Search, Sun, Moon, LogOut, Settings, User,
  ChevronDown, Building2, HelpCircle
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { NotificationsBell } from './NotificationsBell'
import { AnimatePresence, m } from 'motion/react'

interface HeaderProps {
  user: SessionUser
}

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)

  async function handleSignOut() {
    await signOut({ callbackUrl: '/auth/login' })
  }

  return (
    <header className="glass-panel sticky top-0 z-30 mx-2 mt-2 flex h-16 flex-shrink-0 items-center gap-3 rounded-2xl px-3 sm:mx-3 sm:px-4">
      {/* Búsqueda global */}
      <div className="ml-11 max-w-xl flex-1 lg:ml-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Búsqueda global"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                router.push(`/dashboard/search?q=${encodeURIComponent(search.trim())}`)
                setSearch('')
              }
            }}
            type="search"
            placeholder="Buscar clientes, productos, facturas..."
            className="h-11 w-full rounded-xl border border-border bg-muted/45 pl-10 pr-12 text-sm shadow-none transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
            ↵
          </kbd>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Notificaciones */}
        <NotificationsBell />

        {/* Toggle tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
          className="ui-icon-button"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Menú usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
            className="flex min-h-11 items-center gap-2 rounded-full px-2 transition-colors hover:bg-accent sm:px-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/20">
              <span className="text-[11px] font-bold text-primary">
                {user.name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-foreground leading-none">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">{user.roleName ?? 'Usuario'}</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
          </button>

          <AnimatePresence>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <m.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="glass-panel absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl"
              >
                {/* Info empresa */}
                {user.companyName && (
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{user.companyName}</p>
                        <p className="text-[10px] text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="py-1">
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <User size={15} className="text-muted-foreground" />
                    Mi perfil
                  </Link>
                  <Link
                    href="/dashboard/multiempresa"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Settings size={15} className="text-muted-foreground" />
                    Configuración
                  </Link>
                  <Link
                    href="/dashboard/ayuda"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <HelpCircle size={15} className="text-muted-foreground" />
                    Ayuda
                  </Link>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </m.div>
            </>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
