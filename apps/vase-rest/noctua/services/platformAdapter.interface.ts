import type { PlatformId, Order, OrderStatus } from '@/types';

export interface IPlatformAdapter {
  platformId: PlatformId;

  getOrders(): Promise<Order[]>;
  getOrderById(orderId: string): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
  confirmOrder(orderId: string): Promise<Order>;
  cancelOrder(orderId: string, reason?: string): Promise<Order>;
  markReady(orderId: string): Promise<Order>;

  isConnected(): Promise<boolean>;
  getStoreStatus(): Promise<'open' | 'closed' | 'busy'>;
  setStoreStatus(status: 'open' | 'closed'): Promise<void>;
  receiveWebhookPayload(payload: any): Promise<void>;
}
