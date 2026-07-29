import type { Dish, DishCustomizationOption } from "@/types/dishes";
import type { Ingredient } from "@/types/stock";

// Helper to determine if an ingredient is relevant as an add-on for a dish
function isRelevantAddOn(ingredient: Ingredient, dish: Dish): boolean {
  const name = ingredient.name.toLowerCase();
  const relevantCategories = [
    'salsas', 'aderezos', 'mostaza', 'ketchup', 'mayonesa', 'golf', 'bbq', 'picante',
    'queso', 'cheddar', 'mozzarella', 'parmesano',
    'cebolla', 'champiñones', 'morrón', 'pimiento',
    'huevo', 'panceta', 'bacon', 'carne', 'pechuga'
  ];

  return relevantCategories.some(cat => name.includes(cat));
}

// Helper to calculate extra cost based on ingredient type
function calculateExtraCost(ingredient: Ingredient): number {
  const name = ingredient.name.toLowerCase();

  // Free add-ons: sauces and condiments
  if (
    name.includes('mostaza') ||
    name.includes('ketchup') ||
    name.includes('mayonesa') ||
    name.includes('golf') ||
    name.includes('bbq') ||
    name.includes('picante') ||
    name.includes('salsa') ||
    name.includes('aderezo')
  ) {
    return 0;
  }

  // Premium add-ons: proteins and extra cheese
  if (
    name.includes('carne') ||
    name.includes('pechuga') ||
    name.includes('panceta') ||
    name.includes('bacon') ||
    name.includes('huevo') ||
    name.includes('cheddar') ||
    name.includes('mozzarella') ||
    name.includes('parmesano')
  ) {
    return 500; // Example value
  }

  // Other add-ons: moderate cost
  if (
    name.includes('cebolla') ||
    name.includes('champiñones') ||
    name.includes('morrón') ||
    name.includes('pimiento')
  ) {
    return 250; // Example value
  }

  return 0;
}

export function generateCustomizationOptions(
  dish: Dish,
  allIngredients: Ingredient[]
): DishCustomizationOption[] {
  const options: DishCustomizationOption[] = [];

  // 1. Opciones de remoción: un "remove" por cada ingrediente con isRemovable: true
  dish.recipe.forEach((ing) => {
    if (ing.isRemovable) {
      options.push({
        id: `remove-${ing.ingredientId}`,
        label: `Quitar ${ing.ingredientName}`,
        type: 'remove',
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredientName,
        extraCost: 0,
        isDefault: false,
      });
    }
  });

  // 2. Opciones de agregado: ingredientes del stock que NO estén en la receta
  const recipeIngredientIds = new Set(dish.recipe.map((ri) => ri.ingredientId));
  const availableIngredients = allIngredients.filter(
    (ing) => ing.stock > 0 && !recipeIngredientIds.has(ing.id) && isRelevantAddOn(ing, dish)
  );

  availableIngredients.forEach((ing) => {
    options.push({
      id: `add-${ing.id}`,
      label: ing.name,
      type: 'add',
      ingredientId: ing.id,
      ingredientName: ing.name,
      extraCost: calculateExtraCost(ing),
      isDefault: false,
    });
  });

  return options;
}
