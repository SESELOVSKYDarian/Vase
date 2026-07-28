import { motion } from 'framer-motion';
import type { Ingredient } from '@/types/stock';

interface StockProgressBarProps {
  ingredient: Ingredient;
}

export const StockProgressBar = ({ ingredient }: StockProgressBarProps) => {
  const percentage = Math.min(100, (ingredient.stock / (ingredient.minStock * 3)) * 100);
  
  const getColor = () => {
    if (ingredient.stock === 0) return '#ef4444';
    if (ingredient.stock < ingredient.minStock) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#676b67]">Stock actual</span>
        <span className="text-white font-medium">
          {ingredient.stock} {ingredient.unit}
        </span>
      </div>
      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ backgroundColor: getColor() }}
        />
      </div>
      <p className="text-[#3a3a3a] text-xs">
        Mínimo recomendado: {ingredient.minStock} {ingredient.unit}
      </p>
    </div>
  );
};
