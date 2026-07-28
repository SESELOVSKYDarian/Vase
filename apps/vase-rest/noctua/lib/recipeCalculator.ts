import type { RecipeIngredient, Dish } from '@/types/dishes';
import type { Ingredient } from '@/types/stock';

export function calculateMaxAvailable(
  recipe: RecipeIngredient[],
  stock: Map<string, Ingredient>
): number {
  if (recipe.length === 0) return 0;
  
  const possibleAmounts = recipe.map(ri => {
    const ingredient = stock.get(ri.ingredientId);
    if (!ingredient || ri.quantity <= 0) return 0;
    return Math.floor(ingredient.stock / ri.quantity);
  });
  
  return Math.min(...possibleAmounts);
}

export function calculateAllDishesAvailability(
  dishes: Dish[],
  stock: Ingredient[]
): Dish[] {
  const stockMap = new Map<string, Ingredient>();
  stock.forEach(ing => stockMap.set(ing.id, ing));
  
  return dishes.map(dish => {
    const maxAvailable = calculateMaxAvailable(dish.recipe, stockMap);
    return {
      ...dish,
      maxAvailable,
      isAvailable: maxAvailable > 0
    };
  });
}

export function getIngredientsForDish(
  dish: Dish,
  stock: Ingredient[]
): Ingredient[] {
  return stock.filter(ing => 
    dish.recipe.some(ri => ri.ingredientId === ing.id)
  );
}
