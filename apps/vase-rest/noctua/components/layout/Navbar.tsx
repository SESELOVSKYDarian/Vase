'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Wifi } from 'lucide-react';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard/mesas': 'Mesas',
  '/dashboard/pedido': 'Pedidos',
  '/dashboard/cocina': 'Cocina — KDS',
  '/dashboard/historial': 'Historial de Pedidos',
  '/dashboard/stock': 'Stock',
  '/dashboard/reservas': 'Reservas',
};

export function Navbar() {
  const pathname = usePathname();
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDate(
        now.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pageLabel = PAGE_LABELS[pathname] ?? 'NOCTUA';

  return (
    <header className="h-14 bg-[#080808] border-b border-[#1a1a1a] flex items-center justify-between px-6 sticky top-0 z-30">
      <h2 className="font-display text-xl font-black tracking-widest text-white uppercase">
        {pageLabel}
      </h2>

      <div className="flex items-center gap-5">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5 text-green-400" title="Sistema operativo">
          <Wifi size={14} />
          <span className="text-xs font-medium">EN LÍNEA</span>
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-white font-mono text-sm font-semibold leading-none">{time}</p>
          <p className="text-[#676B67] text-xs capitalize mt-0.5">{date}</p>
        </div>
      </div>
    </header>
  );
}
