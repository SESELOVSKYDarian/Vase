import type { Ingredient } from '@/types/stock';
import { useStockStore } from '@/store/stockStore';

export const stockService = {
  fetchAllIngredients: async (): Promise<Ingredient[]> => {
    // TODO: Supabase — supabase.from('ingredients').select('*').order('category').order('name')
    await new Promise((r) => setTimeout(r, 50));
    const state = useStockStore.getState();
    return state.categories.flatMap(cat => cat.ingredients);
  },

  updateIngredientStock: async (id: string, stock: number): Promise<Ingredient> => {
    // TODO: Supabase — supabase.from('ingredients').update({ stock, last_updated: new Date() }).eq('id', id).select().single()
    const state = useStockStore.getState();
    state.updateStock(id, stock);
    const updatedIngredient = state.categories.flatMap(cat => cat.ingredients).find(i => i.id === id);
    if (!updatedIngredient) throw new Error('Ingredient not found');
    return updatedIngredient;
  },

  addIngredient: async (ingredient: Omit<Ingredient, 'id' | 'lastUpdated'>): Promise<Ingredient> => {
    // TODO: Supabase — const { data } = await supabase.from('ingredients').insert(ingredient).select().single();
    await new Promise((r) => setTimeout(r, 50));
    const state = useStockStore.getState();
    state.addIngredient(ingredient);
    const newIngredient = state.categories.flatMap(cat => cat.ingredients).find(i => i.name === ingredient.name && i.category === ingredient.category);
    if (!newIngredient) throw new Error('Failed to add ingredient');
    return newIngredient;
  },
};
