export type DishCategory =
  | 'entradas'
  | 'hamburguesas'
  | 'sandwiches'
  | 'minutas'
  | 'pastas'
  | 'pizzas'
  | 'ensaladas'
  | 'postres'
  | 'bebidas_sin_alcohol'
  | 'bebidas_con_alcohol'
  | 'cafeteria';

export interface DishCustomizationOption {
  id: string;
  label: string;
  type: 'add' | 'remove' | 'swap';
  ingredientId?: string;
  ingredientName?: string;
  extraCost: number; // 0 si no tiene costo adicional
  isDefault: boolean; // si viene incluido por defecto
}

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  isRemovable: boolean; // el cliente puede pedirlo sin este ingrediente
  isOptional: boolean; // no se descuenta del stock si el cliente lo quita
}

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  price: number;
  description?: string;
  recipe: RecipeIngredient[];
  customizationOptions: DishCustomizationOption[];
  maxAvailable: number; // calculado desde stock
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectedCustomization {
  optionId: string;
  label: string;
  type: 'add' | 'remove' | 'swap';
  ingredientId?: string;
  extraCost: number;
}

export interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  basePrice: number;
  extrasCost: number; // suma de extraCost de customizaciones elegidas
  finalPrice: number; // basePrice + extrasCost
  quantity: number;
  recipe: RecipeIngredient[];
  selectedCustomizations: SelectedCustomization[];
  finalIngredients: RecipeIngredient[];
  notes: string;
}
