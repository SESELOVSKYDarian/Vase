'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { DishSelector } from '@/components/promociones/DishSelector';
import { useDishesStore } from '@/store/dishesStore';
import type { Promotion, PaymentMethod } from '@/types/promotions';
import { generateId } from '@/hooks/lib/utils';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'Mercado Pago' },
];

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionToEdit?: Promotion;
}

export function PromotionFormModal({ isOpen, onClose, promotionToEdit }: PromotionFormModalProps) {
  const { dishes } = useDishesStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [allPaymentMethods, setAllPaymentMethods] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(true);

  useEffect(() => {
    if (promotionToEdit) {
      setName(promotionToEdit.name);
      setDescription(promotionToEdit.description || '');
      setDiscountPercentage(promotionToEdit.discountPercentage.toString());
      setSelectedDishIds(promotionToEdit.applicableDishes.map(d => d.dishId));
      setAllPaymentMethods(promotionToEdit.paymentMethods.includes('todos'));
      setPaymentMethods(promotionToEdit.paymentMethods.filter(m => m !== 'todos'));
      setStartDate(promotionToEdit.startDate.toISOString().split('T')[0]);
      setExpirationDate(promotionToEdit.expirationDate.toISOString().split('T')[0]);
      setActivateImmediately(promotionToEdit.isActive);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setName('');
      setDescription('');
      setDiscountPercentage('');
      setSelectedDishIds([]);
      setPaymentMethods([]);
      setAllPaymentMethods(false);
      setStartDate(today);
      setExpirationDate('');
      setActivateImmediately(true);
    }
  }, [promotionToEdit]);

  const applicableDishes = useMemo(() => {
    return dishes
      .filter(dish => selectedDishIds.includes(dish.id))
      .map(dish => ({
        dishId: dish.id,
        dishName: dish.name,
        originalPrice: dish.price,
        discountedPrice: dish.price - (dish.price * (parseFloat(discountPercentage) || 0) / 100),
      }));
  }, [dishes, selectedDishIds, discountPercentage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalPaymentMethods: PaymentMethod[] = allPaymentMethods 
      ? ['todos'] 
      : paymentMethods;

    const promoData = {
      name,
      description: description || undefined,
      discountPercentage: parseFloat(discountPercentage) || 0,
      applicableDishes,
      paymentMethods: finalPaymentMethods,
      startDate: new Date(startDate),
      expirationDate: new Date(expirationDate),
      isActive: activateImmediately,
    };

    if (promotionToEdit) {
      useDishesStore.getState(); // Just to trigger re-render
      usePromotionsStore.getState().updatePromotion(promotionToEdit.id, promoData);
    } else {
      usePromotionsStore.getState().addPromotion(promoData);
    }

    onClose();
  };

  // We need to import usePromotionsStore here
  const usePromotionsStore = require('@/store/promotionsStore').usePromotionsStore;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-[#252525] rounded-2xl z-50"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-bold text-xl">
                  {promotionToEdit ? 'Editar promoción' : 'Nueva promoción'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#202020] rounded-lg"
                >
                  <X size={20} className="text-[#676b67]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-1 block">
                    Nombre de la promoción
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white"
                    placeholder="Ej: Happy Hour"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-1 block">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white h-20"
                    placeholder="Descripción de la promoción"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-1 block">
                    Porcentaje de descuento (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    required
                    className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-1 block">
                    Platos incluidos
                  </label>
                  <DishSelector
                    selectedDishIds={selectedDishIds}
                    onChange={setSelectedDishIds}
                    discountPercentage={parseFloat(discountPercentage) || 0}
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Métodos de pago
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white text-sm">
                      <input
                        type="checkbox"
                        checked={allPaymentMethods}
                        onChange={(e) => setAllPaymentMethods(e.target.checked)}
                        className="rounded"
                      />
                      Todos los métodos de pago
                    </label>
                    {!allPaymentMethods && PAYMENT_METHODS.map((method) => (
                      <label key={method.value} className="flex items-center gap-2 text-white text-sm">
                        <input
                          type="checkbox"
                          checked={paymentMethods.includes(method.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPaymentMethods([...paymentMethods, method.value]);
                            } else {
                              setPaymentMethods(paymentMethods.filter(m => m !== method.value));
                            }
                          }}
                          className="rounded"
                        />
                        {method.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white text-sm font-medium mb-1 block">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-1 block">
                      Fecha de vencimiento
                    </label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      required
                      className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-white text-sm">
                  <input
                    type="checkbox"
                    checked={activateImmediately}
                    onChange={(e) => setActivateImmediately(e.target.checked)}
                    className="rounded"
                  />
                  Activar inmediatamente
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-[#252525] text-white rounded-lg hover:bg-[#202020]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !name || 
                      !discountPercentage || 
                      selectedDishIds.length === 0 || 
                      (!allPaymentMethods && paymentMethods.length === 0) || 
                      !expirationDate ||
                      new Date(expirationDate) <= new Date(startDate)
                    }
                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {promotionToEdit ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
