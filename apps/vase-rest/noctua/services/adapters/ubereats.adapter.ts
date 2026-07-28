import type { IPlatformAdapter } from '../platformAdapter.interface';
import type { PlatformId, Order, OrderStatus } from '@/types';
import { UberEatsAuth } from '../auth/uberEatsAuth';
import { useDeliveryStore } from '@/store/deliveryStore';
import { generateId } from '@/hooks/lib/utils';

export class UberEatsAdapter implements IPlatformAdapter {
  platformId: PlatformId = 'ubereats';
  private auth = UberEatsAuth.getInstance();

  async getOrders(): Promise<Order[]> {
    try {
      const token = await this.auth.getAccessToken();
      // Conexión directa con la API de Uber Eats (Ejemplo de endpoint real)
      const response = await fetch('https://api.uber.com/v1/eats/orders/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en API Uber Eats: ${response.status}`);
      }

      const data = await response.json();
      return data.orders?.map((o: any) => this.mapUberOrder(o)) || [];
    } catch (error) {
      console.warn('Uber Eats API connection failed, falling back to local store:', error);
      return useDeliveryStore.getState().ordersByPlatform.ubereats || [];
    }
  }

  private mapUberOrder(o: any): Order {
    return {
      id: o.id || generateId(),
      externalId: o.display_id || 'UE-XXXX',
      platform: 'ubereats',
      status: this.mapUberStatus(o.status),
      createdAt: new Date(o.placed_at),
      updatedAt: new Date(),
      customer: { 
        name: o.eater?.name || 'Cliente Uber Eats',
        phone: o.eater?.phone
      },
      items: o.cart?.items?.map((item: any) => ({
        id: generateId(),
        name: item.title,
        quantity: item.quantity,
        unitPrice: item.price / 100 // Uber suele enviar en centavos
      })) || [],
      subtotal: (o.payment?.subtotal || 0) / 100,
      total: (o.payment?.total || 0) / 100,
      paymentMethod: 'online'
    };
  }

  private mapUberStatus(status: string): Order['status'] {
    const statusMap: Record<string, Order['status']> = {
      'CREATED': 'new',
      'ACCEPTED': 'confirmed',
      'PROCESSING': 'preparing',
      'READY_FOR_PICKUP': 'ready',
      'PICKED_UP': 'picked_up',
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
    // TODO: Replace with actual UberEats API call
    await new Promise(resolve => setTimeout(resolve, 50));
    const { updateOrderStatus: updateStoreStatus } = useDeliveryStore.getState();
    return updateStoreStatus('ubereats', orderId, status);
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
    const { addOrder } = useDeliveryStore.getState();
    // TODO: Parse actual UberEats payload
    const order: Order = {
      id: generateId(),
      externalId: `UE-${payload.eventId || Date.now()}`,
      platform: 'ubereats',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { name: 'Cliente Uber Eats', phone: '+5491112345678', address: 'Dirección de prueba' },
      items: [
        { id: generateId(), name: 'Producto de prueba', quantity: 1, unitPrice: 1500 }
      ],
      subtotal: 1500,
      total: 1500,
      paymentMethod: 'online'
    };
    addOrder('ubereats', order);
  }
}
