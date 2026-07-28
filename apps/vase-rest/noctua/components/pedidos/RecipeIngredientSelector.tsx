'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import type { RecipeIngredient } from '@/types/dishes';
import type { Ingredient } from '@/types/stock';

interface RecipeIngredientSelectorProps {
  ingredients: RecipeIngredient[];
  allStockIngredients: Ingredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

export const RecipeIngredientSelector = ({ ingredients, allStockIngredients, onChange }: RecipeIngredientSelectorProps) => {
  const addIngredient = () => {
    onChange([
      ...ingredients,
      {
        ingredientId: '',
        ingredientName: '',
        quantity: 0,
        unit: 'unidades',
        isOptional: false,
        isRemovable: true,
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    const updated = [...ingredients];
    if (updates.ingredientId) {
      const stockIng = allStockIngredients.find((ing) => ing.id === updates.ingredientId);
      if (stockIng) {
        updated[index] = {
          ...updated[index],
          ...updates,
          ingredientName: stockIng.name,
          unit: stockIng.unit,
          isOptional: updated[index].isOptional ?? false,
          isRemovable: updated[index].isRemovable ?? true,
        };
      } else {
        updated[index] = { ...updated[index], ...updates };
      }
    } else {
      updated[index] = { ...updated[index], ...updates };
    }
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Ingredientes</h3>
        <button
          type="button"
          onClick={addIngredient}
          className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm"
        >
          <Plus size={16} />
          Añadir
        </button>
      </div>
      <AnimatePresence>
        {ingredients.map((ing, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            className="grid grid-cols-12 gap-2 items-center bg-[#111] border border-[#2a2a2a] rounded-xl p-3"
          >
            <div className="col-span-5">
              <select
                value={ing.ingredientId}
                onChange={(e) => updateIngredient(index, { ingredientId: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Seleccionar...</option>
                {allStockIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <input
                type="number"
                step="0.1"
                value={ing.quantity}
                onChange={(e) => updateIngredient(index, { quantity: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="col-span-2">
              <span className="text-sm text-[#676b67]">{ing.unit}</span>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-[#676b67]">
                <input
                  type="checkbox"
                  checked={ing.isRemovable}
                  onChange={(e) => updateIngredient(index, { isRemovable: e.target.checked })}
                  className="rounded"
                />
                Removible
              </label>
            </div>
            <div className="col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
