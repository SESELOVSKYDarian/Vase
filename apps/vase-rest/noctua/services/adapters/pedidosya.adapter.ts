import type { IPlatformAdapter } from '../platformAdapter.interface';
import type { PlatformId, Order, OrderStatus } from '@/types';
import { useDeliveryStore } from '@/store/deliveryStore';
import { generateId } from '@/hooks/lib/utils';

export class PedidosYaAdapter implements IPlatformAdapter {
  platformId: PlatformId = 'pedidosya';
  private token: string | null = null;

  async getOrders(): Promise<Order[]> {
    try {
      // Conexión directa con la API de PedidosYa
      const apiKey = process.env.PEDIDOSYA_API_KEY;
      const response = await fetch('https://api.pedidosya.com/v1/orders', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en API PedidosYa: ${response.status}`);
      }

      const data = await response.json();
      return data.map((o: any) => this.mapPedidosYaOrder(o));
    } catch (error) {
      console.warn('PedidosYa API connection failed, falling back to local store:', error);
      return useDeliveryStore.getState().ordersByPlatform.pedidosya || [];
    }
  }

  private mapPedidosYaOrder(o: any): Order {
    return {
      id: o.id || generateId(),
      externalId: o.remote_id || 'PY-XXXX',
      platform: 'pedidosya',
      status: this.mapPedidosYaStatus(o.status),
      createdAt: new Date(o.registered_date),
      updatedAt: new Date(),
      customer: { 
        name: o.customer?.name || 'Cliente PedidosYa',
        phone: o.customer?.phone,
        address: o.address?.description
      },
      items: o.details?.map((item: any) => ({
        id: generateId(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unit_price
      })) || [],
      subtotal: o.subtotal || 0,
      total: o.total || 0,
      paymentMethod: o.payment_method === 'CASH' ? 'cash' : 'online'
    };
  }

  private mapPedidosYaStatus(status: string): Order['status'] {
    const statusMap: Record<string, Order['status']> = {
      'PENDING': 'new',
      'CONFIRMED': 'confirmed',
      'PREPARING': 'preparing',
      'READY': 'ready',
      'SHIPPED': 'picked_up',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled'
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
    await new Promise(resolve => setTimeout(resolve, 50));
    const { updateOrderStatus: updateStoreStatus } = useDeliveryStore.getState();
    const updated = updateStoreStatus('pedidosya', orderId, status);
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
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async receiveWebhookPayload(payload: any): Promise<void> {
    const { addOrder } = useDeliveryStore.getState();
    const order: Order = {
      id: generateId(),
      externalId: payload.orderId || `PY-${Date.now()}`,
      platform: 'pedidosya',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { 
        name: payload.customer?.name || 'Cliente PedidosYa', 
        phone: payload.customer?.phone || '+5491112345678', 
        address: payload.customer?.address || 'Dirección de prueba' 
      },
      items: payload.items?.map((item: any) => ({
        id: generateId(),
        name: item.name || 'Producto',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0
      })) || [{ id: generateId(), name: 'Producto de prueba', quantity: 1, unitPrice: 1000 }],
      subtotal: payload.subtotal || 0,
      total: payload.total || 0,
      paymentMethod: payload.paymentMethod || 'online'
    };
    addOrder('pedidosya', order);
  }
}
