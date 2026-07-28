'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { IngredientCard } from './IngredientCard';
import type { StockCategory, Ingredient } from '@/types/stock';

interface CategoryAccordionProps {
  category: StockCategory;
  filteredIngredients: Ingredient[];
}

export const CategoryAccordion = ({ category, filteredIngredients }: CategoryAccordionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#111] transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown size={18} className="text-[#676b67]" />
          ) : (
            <ChevronRight size={18} className="text-[#676b67]" />
          )}
          <span className="text-white font-semibold text-sm">{category.name}</span>
          <span className="bg-[#1a1a1a] px-2 py-0.5 rounded-full text-xs text-[#676b67]">
            {filteredIngredients.length}
          </span>
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#1a1a1a]"
          >
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredIngredients.map((ing, index) => (
                <IngredientCard key={ing.id} ingredient={ing} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
