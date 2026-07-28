'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PromotionCard } from '@/components/promociones/PromotionCard';
import { PromotionFormModal } from '@/components/promociones/PromotionFormModal';
import { ConfirmDeleteModal } from '@/components/superadm/shared/ConfirmDeleteModal';
import { usePromotionsStore } from '@/store/promotionsStore';
import type { Promotion } from '@/types/promotions';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'expired', label: 'Vencidas' },
];

export default function PromocionesPage() {
  const { 
    promotions, 
    filter, 
    setFilter, 
    checkExpirations,
    toggleActive,
    deletePromotion,
  } = usePromotionsStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [promotionToEdit, setPromotionToEdit] = useState<Promotion | undefined>();
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | undefined>();

  useEffect(() => {
    checkExpirations();
    const interval = setInterval(checkExpirations, 60000);
    return () => clearInterval(interval);
  }, [checkExpirations]);

  const filteredPromotions = promotions.filter(promo => {
    if (filter === 'active') return promo.isActive;
    if (filter === 'expired') return promo.expirationDate < new Date();
    return true;
  }).sort((a, b) => {
    const aIsActive = a.isActive && a.expirationDate > new Date();
    const bIsActive = b.isActive && b.expirationDate > new Date();
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    return a.expirationDate.getTime() - b.expirationDate.getTime();
  });

  const handleEdit = (promo: Promotion) => {
    setPromotionToEdit(promo);
    setIsFormOpen(true);
  };

  const handleDelete = (promo: Promotion) => {
    setPromotionToDelete(promo);
  };

  const confirmDelete = () => {
    if (promotionToDelete) {
      deletePromotion(promotionToDelete.id);
      setPromotionToDelete(undefined);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Promociones</h1>
          <p className="text-[#676b67]">Gestión de descuentos y ofertas</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-[#151515] border border-[#252525] rounded-lg px-4 py-2 text-white"
          >
            {FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setPromotionToEdit(undefined);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 flex items-center gap-2"
          >
            <Plus size={16} />
            Nueva promoción
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPromotions.map(promo => (
          <PromotionCard
            key={promo.id}
            promotion={promo}
            onEdit={() => handleEdit(promo)}
            onDelete={() => handleDelete(promo)}
            onToggleActive={() => toggleActive(promo.id)}
          />
        ))}
        {filteredPromotions.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-[#676b67]">No hay promociones para mostrar</p>
          </div>
        )}
      </div>

      <PromotionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPromotionToEdit(undefined);
        }}
        promotionToEdit={promotionToEdit}
      />

      <ConfirmDeleteModal
        isOpen={!!promotionToDelete}
        onClose={() => setPromotionToDelete(undefined)}
        onConfirm={confirmDelete}
        title={`Eliminar "${promotionToDelete?.name || ''}"`}
        message="¿Estás seguro de que querés eliminar esta promoción?"
      />
    </div>
  );
}
