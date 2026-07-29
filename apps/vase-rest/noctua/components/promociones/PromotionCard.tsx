'use client';

import { Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Promotion } from '@/types/promotions';

interface PromotionCardProps {
  promotion: Promotion;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function PromotionCard({ promotion, onEdit, onDelete, onToggleActive }: PromotionCardProps) {
  const now = new Date();
  const isExpired = promotion.expirationDate < now;
  const isAlmostExpired = !isExpired && 
    (promotion.expirationDate.getTime() - now.getTime()) < (3 * 24 * 60 * 60 * 1000); // 3 days
  const isDisabled = !promotion.isActive || isExpired;

  const getStatusBadge = () => {
    if (isExpired) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Vencida</span>;
    }
    if (isAlmostExpired) {
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 animate-pulse">Por vencer</span>;
    }
    if (promotion.isActive) {
      return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Activa</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">Desactivada</span>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatPaymentMethods = () => {
    const all = promotion.paymentMethods.includes('todos');
    if (all) return 'Todos';
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      debito: 'Débito',
      credito: 'Crédito',
      transferencia: 'Transferencia',
      mercadopago: 'Mercado Pago',
    };
    return promotion.paymentMethods.map(m => labels[m] || m).join(', ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#151515] border rounded-xl p-6 ${isDisabled ? 'border-[#252525] opacity-75' : 'border-[#252525]'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{promotion.name}</h3>
          <div className="mt-1">{getStatusBadge()}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-violet-400">
            {promotion.discountPercentage}%
            <span className="text-lg text-[#676b67] ml-1">OFF</span>
          </div>
        </div>
      </div>

      {promotion.description && (
        <p className="text-[#676b67] text-sm mb-4">{promotion.description}</p>
      )}

      <div className="mb-4">
        <h4 className="text-sm font-medium text-white mb-2">Platos incluidos</h4>
        <div className="space-y-2">
          {promotion.applicableDishes.map((dish, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span className="text-[#676b67]">{dish.dishName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#676b67] line-through">${dish.originalPrice.toFixed(2)}</span>
                <span className="text-white font-medium">${dish.discountedPrice.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-[#676b67] mb-1">Métodos de pago</div>
        <div className="text-xs text-white bg-[#202020] px-2 py-1 rounded-lg inline-block">
          {formatPaymentMethods()}
        </div>
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <div className="text-[#676b67]">
          Desde: <span className="text-white">{formatDate(promotion.startDate)}</span>
        </div>
        <div className="text-[#676b67]">
          Hasta: <span className="text-white">{formatDate(promotion.expirationDate)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onToggleActive}
          disabled={isExpired}
          className="p-2 rounded-lg border border-[#252525] text-[#676b67] hover:text-white hover:bg-[#202020] disabled:opacity-50 disabled:cursor-not-allowed"
          title={promotion.isActive ? 'Desactivar' : 'Activar'}
        >
          {promotion.isActive ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
        </button>
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 rounded-lg border border-[#252525] text-white hover:bg-[#202020] flex items-center justify-center gap-2"
        >
          <Edit2 size={16} />
          Editar
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
