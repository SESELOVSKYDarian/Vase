import { platformRegistry } from '@/lib/platformRegistry';
import type { Order, OrderStatus, PlatformId } from '@/types';

export async function fetchOrdersByPlatform(platform: PlatformId): Promise<Order[]> {
  const adapter = platformRegistry.get(platform);
  if (!adapter) throw new Error(`Adapter not found for ${platform}`);
  const orders = await adapter.getOrders();
  return orders.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  platform: PlatformId
): Promise<Order> {
  const adapter = platformRegistry.get(platform);
  if (!adapter) throw new Error(`Adapter not found for ${platform}`);
  return adapter.updateOrderStatus(orderId, status);
}

export async function confirmOrder(orderId: string, platform: PlatformId): Promise<Order> {
  const adapter = platformRegistry.get(platform);
  if (!adapter) throw new Error(`Adapter not found for ${platform}`);
  return adapter.confirmOrder(orderId);
}

export async function cancelOrder(
  orderId: string,
  platform: PlatformId,
  reason?: string
): Promise<Order> {
  const adapter = platformRegistry.get(platform);
  if (!adapter) throw new Error(`Adapter not found for ${platform}`);
  return adapter.cancelOrder(orderId, reason);
}

export async function markReady(orderId: string, platform: PlatformId): Promise<Order> {
  const adapter = platformRegistry.get(platform);
  if (!adapter) throw new Error(`Adapter not found for ${platform}`);
  return adapter.markReady(orderId);
}
