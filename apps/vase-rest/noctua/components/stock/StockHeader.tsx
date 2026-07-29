'use client';

import { motion } from 'framer-motion';
import { Plus, Package } from 'lucide-react';
import { useStockStore } from '@/store/stockStore';

interface StockHeaderProps {
  onOpenModal: () => void;
}

export const StockHeader = ({ onOpenModal }: StockHeaderProps) => {
  const categories = useStockStore((s) => s.categories);
  
  // Compute values from state instead of calling store functions
  const totalIngredients = categories.reduce((total, cat) => total + cat.ingredients.length, 0);
  const lowStockIngredients = categories.flatMap(cat => cat.ingredients).filter(ing => ing.stock < ing.minStock);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Package size={24} className="text-white" />
          <h1 className="text-2xl font-bold text-white">Stock</h1>
        </div>
        <p className="text-[#676B67] text-sm">
          Gestiona tu inventario de ingredientes y productos
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{totalIngredients}</p>
            <p className="text-[#676B67] text-xs">Productos totales</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-yellow-400">{lowStockIngredients.length}</p>
            <p className="text-[#676B67] text-xs">Bajo stock</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-[#e5e5e5] transition-colors"
        >
          <Plus size={18} />
          Añadir producto
        </motion.button>
      </div>
    </div>
  );
};
