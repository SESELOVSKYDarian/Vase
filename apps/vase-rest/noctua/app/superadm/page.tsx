'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSuperAdmStore } from '@/store/superadmStore';
import { LayoutDashboard, UtensilsCrossed, ShoppingCart, ChefHat, Truck, Palette, Table, ArrowRight } from 'lucide-react';

const quickLinks = [
  { id: 'mesas', name: 'Mesas', path: '/superadm/mesas', icon: Table, desc: 'Gestiona zonas y mesas', color: 'text-blue-400' },
  { id: 'cocina', name: 'Cocina', path: '/superadm/cocina', icon: ChefHat, desc: 'Estados de cocina', color: 'text-red-400' },
  { id: 'stock', name: 'Stock', path: '/superadm/stock', icon: ShoppingCart, desc: 'Productos y stock', color: 'text-green-400' },
  { id: 'delivery', name: 'Delivery', path: '/superadm/delivery', icon: Truck, desc: 'Apps de delivery', color: 'text-violet-400' },
  { id: 'diseno', name: 'Diseño', path: '/superadm/diseno', icon: Palette, desc: 'Estilos y temas', color: 'text-pink-400' },
];

export default function SuperAdmDashboardPage() {
  const { config, isDirty, initializeConfig, saveAll } = useSuperAdmStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await initializeConfig();
      setLoading(false);
    };
    load();
  }, [initializeConfig]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#676b67]">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Resumen</h1>
          <p className="text-[#676b67]">Configuración global del sistema</p>
        </div>
        {isDirty && (
          <button
            onClick={saveAll}
            className="px-6 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
          >
            Guardar cambios
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#101010] border border-[#252525] rounded-2xl p-6">
          <div className="text-sm text-[#676b67] mb-1">Zonas</div>
          <div className="text-3xl font-bold text-white">{config.zones?.length || 0}</div>
        </div>
        <div className="bg-[#101010] border border-[#252525] rounded-2xl p-6">
          <div className="text-sm text-[#676b67] mb-1">Categorías</div>
          <div className="text-3xl font-bold text-white">{config.menuCategories?.length || 0}</div>
        </div>
        <div className="bg-[#101010] border border-[#252525] rounded-2xl p-6">
          <div className="text-sm text-[#676b67] mb-1">Apps de Delivery</div>
          <div className="text-3xl font-bold text-white">{config.deliveryApps?.filter((a) => a.isActive).length || 0}</div>
        </div>
        <div className="bg-[#101010] border border-[#252525] rounded-2xl p-6">
          <div className="text-sm text-[#676b67] mb-1">Estados de Cocina</div>
          <div className="text-3xl font-bold text-white">{config.kitchenStatuses?.length || 0}</div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Accesos rápidos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link href={link.path} key={link.id}>
              <div className="group bg-[#101010] border border-[#252525] rounded-2xl p-6 hover:border-violet-500/30 hover:bg-[#151515] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#0d0d0d] ${link.color}`}>
                    <Icon size={24} />
                  </div>
                  <ArrowRight size={20} className="text-[#676b67] group-hover:text-violet-400 transition-colors" />
                </div>
                <div className="text-lg font-bold text-white mb-1">{link.name}</div>
                <div className="text-sm text-[#676b67]">{link.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
