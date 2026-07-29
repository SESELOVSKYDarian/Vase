"use client";

import { create } from "zustand";
import type { Promotion, PaymentMethod, PromotionDish } from "@/types/promotions";
import { generateId } from "@/hooks/lib/utils";

interface PromotionsState {
  promotions: Promotion[];
  filter: 'all' | 'active' | 'expired';

  addPromotion: (p: Omit<Promotion, 'id' | 'createdAt' | 'isActive'>) => void;
  updatePromotion: (id: string, data: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  toggleActive: (id: string) => void;
  checkExpirations: () => void;
  getActivePromotionsForDish: (dishId: string, paymentMethod: PaymentMethod) => Promotion[];
  setFilter: (filter: 'all' | 'active' | 'expired') => void;
}

export const usePromotionsStore = create<PromotionsState>((set, get) => ({
  promotions: [],
  filter: 'all',

  addPromotion: (promoData) => {
    const now = new Date();
    const newPromo: Promotion = {
      ...promoData,
      id: generateId(),
      isActive: true,
      createdAt: now,
    };

    set((state) => ({
      promotions: [...state.promotions, newPromo],
    }));
  },

  updatePromotion: (id, data) => {
    set((state) => ({
      promotions: state.promotions.map(promo =>
        promo.id === id ? { ...promo, ...data } : promo
      ),
    }));
  },

  deletePromotion: (id) => {
    set((state) => ({
      promotions: state.promotions.filter(promo => promo.id !== id),
    }));
  },

  toggleActive: (id) => {
    set((state) => ({
      promotions: state.promotions.map(promo =>
        promo.id === id ? { ...promo, isActive: !promo.isActive } : promo
      ),
    }));
  },

  checkExpirations: () => {
    const now = new Date();
    set((state) => ({
      promotions: state.promotions.map(promo => ({
        ...promo,
        isActive: promo.isActive && promo.expirationDate > now,
      })),
    }));
  },

  getActivePromotionsForDish: (dishId, paymentMethod) => {
    const now = new Date();
    const state = get();
    return state.promotions.filter(promo =>
      promo.isActive &&
      promo.startDate <= now &&
      promo.expirationDate > now &&
      (promo.paymentMethods.includes('todos') || promo.paymentMethods.includes(paymentMethod)) &&
      promo.applicableDishes.some(pd => pd.dishId === dishId)
    );
  },

  setFilter: (filter) => set({ filter }),
}));
