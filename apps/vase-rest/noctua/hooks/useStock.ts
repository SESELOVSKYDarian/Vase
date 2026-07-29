'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '@/services/stockService';
import type { Ingredient } from '@/types/stock';

export const useStockQuery = () => {
  return useQuery({
    queryKey: ['stock-ingredients'],
    queryFn: stockService.fetchAllIngredients,
    staleTime: 60000,
  });
};

export const useUpdateStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      stockService.updateIngredientStock(id, stock),
    onMutate: async ({ id, stock }) => {
      await queryClient.cancelQueries({ queryKey: ['stock-ingredients'] });
      const previousIngredients = queryClient.getQueryData<Ingredient[]>(['stock-ingredients']);
      queryClient.setQueryData<Ingredient[]>(['stock-ingredients'], (old) =>
        old?.map((i) =>
          i.id === id ? { ...i, stock: Math.max(0, stock), lastUpdated: new Date() } : i
        )
      );
      return { previousIngredients };
    },
    onError: (err, newIngredient, context) => {
      queryClient.setQueryData(['stock-ingredients'], context?.previousIngredients);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-ingredients'] });
    },
  });
};

export const useAddIngredient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ingredient: Omit<Ingredient, 'id' | 'lastUpdated'>) =>
      stockService.addIngredient(ingredient),
    onMutate: async (newIngredient) => {
      await queryClient.cancelQueries({ queryKey: ['stock-ingredients'] });
      const previousIngredients = queryClient.getQueryData<Ingredient[]>(['stock-ingredients']);
      return { previousIngredients };
    },
    onError: (err, newIngredient, context) => {
      queryClient.setQueryData(['stock-ingredients'], context?.previousIngredients);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-ingredients'] });
    },
  });
};
