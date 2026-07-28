'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStockStore } from '@/store/stockStore';
import type { Ingredient } from '@/types/stock';
import { cn } from '@/hooks/lib/utils';

interface StockAdjusterProps {
  ingredient: Ingredient;
}

export const StockAdjuster = ({ ingredient }: StockAdjusterProps) => {
  const updateStockStore = useStockStore((s) => s.updateStock);
  const removeIngredientStore = useStockStore((s) => s.removeIngredient);

  const handleInputChange = (value: string) => {
    const newStock = parseFloat(value);
    if (!isNaN(newStock)) {
      const finalStock = Math.max(0, Math.min(9999, newStock));
      updateStockStore(ingredient.id, finalStock);
    }
  };

  const handleIncrement = () => {
    const step = ingredient.unit === 'unidades' ? 1 : 0.5;
    const newStock = ingredient.stock + step;
    handleInputChange(newStock.toString());
  };

  const handleDecrement = () => {
    const step = ingredient.unit === 'unidades' ? 1 : 0.5;
    const newStock = ingredient.stock - step;
    handleInputChange(newStock.toString());
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleDecrement}
        className="w-8 h-8 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#676b67] hover:text-white hover:bg-[#2a2a2a] transition-colors"
      >
        <Minus size={16} />
      </motion.button>

      <input
        type="number"
        value={ingredient.stock}
        onChange={(e) => handleInputChange(e.target.value)}
        step={ingredient.unit === 'unidades' ? 1 : 0.5}
        min={0}
        max={9999}
        className={cn(
          "w-20 text-center bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white transition-colors",
          ingredient.stock < ingredient.minStock ? "border-yellow-500" : "",
          ingredient.stock === 0 ? "border-red-500" : ""
        )}
      />

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleIncrement}
        className="w-8 h-8 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#676b67] hover:text-white hover:bg-[#2a2a2a] transition-colors"
      >
        <Plus size={16} />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => removeIngredientStore(ingredient.id)}
        className="w-8 h-8 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#676b67] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Eliminar ingrediente"
      >
        <Trash2 size={16} />
      </motion.button>
    </div>
  );
};
