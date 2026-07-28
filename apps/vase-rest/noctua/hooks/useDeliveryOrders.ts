"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrdersByPlatform, updateOrderStatus, confirmOrder, cancelOrder, markReady } from '@/services/deliveryService';
import type { PlatformId, OrderStatus } from '@/types';
import { useDeliveryStore } from '@/store/deliveryStore';

export function useDeliveryOrders(platform: PlatformId) {
  const { setOrders } = useDeliveryStore();

  return useQuery({
    queryKey: ['delivery-orders', platform],
    queryFn: async () => {
      const orders = await fetchOrdersByPlatform(platform);
      setOrders(platform, orders);
      return orders;
    },
    refetchInterval: platform === 'glovo' || platform === 'ubereats' ? false : 15000, // 15 seconds for polling platforms
  });
}

export function useUpdateOrderStatus(platform: PlatformId) {
  const queryClient = useQueryClient();
  const { updateOrderStatus: updateStoreStatus } = useDeliveryStore();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      // Optimistic update
      updateStoreStatus(platform, orderId, status);
      return updateOrderStatus(orderId, status, platform);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders', platform] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update if needed
      console.error('Update order status error:', error);
    }
  });
}

export function useConfirmOrder(platform: PlatformId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => confirmOrder(orderId, platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders', platform] });
    }
  });
}

export function useCancelOrder(platform: PlatformId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => cancelOrder(orderId, platform, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders', platform] });
    }
  });
}

export function useMarkReady(platform: PlatformId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => markReady(orderId, platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders', platform] });
    }
  });
}
