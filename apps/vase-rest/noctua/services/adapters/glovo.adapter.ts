import type { IPlatformAdapter } from '../platformAdapter.interface';
import type { PlatformId, Order, OrderStatus } from '@/types';
import { useDeliveryStore } from '@/store/deliveryStore';
import { generateId } from '@/hooks/lib/utils';

export class GlovoAdapter implements IPlatformAdapter {
  platformId: PlatformId = 'glovo';

  async getOrders(): Promise<Order[]> {
    try {
      // Conexión directa con la API de Glovo
      const apiKey = process.env.GLOVO_API_KEY;
      const response = await fetch('https://api.glovoapp.com/v1/orders/active', {
        headers: {
          'Authorization': `Basic ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en API Glovo: ${response.status}`);
      }

      const data = await response.json();
      return data.map((o: any) => this.mapGlovoOrder(o));
    } catch (error) {
      console.warn('Glovo API connection failed, falling back to local store:', error);
      return useDeliveryStore.getState().ordersByPlatform.glovo || [];
    }
  }

  private mapGlovoOrder(o: any): Order {
    return {
      id: o.order_id || generateId(),
      externalId: o.display_id || 'G-XXXX',
      platform: 'glovo',
      status: this.mapGlovoStatus(o.status),
      createdAt: new Date(o.created_at),
      updatedAt: new Date(),
      customer: { 
        name: o.customer?.name || 'Cliente Glovo',
        phone: o.customer?.phone,
        address: o.delivery_address?.address
      },
      items: o.products?.map((item: any) => ({
        id: generateId(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price
      })) || [],
      subtotal: o.subtotal || 0,
      total: o.total || 0,
      paymentMethod: o.payment_method === 'CASH' ? 'cash' : 'online'
    };
  }

  private mapGlovoStatus(status: string): Order['status'] {
    const statusMap: Record<string, Order['status']> = {
      'PENDING': 'new',
      'ACCEPTED': 'confirmed',
      'PREPARING': 'preparing',
      'READY': 'ready',
      'PICKED_UP': 'picked_up',
      'DELIVERED': 'delivered',
      'CANCELED': 'cancelled'
    };
    return statusMap[status] || 'new';
  }

  async getOrderById(orderId: string): Promise<Order> {
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    // TODO: Replace with actual Glovo API call to send status
    await new Promise(resolve => setTimeout(resolve, 50));
    const { updateOrderStatus: updateStoreStatus } = useDeliveryStore.getState();
    const updated = updateStoreStatus('glovo', orderId, status);
    return updated;
  }

  async confirmOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'confirmed');
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  async markReady(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'ready');
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  async getStoreStatus(): Promise<'open' | 'closed' | 'busy'> {
    return 'open';
  }

  async setStoreStatus(status: 'open' | 'closed'): Promise<void> {
    // TODO: Replace with actual store status update
  }

  async receiveWebhookPayload(payload: any): Promise<void> {
    // TODO: Implement actual payload parsing
    const { addOrder } = useDeliveryStore.getState();
    const order: Order = {
      id: generateId(),
      externalId: payload.orderId || `G-${Date.now()}`,
      platform: 'glovo',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { name: 'Cliente Glovo', phone: '+5491112345678', address: 'Dirección de prueba' },
      items: [
        { id: generateId(), name: 'Producto de prueba', quantity: 1, unitPrice: 1000 }
      ],
      subtotal: 1000,
      total: 1000,
      paymentMethod: 'card'
    };
    addOrder('glovo', order);
  }
}
