import type { OrderStatus } from '@/types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: 'Nuevo', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  confirmed: { label: 'Confirmado', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  preparing: { label: 'En preparación', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  ready: { label: 'Listo', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  picked_up: { label: 'En camino', className: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  delivered: { label: 'Entregado', className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  cancelled: { label: 'Cancelado', className: 'bg-red-500/20 text-red-400 border border-red-500/30' }
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${config.className}`}>
      {config.label}
    </span>
  );
}
