'use client';

import { motion } from 'framer-motion';

interface AvailabilityBadgeProps {
  maxAvailable: number;
}

export const AvailabilityBadge = ({ maxAvailable }: AvailabilityBadgeProps) => {
  const getStatus = () => {
    if (maxAvailable === 0) return { label: 'Agotado', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
    if (maxAvailable <= 5) return { label: `${maxAvailable} disponibles`, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' };
    return { label: `${maxAvailable} disponibles`, color: 'text-green-400 bg-green-500/20 border-green-500/30' };
  };

  const status = getStatus();

  return (
    <motion.span
      key={maxAvailable}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}
    >
      {status.label}
    </motion.span>
  );
};
