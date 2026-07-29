'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, UtensilsCrossed, ChefHat,
  Package, Truck, Palette, Settings, Users
} from 'lucide-react';

const sections = [
  { id: 'dashboard', name: 'Resumen', path: '/superadm', icon: LayoutDashboard },
  { id: 'mesas', name: 'Mesas', path: '/superadm/mesas', icon: UtensilsCrossed },
  { id: 'cocina', name: 'Cocina', path: '/superadm/cocina', icon: ChefHat },
  { id: 'stock', name: 'Stock', path: '/superadm/stock', icon: Package },
  { id: 'delivery', name: 'Delivery', path: '/superadm/delivery', icon: Truck },
  { id: 'mozos', name: 'Mozos', path: '/superadm/mozos', icon: Users },
  { id: 'diseno', name: 'Diseño', path: '/superadm/diseno', icon: Palette },
  { id: 'configuracion', name: 'Configuración', path: '/superadm/configuracion', icon: Settings },
];

export function SuperAdmSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-[#0d0d0d] border-r border-[#252525] h-screen flex flex-col">
      <div className="p-6 border-b border-[#252525]">
        <h1 className="text-2xl font-black text-violet-400 tracking-widest">NOCTUA</h1>
        <p className="text-[#676b67] text-xs uppercase mt-1">SUPER ADMIN</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = pathname === section.path;
          return (
            <Link href={section.path} key={section.id}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-[#676b67] hover:text-white hover:bg-[#151515]'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{section.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
