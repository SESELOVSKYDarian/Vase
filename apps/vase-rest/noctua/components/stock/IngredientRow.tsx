'use client';

import { motion } from 'framer-motion';
import { StockBadge } from './StockBadge';
import { ExpirationBadge } from './ExpirationBadge';
import { StockAdjuster } from './StockAdjuster';
import type { Ingredient } from '@/types/stock';

interface IngredientRowProps {
  ingredient: Ingredient;
  index: number;
}

export const IngredientRow = ({ ingredient, index }: IngredientRowProps) => (
  <motion.tr
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.02 }}
    className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors"
  >
    <td className="px-4 py-3">
      <div>
        <p className="text-white font-semibold text-sm">{ingredient.name}</p>
        {ingredient.subcategory && (
          <p className="text-[#676b67] text-xs">{ingredient.subcategory}</p>
        )}
      </div>
    </td>
    <td className="px-4 py-3">
      <span className="text-[#676b67] text-sm">{ingredient.category}</span>
    </td>
    <td className="px-4 py-3">
      <StockAdjuster ingredient={ingredient} />
    </td>
    <td className="px-4 py-3">
      <StockBadge ingredient={ingredient} />
    </td>
    <td className="px-4 py-3">
      <ExpirationBadge ingredient={ingredient} />
    </td>
    <td className="px-4 py-3">
      <span className="text-[#3a3a3a] text-xs">
        {new Date(ingredient.lastUpdated).toLocaleDateString('es-ES')}
      </span>
    </td>
  </motion.tr>
);
