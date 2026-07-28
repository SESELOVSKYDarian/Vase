'use client';

import { motion } from 'framer-motion';
import { StockBadge } from './StockBadge';
import { ExpirationBadge } from './ExpirationBadge';
import { StockProgressBar } from './StockProgressBar';
import { StockAdjuster } from './StockAdjuster';
import type { Ingredient } from '@/types/stock';

interface IngredientCardProps {
  ingredient: Ingredient;
  index: number;
}

export const IngredientCard = ({ ingredient, index }: IngredientCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
    className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] transition-all"
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="text-white font-semibold text-sm">{ingredient.name}</h3>
        <p className="text-[#676b67] text-xs">{ingredient.category}</p>
      </div>
      <div className="flex items-center gap-2">
        <StockBadge ingredient={ingredient} />
        <ExpirationBadge ingredient={ingredient} />
      </div>
    </div>
    
    <div className="space-y-3">
      <StockProgressBar ingredient={ingredient} />
      <div className="flex items-center justify-between pt-2">
        <p className="text-[#3a3a3a] text-xs">
          Última actualización: {new Date(ingredient.lastUpdated).toLocaleDateString('es-ES')}
        </p>
        <StockAdjuster ingredient={ingredient} />
      </div>
    </div>
  </motion.div>
);
