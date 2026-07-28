"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { PlatformId } from '@/types';

interface PlatformCardProps {
  platform: PlatformId;
  displayName: string;
  color: string;
  pendingCount: number;
  lastOrderTime?: Date;
}

export function PlatformCard({
  platform,
  displayName,
  color,
  pendingCount,
  lastOrderTime
}: PlatformCardProps) {
  const router = useRouter();

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/dashboard/delivery/${platform}`)}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 cursor-pointer transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{displayName}</h3>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          {/* Icon placeholder */}
          <span className="text-lg">🍽️</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[#676b67] text-sm">Pedidos pendientes</span>
          <span className="text-xl font-bold" style={{ color }}>{pendingCount}</span>
        </div>

        {lastOrderTime && (
          <div className="flex items-center justify-between">
            <span className="text-[#676b67] text-sm">Último pedido</span>
            <span className="text-sm text-[#bcb9b9]">
              {Math.floor((Date.now() - lastOrderTime.getTime()) / 60000)} min atrás
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Conectado
          </span>
        </div>
      </div>
    </motion.div>
  );
}
