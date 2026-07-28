'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useDishesStore } from '@/store/dishesStore';
import type { DishCategory, Dish } from '@/types/dishes';

interface DishSelectorProps {
  selectedDishIds: string[];
  onChange: (dishIds: string[]) => void;
  discountPercentage: number;
}

const CATEGORIES: { value: DishCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'hamburguesas', label: 'Hamburguesas' },
  { value: 'sandwiches', label: 'Sandwiches' },
  { value: 'minutas', label: 'Minutas' },
  { value: 'pastas', label: 'Pastas' },
  { value: 'pizzas', label: 'Pizzas' },
  { value: 'ensaladas', label: 'Ensaladas' },
  { value: 'postres', label: 'Postres' },
  { value: 'bebidas_sin_alcohol', label: 'Bebidas sin alcohol' },
  { value: 'bebidas_con_alcohol', label: 'Bebidas con alcohol' },
  { value: 'cafeteria', label: 'Cafetería' },
];

export function DishSelector({ selectedDishIds, onChange, discountPercentage }: DishSelectorProps) {
  const { dishes } = useDishesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | 'all'>('all');

  const filteredDishes = useMemo(() => {
    return dishes.filter(dish => {
      const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || dish.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [dishes, searchQuery, selectedCategory]);

  const handleToggleDish = (dishId: string) => {
    if (selectedDishIds.includes(dishId)) {
      onChange(selectedDishIds.filter(id => id !== dishId));
    } else {
      onChange([...selectedDishIds, dishId]);
    }
  };

  const handleSelectAllInCategory = () => {
    const categoryDishIds = filteredDishes.map(d => d.id);
    const allSelected = categoryDishIds.every(id => selectedDishIds.includes(id));
    
    if (allSelected) {
      onChange(selectedDishIds.filter(id => !categoryDishIds.includes(id)));
    } else {
      const newSelected = new Set([...selectedDishIds, ...categoryDishIds]);
      onChange(Array.from(newSelected));
    }
  };

  const calculateDiscountedPrice = (price: number) => {
    return price - (price * discountPercentage / 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#676b67]" size={16} />
          <input
            type="text"
            placeholder="Buscar plato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-sm text-white"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as any)}
          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {filteredDishes.length > 0 && (
        <button
          type="button"
          onClick={handleSelectAllInCategory}
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          {filteredDishes.every(d => selectedDishIds.includes(d.id)) 
            ? 'Deseleccionar todos en la categoría' 
            : 'Seleccionar todos en la categoría'}
        </button>
      )}

      <div className="max-h-48 overflow-y-auto space-y-2 bg-[#0a0a0a] rounded-lg p-2 border border-[#2a2a2a]">
        {filteredDishes.length === 0 && (
          <p className="text-center text-[#676b67] text-sm py-4">No hay platos para mostrar</p>
        )}
        {filteredDishes.map(dish => (
          <label
            key={dish.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-[#151515] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedDishIds.includes(dish.id)}
                onChange={() => handleToggleDish(dish.id)}
                className="rounded"
              />
              <div>
                <div className="text-white text-sm">{dish.name}</div>
                <div className="text-[#676b67] text-xs">{dish.category}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#676b67] text-sm line-through">${dish.price.toFixed(2)}</span>
              <span className="text-green-400 text-sm font-medium">
                ${calculateDiscountedPrice(dish.price).toFixed(2)}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
