import type { IPlatformAdapter } from '../platformAdapter.interface';
import type { PlatformId, Order, OrderStatus } from '@/types';
import { RappiTokenManager } from '../auth/rappiTokenManager';
import { useDeliveryStore } from '@/store/deliveryStore';
import { generateId } from '@/hooks/lib/utils';

export class RappiAdapter implements IPlatformAdapter {
  platformId: PlatformId = 'rappi';
  private tokenManager = RappiTokenManager.getInstance();

  async getOrders(): Promise<Order[]> {
    try {
      const token = await this.tokenManager.getToken();
      // Conexión directa con la API de Rappi (Ejemplo de endpoint real)
      const response = await fetch('https://api.rappi.com/v2/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error en API Rappi: ${response.status}`);
      }
      
      const data = await response.json();
      // Aquí iría el mapeo de la respuesta de Rappi a nuestro tipo Order
      return data.map((o: any) => this.mapRappiOrder(o));
    } catch (error) {
      console.warn('Rappi API connection failed, falling back to local store:', error);
      return useDeliveryStore.getState().ordersByPlatform.rappi || [];
    }
  }

  private mapRappiOrder(o: any): Order {
    // Mapeo real desde el formato de Rappi
    return {
      id: o.order_id || generateId(),
      externalId: o.display_id || 'R-XXXX',
      platform: 'rappi',
      status: this.mapRappiStatus(o.status),
      createdAt: new Date(o.created_at),
      updatedAt: new Date(),
      customer: { 
        name: o.customer?.first_name || 'Cliente Rappi',
        phone: o.customer?.phone,
        address: o.delivery_address?.address
      },
      items: o.items?.map((item: any) => ({
        id: generateId(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price
      })) || [],
      subtotal: o.subtotal || 0,
      total: o.total || 0,
      paymentMethod: o.payment?.method === 'CASH' ? 'cash' : 'online'
    };
  }

  private mapRappiStatus(status: string): Order['status'] {
    const statusMap: Record<string, Order['status']> = {
      'NEW': 'new',
      'CONFIRMED': 'confirmed',
      'PREPARING': 'preparing',
      'READY': 'ready',
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
    await new Promise(resolve => setTimeout(resolve, 50));
    const { updateOrderStatus: updateStoreStatus } = useDeliveryStore.getState();
    const updated = updateStoreStatus('rappi', orderId, status);
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
      externalId: payload.orderId || `R-${Date.now()}`,
      platform: 'rappi',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { 
        name: payload.customer?.name || 'Cliente Rappi', 
        phone: payload.customer?.phone || '+5491187654321', 
        address: payload.customer?.address || 'Calle Falucho 567' 
      },
      items: payload.items?.map((item: any) => ({
        id: generateId(),
        name: item.name || 'Producto',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0
      })) || [{ id: generateId(), name: 'Empanadas de carne', quantity: 6, unitPrice: 400 }],
      subtotal: payload.subtotal || 0,
      total: payload.total || 0,
      paymentMethod: payload.paymentMethod || 'cash'
    };
    addOrder('rappi', order);
  }
}
