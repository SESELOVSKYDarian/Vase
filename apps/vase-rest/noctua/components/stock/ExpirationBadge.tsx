'use client';

import { motion } from 'framer-motion';
import type { Ingredient } from '@/types/stock';

interface ExpirationBadgeProps {
  ingredient: Ingredient;
}

export const ExpirationBadge = ({ ingredient }: ExpirationBadgeProps) => {
  const getExpirationStatus = () => {
    if (!ingredient.expirationDate || !ingredient.hasExpiration) {
      return {
        label: 'Sin vencimiento',
        className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
        animate: false
      };
    }

    const expirationDate = new Date(ingredient.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Vencido',
        className: 'bg-red-500/30 text-red-400 border border-red-500/40',
        animate: true
      };
    } else if (diffDays <= 2) {
      return {
        label: `${diffDays} día${diffDays !== 1 ? 's' : ''}`,
        className: 'bg-red-500/30 text-red-400 border border-red-500/40',
        animate: true
      };
    } else if (diffDays <= 5) {
      return {
        label: `${diffDays} días`,
        className: 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/40',
        animate: false
      };
    } else {
      return {
        label: `${diffDays} días`,
        className: 'bg-green-500/20 text-green-400 border border-green-500/30',
        animate: false
      };
    }
  };

  const status = getExpirationStatus();

  if (status.animate) {
    return (
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className={`px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${status.className}`}
      >
        {status.label}
      </motion.span>
    );
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${status.className}`}>
      {status.label}
    </span>
  );
};
