"use client";

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Grid, List } from 'lucide-react';
import { OrderCard } from '@/components/delivery/OrderCard';
import { useDeliveryOrders, useUpdateOrderStatus } from '@/hooks/useDeliveryOrders';
import { useDeliveryStore } from '@/store/deliveryStore';
import type { PlatformId } from '@/types';

const platformInfo: Record<PlatformId, { name: string; color: string }> = {
  pedidosya: { name: 'PedidosYa', color: '#FF0F50' },
  rappi: { name: 'Rappi', color: '#FF441F' },
  glovo: { name: 'Glovo', color: '#FFC244' },
  ubereats: { name: 'Uber Eats', color: '#06C167' }
};

export default function PlatformPage() {
  const params = useParams();
  const platform = params.platform as PlatformId;
  const router = useRouter();
  const { data: orders, isLoading } = useDeliveryOrders(platform);
  const { mutate: updateStatus } = useUpdateOrderStatus(platform);
  const { viewMode, setViewMode } = useDeliveryStore();

  const info = platformInfo[platform];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[#676b67] hover:text-white hover:border-[#2a2a2a] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{info.name}</h1>
            <p className="text-[#676b67] text-sm">{orders?.length || 0} pedidos</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-1">
          <button
            onClick={() => setViewMode(platform, 'grid')}
            className={`p-2 rounded-md transition-colors ${viewMode[platform] === 'grid' ? 'bg-white text-black' : 'text-[#676b67] hover:text-white'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode(platform, 'list')}
            className={`p-2 rounded-md transition-colors ${viewMode[platform] === 'list' ? 'bg-white text-black' : 'text-[#676b67] hover:text-white'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[#676b67] text-lg">No hay pedidos actualmente</p>
            </div>
          ) : viewMode[platform] === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders?.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={(id, status) => updateStatus({ orderId: id, status })}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {orders?.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={(id, status) => updateStatus({ orderId: id, status })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
