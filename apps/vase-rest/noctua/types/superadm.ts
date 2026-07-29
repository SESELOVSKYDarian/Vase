export interface TableZone {
  id: string;
  name: string;
  order: number;
  tableCount: number;
  isActive: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface Dish {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  ingredients: { ingredientId: string; quantity: number; unit: string }[];
  isAvailable: boolean;
  description?: string;
}

export interface KitchenStatus {
  id: string;
  name: string;
  color: string;         // hex
  bgColor: string;       // hex
  order: number;
  isTerminal: boolean;   // si es estado final (entregado, cancelado)
}

export interface StockStatus {
  id: string;
  name: string;
  color: string;
  threshold: number;     // % de stock para activar este estado
  order: number;
}

export interface DeliveryApp {
  id: string;
  name: string;
  isActive: boolean;
  apiKeyEnvVar: string;  // nombre de la variable de entorno (no el valor)
  webhookUrl?: string;
  connectionStatus: 'connected' | 'error' | 'unconfigured';
  lastChecked?: Date;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    danger: string;
    success: string;
    warning: string;
  };
  typography: {
    fontFamily: string;
    headingWeight: number;
    baseSize: number;
  };
  sectionTitles: Record<string, string>;  // clave: sección, valor: título visible
  dashboardTexts: Record<string, { title: string; subtitle: string }>; // clave: sección, valor: { title, subtitle }
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export interface SuperAdmConfig {
  zones: TableZone[];
  menuCategories: MenuCategory[];
  dishes: Dish[];
  kitchenStatuses: KitchenStatus[];
  stockStatuses: StockStatus[];
  deliveryApps: DeliveryApp[];
  theme: ThemeConfig;
  lastModified: Date;
  modifiedBy: string;
}
