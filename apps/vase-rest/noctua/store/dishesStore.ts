"use client";

import { create } from "zustand";
import type { Dish, DishCategory } from "@/types/dishes";
import { generateId } from "@/hooks/lib/utils";
import { buildInitialDishes } from "@/hooks/lib/dishesMockData";
import { calculateAllDishesAvailability, calculateMaxAvailable } from "@/lib/recipeCalculator";
import type { Ingredient } from "@/types/stock";

interface DishesState {
  dishes: Dish[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: DishCategory | 'all';

  addDish: (dish: Omit<Dish, 'id' | 'createdAt' | 'updatedAt' | 'maxAvailable' | 'isAvailable' | 'customizationOptions'>) => void;
  updateDish: (id: string, data: Partial<Dish>) => void;
  deleteDish: (id: string) => void;
  recalculateAvailability: (stock: Ingredient[]) => void;
  getDishesByCategory: (cat: DishCategory | 'all') => Dish[];
  getDishById: (id: string) => Dish | undefined;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: DishCategory | 'all') => void;
}

export const useDishesStore = create<DishesState>((set, get) => {
  const initialDishes = buildInitialDishes();

  return {
    dishes: initialDishes,
    isLoading: false,
    searchQuery: "",
    selectedCategory: 'all',

    addDish: (dishData) => {
      const now = new Date();
      const newDish: Dish = {
        ...dishData,
        id: generateId(),
        customizationOptions: [],
        maxAvailable: 0,
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        dishes: [...state.dishes, newDish],
      }));
    },

    updateDish: (id, data) => {
      set((state) => ({
        dishes: state.dishes.map(dish =>
          dish.id === id
            ? { ...dish, ...data, updatedAt: new Date() }
            : dish
        ),
      }));
    },

    deleteDish: (id) => {
      set((state) => ({
        dishes: state.dishes.filter(dish => dish.id !== id),
      }));
    },

    recalculateAvailability: (stock) => {
      set((state) => ({
        dishes: calculateAllDishesAvailability(state.dishes, stock),
      }));
    },

    getDishesByCategory: (cat) => {
      const state = get();
      let filtered = state.dishes;

      if (cat !== 'all') {
        filtered = filtered.filter(dish => dish.category === cat);
      }

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(dish =>
          dish.name.toLowerCase().includes(q) ||
          (dish.description?.toLowerCase().includes(q) || false)
        );
      }

      return filtered;
    },

    getDishById: (id) => {
      return get().dishes.find(dish => dish.id === id);
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    setSelectedCategory: (cat) => {
      set({ selectedCategory: cat });
    },
  };
});
