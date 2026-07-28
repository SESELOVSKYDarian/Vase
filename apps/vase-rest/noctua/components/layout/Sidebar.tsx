'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  Package,
  CalendarDays,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  History,
  Receipt,
  ShieldCheck,
  Truck,
  Headphones,
  Utensils,
  Tag,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/hooks/lib/utils';
import {
  LABEL_POR_SECCION,
  RUTA_POR_SECCION,
  obtenerSeccionesPorRol,
  type SeccionSistema,
} from '@/config/roles';

const NAV_ITEMS = [
  { seccion: 'analytics',      icon: LayoutDashboard },
  { seccion: 'mesas',          icon: UtensilsCrossed },
  { seccion: 'pedidos',        icon: ClipboardList },
  { seccion: 'cocina',         icon: ChefHat },
  { seccion: 'cajero',         icon: Receipt },
  { seccion: 'historial',      icon: History },
  { seccion: 'stock',          icon: Package },
  { seccion: 'platos',         icon: Utensils },
  { seccion: 'promociones',    icon: Tag },
  { seccion: 'delivery',       icon: Truck },
  { seccion: 'reservas',       icon: CalendarDays },
  { seccion: 'administracion', icon: ShieldCheck },
  { seccion: 'soporte',        icon: Headphones },
] satisfies {
  seccion: SeccionSistema;
  icon: typeof UtensilsCrossed;
}[];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const usuario = useAuthStore((s) => s.usuario);
  const [mobileOpen, setMobileOpen] = useState(false);
  const seccionesPermitidas = obtenerSeccionesPorRol(usuario?.rol);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#0d0d0d] border border-[#222] rounded-lg text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menú"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-[#080808] border-r border-[#1a1a1a] flex flex-col z-40 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-8 border-b border-[#1a1a1a]">
          <h1 className="font-display text-4xl font-black tracking-[0.15em] text-white leading-none">
            NOCTUA
          </h1>
          <p className="text-[#676B67] text-xs mt-1 tracking-widest uppercase">Panel de Gestión</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto" role="navigation" aria-label="Navegación principal">
          {NAV_ITEMS.filter(({ seccion }) =>
            seccionesPermitidas.includes(seccion)
          ).map(({ seccion, icon: Icon }) => {
            const href = RUTA_POR_SECCION[seccion];
            const label = LABEL_POR_SECCION[seccion];
            const isActive = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-white text-black'
                    : 'text-[#676B67] hover:text-white hover:bg-white/5'
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-black' : 'text-[#676B67] group-hover:text-white'
                  )}
                />
                {label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 bg-black rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-5 border-t border-[#1a1a1a]">
          {usuario && (
            <div className="mb-3 px-1">
              <p className="text-white text-sm font-semibold">{usuario.nombre}</p>
              <p className="text-[#676B67] text-xs capitalize">{usuario.rol}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-[#676B67] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
