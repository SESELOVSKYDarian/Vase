export interface Ingredient {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  stock: number;
  unit: 'unidades' | 'kg' | 'litros' | 'gramos' | 'atado';
  minStock: number;
  expirationDate: Date | null;
  hasExpiration: boolean;
  lastUpdated: Date;
}

export interface StockCategory {
  id: string;
  name: string;
  subcategories?: string[];
  ingredients: Ingredient[];
  totalItems?: number;
  lowStockCount?: number;
}

export type StockFilter = 'all' | 'low' | 'ok' | 'empty' | 'expiring';
export type StockView = 'grid' | 'list';
