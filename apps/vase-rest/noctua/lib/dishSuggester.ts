import type { Dish, DishCategory } from "@/types/dishes";
import type { Ingredient } from "@/types/stock";
import { generateId } from "@/hooks/lib/utils";

type SuggestionRule = {
  requires: (ing: Ingredient) => boolean;
  minMatches: number;
  suggestion: Partial<Dish>;
};

// Helper to check if an ingredient matches a keyword list
function matchesName(ing: Ingredient, keywords: string[]): boolean {
  const name = ing.name.toLowerCase();
  return keywords.some((k) => name.includes(k));
}

function hasIngredient(ingredients: Ingredient[], keywords: string[]): boolean {
  return ingredients.some((ing) => matchesName(ing, keywords));
}

function getIngredient(ingredients: Ingredient[], keywords: string[]): Ingredient | undefined {
  return ingredients.find((ing) => matchesName(ing, keywords));
}

export function suggestDishesFromStock(ingredients: Ingredient[]): Partial<Dish>[] {
  const suggestions: Partial<Dish>[] = [];

  // 1. Hamburguesa simple
  if (
    hasIngredient(ingredients, ['pan de hamburguesa']) &&
    hasIngredient(ingredients, ['carne picada', 'carne'])
  ) {
    const pan = getIngredient(ingredients, ['pan de hamburguesa']);
    const carne = getIngredient(ingredients, ['carne picada', 'carne']);
    suggestions.push({
      id: generateId(),
      name: 'Hamburguesa simple',
      category: 'hamburguesas',
      price: 4500,
      recipe: [
        ...(pan ? [{ ingredientId: pan.id, ingredientName: pan.name, quantity: 2, unit: pan.unit, isRemovable: false, isOptional: false }] : []),
        ...(carne ? [{ ingredientId: carne.id, ingredientName: carne.name, quantity: 150, unit: carne.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 2. Hamburguesa completa
  if (
    hasIngredient(ingredients, ['pan de hamburguesa']) &&
    hasIngredient(ingredients, ['carne picada', 'carne']) &&
    hasIngredient(ingredients, ['cheddar', 'queso cheddar']) &&
    hasIngredient(ingredients, ['panceta', 'bacon'])
  ) {
    const pan = getIngredient(ingredients, ['pan de hamburguesa']);
    const carne = getIngredient(ingredients, ['carne picada', 'carne']);
    const cheddar = getIngredient(ingredients, ['cheddar', 'queso cheddar']);
    const panceta = getIngredient(ingredients, ['panceta', 'bacon']);
    suggestions.push({
      id: generateId(),
      name: 'Hamburguesa completa',
      category: 'hamburguesas',
      price: 7500,
      recipe: [
        ...(pan ? [{ ingredientId: pan.id, ingredientName: pan.name, quantity: 2, unit: pan.unit, isRemovable: false, isOptional: false }] : []),
        ...(carne ? [{ ingredientId: carne.id, ingredientName: carne.name, quantity: 150, unit: carne.unit, isRemovable: false, isOptional: false }] : []),
        ...(cheddar ? [{ ingredientId: cheddar.id, ingredientName: cheddar.name, quantity: 50, unit: cheddar.unit, isRemovable: true, isOptional: false }] : []),
        ...(panceta ? [{ ingredientId: panceta.id, ingredientName: panceta.name, quantity: 50, unit: panceta.unit, isRemovable: true, isOptional: false }] : [])
      ]
    });
  }

  // 3. Milanesa de carne
  if (
    hasIngredient(ingredients, ['nalga', 'carne']) &&
    hasIngredient(ingredients, ['pan rallado']) &&
    hasIngredient(ingredients, ['huevo', 'huevos'])
  ) {
    const nalga = getIngredient(ingredients, ['nalga', 'carne']);
    const panRallado = getIngredient(ingredients, ['pan rallado']);
    const huevos = getIngredient(ingredients, ['huevo', 'huevos']);
    suggestions.push({
      id: generateId(),
      name: 'Milanesa de carne',
      category: 'minutas',
      price: 6000,
      recipe: [
        ...(nalga ? [{ ingredientId: nalga.id, ingredientName: nalga.name, quantity: 200, unit: nalga.unit, isRemovable: false, isOptional: false }] : []),
        ...(panRallado ? [{ ingredientId: panRallado.id, ingredientName: panRallado.name, quantity: 100, unit: panRallado.unit, isRemovable: false, isOptional: false }] : []),
        ...(huevos ? [{ ingredientId: huevos.id, ingredientName: huevos.name, quantity: 2, unit: huevos.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 4. Milanesa napolitana
  if (
    hasIngredient(ingredients, ['nalga', 'carne']) &&
    hasIngredient(ingredients, ['pan rallado']) &&
    hasIngredient(ingredients, ['huevo', 'huevos']) &&
    hasIngredient(ingredients, ['mozzarella', 'queso mozzarella']) &&
    hasIngredient(ingredients, ['salsa de tomate', 'tomate'])
  ) {
    const nalga = getIngredient(ingredients, ['nalga', 'carne']);
    const panRallado = getIngredient(ingredients, ['pan rallado']);
    const huevos = getIngredient(ingredients, ['huevo', 'huevos']);
    const mozzarella = getIngredient(ingredients, ['mozzarella', 'queso mozzarella']);
    const salsaTomate = getIngredient(ingredients, ['salsa de tomate', 'tomate']);
    suggestions.push({
      id: generateId(),
      name: 'Milanesa napolitana',
      category: 'minutas',
      price: 7500,
      recipe: [
        ...(nalga ? [{ ingredientId: nalga.id, ingredientName: nalga.name, quantity: 200, unit: nalga.unit, isRemovable: false, isOptional: false }] : []),
        ...(panRallado ? [{ ingredientId: panRallado.id, ingredientName: panRallado.name, quantity: 100, unit: panRallado.unit, isRemovable: false, isOptional: false }] : []),
        ...(huevos ? [{ ingredientId: huevos.id, ingredientName: huevos.name, quantity: 2, unit: huevos.unit, isRemovable: false, isOptional: false }] : []),
        ...(mozzarella ? [{ ingredientId: mozzarella.id, ingredientName: mozzarella.name, quantity: 50, unit: mozzarella.unit, isRemovable: true, isOptional: false }] : []),
        ...(salsaTomate ? [{ ingredientId: salsaTomate.id, ingredientName: salsaTomate.name, quantity: 100, unit: salsaTomate.unit, isRemovable: true, isOptional: false }] : [])
      ]
    });
  }

  // 5. Milanesa de pollo
  if (
    hasIngredient(ingredients, ['pechuga', 'pollo']) &&
    hasIngredient(ingredients, ['pan rallado']) &&
    hasIngredient(ingredients, ['huevo', 'huevos'])
  ) {
    const pechuga = getIngredient(ingredients, ['pechuga', 'pollo']);
    const panRallado = getIngredient(ingredients, ['pan rallado']);
    const huevos = getIngredient(ingredients, ['huevo', 'huevos']);
    suggestions.push({
      id: generateId(),
      name: 'Milanesa de pollo',
      category: 'minutas',
      price: 5500,
      recipe: [
        ...(pechuga ? [{ ingredientId: pechuga.id, ingredientName: pechuga.name, quantity: 200, unit: pechuga.unit, isRemovable: false, isOptional: false }] : []),
        ...(panRallado ? [{ ingredientId: panRallado.id, ingredientName: panRallado.name, quantity: 100, unit: panRallado.unit, isRemovable: false, isOptional: false }] : []),
        ...(huevos ? [{ ingredientId: huevos.id, ingredientName: huevos.name, quantity: 2, unit: huevos.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 6. Fideos con tuco
  if (
    hasIngredient(ingredients, ['spaghetti', 'fideos']) &&
    hasIngredient(ingredients, ['salsa de tomate', 'tomate'])
  ) {
    const fideos = getIngredient(ingredients, ['spaghetti', 'fideos']);
    const salsaTomate = getIngredient(ingredients, ['salsa de tomate', 'tomate']);
    suggestions.push({
      id: generateId(),
      name: 'Fideos con tuco',
      category: 'pastas',
      price: 4000,
      recipe: [
        ...(fideos ? [{ ingredientId: fideos.id, ingredientName: fideos.name, quantity: 200, unit: fideos.unit, isRemovable: false, isOptional: false }] : []),
        ...(salsaTomate ? [{ ingredientId: salsaTomate.id, ingredientName: salsaTomate.name, quantity: 150, unit: salsaTomate.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 7. Fideos a la crema
  if (
    hasIngredient(ingredients, ['spaghetti', 'fideos']) &&
    hasIngredient(ingredients, ['crema', 'crema de leche'])
  ) {
    const fideos = getIngredient(ingredients, ['spaghetti', 'fideos']);
    const crema = getIngredient(ingredients, ['crema', 'crema de leche']);
    suggestions.push({
      id: generateId(),
      name: 'Fideos a la crema',
      category: 'pastas',
      price: 4500,
      recipe: [
        ...(fideos ? [{ ingredientId: fideos.id, ingredientName: fideos.name, quantity: 200, unit: fideos.unit, isRemovable: false, isOptional: false }] : []),
        ...(crema ? [{ ingredientId: crema.id, ingredientName: crema.name, quantity: 100, unit: crema.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 8. Arroz salteado
  if (hasIngredient(ingredients, ['arroz'])) {
    const arroz = getIngredient(ingredients, ['arroz']);
    suggestions.push({
      id: generateId(),
      name: 'Arroz salteado',
      category: 'minutas',
      price: 2500,
      recipe: [
        ...(arroz ? [{ ingredientId: arroz.id, ingredientName: arroz.name, quantity: 200, unit: arroz.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 9. Omelette
  if (
    hasIngredient(ingredients, ['huevo', 'huevos']) &&
    hasIngredient(ingredients, ['queso'])
  ) {
    const huevos = getIngredient(ingredients, ['huevo', 'huevos']);
    const queso = getIngredient(ingredients, ['queso']);
    suggestions.push({
      id: generateId(),
      name: 'Omelette',
      category: 'minutas',
      price: 2800,
      recipe: [
        ...(huevos ? [{ ingredientId: huevos.id, ingredientName: huevos.name, quantity: 3, unit: huevos.unit, isRemovable: false, isOptional: false }] : []),
        ...(queso ? [{ ingredientId: queso.id, ingredientName: queso.name, quantity: 50, unit: queso.unit, isRemovable: true, isOptional: false }] : [])
      ]
    });
  }

  // 10. Tortilla española
  if (
    hasIngredient(ingredients, ['huevo', 'huevos']) &&
    hasIngredient(ingredients, ['papa', 'papas']) &&
    hasIngredient(ingredients, ['cebolla'])
  ) {
    const huevos = getIngredient(ingredients, ['huevo', 'huevos']);
    const papas = getIngredient(ingredients, ['papa', 'papas']);
    const cebolla = getIngredient(ingredients, ['cebolla']);
    suggestions.push({
      id: generateId(),
      name: 'Tortilla española',
      category: 'entradas',
      price: 3500,
      recipe: [
        ...(huevos ? [{ ingredientId: huevos.id, ingredientName: huevos.name, quantity: 4, unit: huevos.unit, isRemovable: false, isOptional: false }] : []),
        ...(papas ? [{ ingredientId: papas.id, ingredientName: papas.name, quantity: 300, unit: papas.unit, isRemovable: false, isOptional: false }] : []),
        ...(cebolla ? [{ ingredientId: cebolla.id, ingredientName: cebolla.name, quantity: 1, unit: cebolla.unit, isRemovable: true, isOptional: false }] : [])
      ]
    });
  }

  // 11. Pizza mozzarella
  if (
    hasIngredient(ingredients, ['harina']) &&
    hasIngredient(ingredients, ['levadura']) &&
    hasIngredient(ingredients, ['salsa de tomate', 'tomate']) &&
    hasIngredient(ingredients, ['mozzarella', 'queso mozzarella'])
  ) {
    const harina = getIngredient(ingredients, ['harina']);
    const levadura = getIngredient(ingredients, ['levadura']);
    const salsaTomate = getIngredient(ingredients, ['salsa de tomate', 'tomate']);
    const mozzarella = getIngredient(ingredients, ['mozzarella', 'queso mozzarella']);
    suggestions.push({
      id: generateId(),
      name: 'Pizza mozzarella',
      category: 'pizzas',
      price: 8000,
      recipe: [
        ...(harina ? [{ ingredientId: harina.id, ingredientName: harina.name, quantity: 300, unit: harina.unit, isRemovable: false, isOptional: false }] : []),
        ...(levadura ? [{ ingredientId: levadura.id, ingredientName: levadura.name, quantity: 10, unit: levadura.unit, isRemovable: false, isOptional: false }] : []),
        ...(salsaTomate ? [{ ingredientId: salsaTomate.id, ingredientName: salsaTomate.name, quantity: 150, unit: salsaTomate.unit, isRemovable: false, isOptional: false }] : []),
        ...(mozzarella ? [{ ingredientId: mozzarella.id, ingredientName: mozzarella.name, quantity: 150, unit: mozzarella.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 12. Ensalada mixta
  if (
    hasIngredient(ingredients, ['lechuga']) &&
    hasIngredient(ingredients, ['tomate']) &&
    hasIngredient(ingredients, ['zanahoria'])
  ) {
    const lechuga = getIngredient(ingredients, ['lechuga']);
    const tomate = getIngredient(ingredients, ['tomate']);
    const zanahoria = getIngredient(ingredients, ['zanahoria']);
    suggestions.push({
      id: generateId(),
      name: 'Ensalada mixta',
      category: 'ensaladas',
      price: 2500,
      recipe: [
        ...(lechuga ? [{ ingredientId: lechuga.id, ingredientName: lechuga.name, quantity: 100, unit: lechuga.unit, isRemovable: false, isOptional: false }] : []),
        ...(tomate ? [{ ingredientId: tomate.id, ingredientName: tomate.name, quantity: 2, unit: tomate.unit, isRemovable: false, isOptional: false }] : []),
        ...(zanahoria ? [{ ingredientId: zanahoria.id, ingredientName: zanahoria.name, quantity: 1, unit: zanahoria.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 13. Sándwich de milanesa
  if (
    hasIngredient(ingredients, ['pan']) &&
    hasIngredient(ingredients, ['nalga', 'carne', 'pechuga']) &&
    hasIngredient(ingredients, ['pan rallado']) &&
    hasIngredient(ingredients, ['huevo'])
  ) {
    const pan = getIngredient(ingredients, ['pan']);
    const carne = getIngredient(ingredients, ['nalga', 'carne', 'pechuga']);
    const panRallado = getIngredient(ingredients, ['pan rallado']);
    const huevos = getIngredient(ingredients, ['huevo']);
    suggestions.push({
      id: generateId(),
      name: 'Sándwich de milanesa',
      category: 'sandwiches',
      price: 5000,
      recipe: [
        ...(pan ? [{ ingredientId: pan.id, ingredientName: pan.name, quantity: 2, unit: pan.unit, isRemovable: false, isOptional: false }] : []),
        ...(carne ? [{ ingredientId: carne.id, ingredientName: carne.name, quantity: 150, unit: carne.unit, isRemovable: false, isOptional: false }] : []),
        ...(panRallado ? [{ ingredientId: panRallado.id, ingredientName: panRallado.name, quantity: 50, unit: panRallado.unit, isRemovable: false, isOptional: false }] : []),
        ...(huevos ? [{ ingredientId: huevos.id, ingredientName: huevos.name, quantity: 1, unit: huevos.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 14. Empanada de carne
  if (
    hasIngredient(ingredients, ['masa', 'harina']) &&
    hasIngredient(ingredients, ['carne picada', 'carne'])
  ) {
    const masa = getIngredient(ingredients, ['masa', 'harina']);
    const carne = getIngredient(ingredients, ['carne picada', 'carne']);
    suggestions.push({
      id: generateId(),
      name: 'Empanada de carne',
      category: 'entradas',
      price: 900,
      recipe: [
        ...(masa ? [{ ingredientId: masa.id, ingredientName: masa.name, quantity: 100, unit: masa.unit, isRemovable: false, isOptional: false }] : []),
        ...(carne ? [{ ingredientId: carne.id, ingredientName: carne.name, quantity: 80, unit: carne.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 15. Papas fritas
  if (hasIngredient(ingredients, ['papa', 'papas'])) {
    const papas = getIngredient(ingredients, ['papa', 'papas']);
    suggestions.push({
      id: generateId(),
      name: 'Papas fritas',
      category: 'entradas',
      price: 2000,
      recipe: [
        ...(papas ? [{ ingredientId: papas.id, ingredientName: papas.name, quantity: 300, unit: papas.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 16. Helado (postre)
  if (hasIngredient(ingredients, ['helado'])) {
    const helado = getIngredient(ingredients, ['helado']);
    suggestions.push({
      id: generateId(),
      name: 'Helado',
      category: 'postres',
      price: 1800,
      recipe: [
        ...(helado ? [{ ingredientId: helado.id, ingredientName: helado.name, quantity: 100, unit: helado.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  // 17. Café (bebida)
  if (hasIngredient(ingredients, ['café'])) {
    const cafe = getIngredient(ingredients, ['café']);
    suggestions.push({
      id: generateId(),
      name: 'Café',
      category: 'cafeteria',
      price: 800,
      recipe: [
        ...(cafe ? [{ ingredientId: cafe.id, ingredientName: cafe.name, quantity: 10, unit: cafe.unit, isRemovable: false, isOptional: false }] : [])
      ]
    });
  }

  return suggestions;
}
