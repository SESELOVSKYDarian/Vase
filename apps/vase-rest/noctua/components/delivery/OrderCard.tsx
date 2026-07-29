"use client";

import { motion } from 'framer-motion';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { Order } from '@/types';
import { formatARS } from '@/hooks/lib/utils';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: Order['status']) => void;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const orderAge = Date.now() - new Date(order.createdAt).getTime();
  const isUrgent = orderAge > 25 * 60 * 1000; // 25 minutes

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-white font-semibold text-sm">{order.customer.name}</h4>
          <p className="text-[#676b67] text-xs">{order.externalId}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {isUrgent && (
        <div className="flex items-center gap-2 text-red-400 text-xs">
          <span className="animate-pulse">⚠️</span>
          Pedido urgente!
        </div>
      )}

      <div className="space-y-2">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-white">
              {item.quantity}x {item.name}
            </span>
            <span className="text-[#bcb9b9]">{formatARS(item.quantity * item.unitPrice)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
        <span className="text-lg font-bold text-white">{formatARS(order.total)}</span>
        <div className="flex gap-2">
          {order.status === 'new' && (
            <button
              onClick={() => onStatusChange(order.id, 'confirmed')}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors"
            >
              Confirmar
            </button>
          )}
          {order.status === 'confirmed' && (
            <button
              onClick={() => onStatusChange(order.id, 'ready')}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors"
            >
              Listo
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
