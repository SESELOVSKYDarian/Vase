export type PaymentMethod =
  | 'efectivo'
  | 'debito'
  | 'credito'
  | 'transferencia'
  | 'mercadopago'
  | 'todos';

export interface PromotionDish {
  dishId: string;
  dishName: string;
  originalPrice: number;
  discountedPrice: number; // calculado
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountPercentage: number;
  applicableDishes: PromotionDish[];
  paymentMethods: PaymentMethod[];
  startDate: Date;
  expirationDate: Date;
  isActive: boolean; // false si ya venció o fue desactivada manualmente
  createdAt: Date;
}
