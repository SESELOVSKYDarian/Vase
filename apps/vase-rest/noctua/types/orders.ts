import type { PlatformId } from './platforms';

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  canBeRemoved: boolean;
}

export interface Dish {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  recipe: RecipeIngredient[];
  maxAvailable: number;
  isAvailable: boolean;
  description?: string;
  imageUrl?: string;
}

export interface ItemModification {
  type: 'remove' | 'add' | 'reduce';
  ingredientId: string;
  ingredientName: string;
  originalQuantity?: number;
  newQuantity?: number;
}

export interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  recipe: RecipeIngredient[];
  modifications: ItemModification[];
  finalIngredients: RecipeIngredient[];
  notes?: string;
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  externalId: string;
  platform: PlatformId;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  customer: { name: string; phone?: string; address?: string };
  items: OrderItem[];
  subtotal: number;
  total: number;
  paymentMethod: 'online' | 'cash' | 'card';
  estimatedDelivery?: Date;
  notes?: string;
}
