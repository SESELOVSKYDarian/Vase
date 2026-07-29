"use client";

import { create } from "zustand";
import type { Order, PlatformId } from "@/types";

interface DeliveryState {
  ordersByPlatform: Record<PlatformId, Order[]>;
  viewMode: Record<PlatformId, 'kanban' | 'list'>;
  selectedPlatform: PlatformId | null;
  isFiltersOpen: boolean;

  setOrders: (platform: PlatformId, orders: Order[]) => void;
  addOrder: (platform: PlatformId, order: Order) => void;
  updateOrderStatus: (platform: PlatformId, orderId: string, status: Order['status']) => Order;
  removeOrder: (platform: PlatformId, orderId: string) => void;
  setViewMode: (platform: PlatformId, mode: 'kanban' | 'list') => void;
  setSelectedPlatform: (platform: PlatformId | null) => void;
  setIsFiltersOpen: (open: boolean) => void;

  getOrdersByPlatform: (platform: PlatformId) => Order[];
  getPendingCount: (platform: PlatformId) => number;
  getUrgentOrders: (platform: PlatformId) => Order[];
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  ordersByPlatform: {
    pedidosya: [],
    rappi: [],
    glovo: [],
    ubereats: []
  },
  viewMode: {
    pedidosya: 'kanban',
    rappi: 'kanban',
    glovo: 'kanban',
    ubereats: 'kanban'
  },
  selectedPlatform: null,
  isFiltersOpen: false,

  setOrders: (platform, orders) =>
    set((state) => ({
      ordersByPlatform: { ...state.ordersByPlatform, [platform]: orders }
    })),

  addOrder: (platform, order) =>
    set((state) => ({
      ordersByPlatform: {
        ...state.ordersByPlatform,
        [platform]: [...state.ordersByPlatform[platform], order]
      }
    })),

  updateOrderStatus: (platform, orderId, status) => {
    let updatedOrder: Order | undefined;
    set((state) => ({
      ordersByPlatform: {
        ...state.ordersByPlatform,
        [platform]: state.ordersByPlatform[platform].map(o => {
          if (o.id === orderId) {
            updatedOrder = { ...o, status, updatedAt: new Date() };
            return updatedOrder;
          }
          return o;
        })
      }
    }));

    if (!updatedOrder) throw new Error('Order not found');
    return updatedOrder;
  },

  removeOrder: (platform, orderId) =>
    set((state) => ({
      ordersByPlatform: {
        ...state.ordersByPlatform,
        [platform]: state.ordersByPlatform[platform].filter(o => o.id !== orderId)
      }
    })),

  setViewMode: (platform, mode) =>
    set((state) => ({
      viewMode: { ...state.viewMode, [platform]: mode }
    })),

  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
  setIsFiltersOpen: (open) => set({ isFiltersOpen: open }),

  getOrdersByPlatform: (platform) => get().ordersByPlatform[platform],
  getPendingCount: (platform) =>
    get().ordersByPlatform[platform].filter(o => o.status === 'new').length,
  getUrgentOrders: (platform) =>
    get().ordersByPlatform[platform].filter(o => {
      const age = Date.now() - new Date(o.createdAt).getTime();
      return age > 25 * 60 * 1000; // 25 minutes
    })
}));
