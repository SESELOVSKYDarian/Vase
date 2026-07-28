'use client';

import { create } from 'zustand';
import type {
  SuperAdmConfig,
  TableZone,
  MenuCategory,
  Dish,
  KitchenStatus,
  StockStatus,
  DeliveryApp,
  ThemeConfig,
} from '@/types/superadm';
import { generateId } from '@/hooks/lib/utils';
import { saveSuperAdmConfig, loadSuperAdmConfig } from '@/services/superadmService';

// Safe default config
const initialConfig: SuperAdmConfig = {
  zones: [
    { id: 'z1', name: 'Salón Principal', order: 0, tableCount: 10, isActive: true },
    { id: 'z2', name: 'Terraza', order: 1, tableCount: 6, isActive: true },
  ],
  menuCategories: [
    { id: 'c1', name: 'Entradas', order: 0, isActive: true },
    { id: 'c2', name: 'Platos Principales', order: 1, isActive: true },
    { id: 'c3', name: 'Postres', order: 2, isActive: true },
  ],
  dishes: [],
  kitchenStatuses: [
    { id: 'ks1', name: 'Pendiente', color: '#ffffff', bgColor: '#4b5563', order: 0, isTerminal: false },
    { id: 'ks2', name: 'Preparando', color: '#ffffff', bgColor: '#dc2626', order: 1, isTerminal: false },
    { id: 'ks3', name: 'Listo', color: '#000000', bgColor: '#fbbf24', order: 2, isTerminal: false },
    { id: 'ks4', name: 'Entregado', color: '#ffffff', bgColor: '#16a34a', order: 3, isTerminal: true },
  ],
  stockStatuses: [
    { id: 'ss1', name: 'OK', color: '#16a34a', threshold: 50, order: 0 },
    { id: 'ss2', name: 'Stock Bajo', color: '#fbbf24', threshold: 25, order: 1 },
    { id: 'ss3', name: 'Sin Stock', color: '#dc2626', threshold: 0, order: 2 },
  ],
  deliveryApps: [
    { id: 'da1', name: 'PedidosYa', isActive: true, apiKeyEnvVar: 'PEDIDOSYA_API_KEY', connectionStatus: 'unconfigured' },
    { id: 'da2', name: 'Rappi', isActive: true, apiKeyEnvVar: 'RAPPI_BEARER_TOKEN', connectionStatus: 'unconfigured' },
    { id: 'da3', name: 'Glovo', isActive: false, apiKeyEnvVar: 'GLOVO_API_KEY', connectionStatus: 'unconfigured' },
    { id: 'da4', name: 'Uber Eats', isActive: true, apiKeyEnvVar: 'UBEREATS_API_KEY', connectionStatus: 'unconfigured' },
  ],
  theme: {
    colors: {
      primary: '#8b5cf6',
      accent: '#f59e0b',
      background: '#080808',
      surface: '#151515',
      text: '#ffffff',
      textSecondary: '#676b67',
      danger: '#dc2626',
      success: '#16a34a',
      warning: '#fbbf24',
    },
    typography: {
      fontFamily: 'Inter',
      headingWeight: 700,
      baseSize: 16,
    },
    sectionTitles: {},
    dashboardTexts: {
      dashboard: { title: 'Resumen', subtitle: 'Vista rápida del negocio' },
      mesas: { title: 'Mesas', subtitle: 'Gestiona las mesas del local' },
      pedidos: { title: 'Pedidos', subtitle: 'Gestiona los pedidos de los clientes' },
      cocina: { title: 'Cocina', subtitle: 'Gestiona los pedidos en preparación' },
      delivery: { title: 'Delivery', subtitle: 'Gestiona pedidos de todas las plataformas' },
      stock: { title: 'Stock', subtitle: 'Gestiona el inventario de ingredientes' },
      facturas: { title: 'Facturas', subtitle: 'Gestiona las facturas y cobros' },
      historial: { title: 'Historial', subtitle: 'Consulta el historial de pedidos' },
      reservas: { title: 'Reservas', subtitle: 'Gestiona las reservas de mesas' },
      soporte: { title: 'Soporte', subtitle: 'Gestiona los tickets de soporte' },
      analytics: { title: 'Analytics', subtitle: 'Visualiza métricas y reportes' },
      administracion: { title: 'Administración', subtitle: 'Gestiona usuarios y permisos' },
    },
    borderRadius: 'lg',
  },
  lastModified: new Date(),
  modifiedBy: 'superadmin',
};

interface SuperAdmState {
  config: SuperAdmConfig;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;

  updateZone: (id: string, data: Partial<TableZone>) => void;
  addZone: (zone: TableZone) => void;
  deleteZone: (id: string) => void;
  reorderZones: (orderedIds: string[]) => void;

  updateMenuCategory: (id: string, data: Partial<MenuCategory>) => void;
  addMenuCategory: (cat: MenuCategory) => void;
  deleteMenuCategory: (id: string) => void;
  reorderMenuCategories: (orderedIds: string[]) => void;

  addDish: (dish: Dish) => void;
  updateDish: (id: string, data: Partial<Dish>) => void;
  deleteDish: (id: string) => void;

  updateKitchenStatus: (id: string, data: Partial<KitchenStatus>) => void;
  addKitchenStatus: (status: KitchenStatus) => void;
  deleteKitchenStatus: (id: string) => void;
  reorderKitchenStatuses: (orderedIds: string[]) => void;

  updateStockStatus: (id: string, data: Partial<StockStatus>) => void;
  addStockStatus: (status: StockStatus) => void;
  deleteStockStatus: (id: string) => void;
  reorderStockStatuses: (orderedIds: string[]) => void;

  addDeliveryApp: (app: DeliveryApp) => void;
  updateDeliveryApp: (id: string, data: Partial<DeliveryApp>) => void;
  deleteDeliveryApp: (id: string) => void;

  updateTheme: (theme: Partial<ThemeConfig>) => void;
  updateDashboardText: (section: string, data: Partial<{ title: string; subtitle: string }>) => void;

  saveAll: () => Promise<void>;
  discardChanges: () => void;
  initializeConfig: () => Promise<void>;
}

let savedConfig: SuperAdmConfig | null = null;

export const useSuperAdmStore = create<SuperAdmState>((set, get) => ({
  config: initialConfig,
  isDirty: false,
  isSaving: false,
  lastSaved: null,

  updateZone: (id: string, data: Partial<TableZone>) =>
    set((state) => {
      const newZones = state.config.zones.map((z) =>
        z.id === id ? { ...z, ...data } : z
      );
      return {
        config: { ...state.config, zones: newZones },
        isDirty: true,
      };
    }),

  addZone: (zone: TableZone) =>
    set((state) => ({
      config: {
        ...state.config,
        zones: [...state.config.zones, zone],
      },
      isDirty: true,
    })),

  deleteZone: (id: string) =>
    set((state) => ({
      config: {
        ...state.config,
        zones: state.config.zones.filter((z) => z.id !== id),
      },
      isDirty: true,
    })),

  reorderZones: (orderedIds: string[]) =>
    set((state) => {
      const newZones = orderedIds.map((id, index) => {
        const zone = state.config.zones.find((z) => z.id === id);
        return zone ? { ...zone, order: index } : zone!;
      });
      return {
        config: { ...state.config, zones: newZones },
        isDirty: true,
      };
    }),

  updateMenuCategory: (id: string, data: Partial<MenuCategory>) =>
    set((state) => {
      const newCats = state.config.menuCategories.map((c) =>
        c.id === id ? { ...c, ...data } : c
      );
      return {
        config: { ...state.config, menuCategories: newCats },
        isDirty: true,
      };
    }),

  addMenuCategory: (cat: MenuCategory) =>
    set((state) => ({
      config: {
        ...state.config,
        menuCategories: [...state.config.menuCategories, cat],
      },
      isDirty: true,
    })),

  deleteMenuCategory: (id: string) =>
    set((state) => ({
      config: {
        ...state.config,
        menuCategories: state.config.menuCategories.filter((c) => c.id !== id),
      },
      isDirty: true,
    })),

  reorderMenuCategories: (orderedIds: string[]) =>
    set((state) => {
      const newCats = orderedIds.map((id, index) => {
        const cat = state.config.menuCategories.find((c) => c.id === id);
        return cat ? { ...cat, order: index } : cat!;
      });
      return {
        config: { ...state.config, menuCategories: newCats },
        isDirty: true,
      };
    }),

  addDish: (dish: Dish) =>
    set((state) => ({
      config: { ...state.config, dishes: [...state.config.dishes, dish] },
      isDirty: true,
    })),

  updateDish: (id: string, data: Partial<Dish>) =>
    set((state) => {
      const newDishes = state.config.dishes.map((d) =>
        d.id === id ? { ...d, ...data } : d
      );
      return {
        config: { ...state.config, dishes: newDishes },
        isDirty: true,
      };
    }),

  deleteDish: (id: string) =>
    set((state) => ({
      config: { ...state.config, dishes: state.config.dishes.filter((d) => d.id !== id) },
      isDirty: true,
    })),

  updateKitchenStatus: (id: string, data: Partial<KitchenStatus>) =>
    set((state) => {
      const newStatuses = state.config.kitchenStatuses.map((s) =>
        s.id === id ? { ...s, ...data } : s
      );
      return {
        config: { ...state.config, kitchenStatuses: newStatuses },
        isDirty: true,
      };
    }),

  addKitchenStatus: (status: KitchenStatus) =>
    set((state) => ({
      config: {
        ...state.config,
        kitchenStatuses: [...state.config.kitchenStatuses, status],
      },
      isDirty: true,
    })),

  deleteKitchenStatus: (id: string) =>
    set((state) => ({
      config: {
        ...state.config,
        kitchenStatuses: state.config.kitchenStatuses.filter((s) => s.id !== id),
      },
      isDirty: true,
    })),

  reorderKitchenStatuses: (orderedIds: string[]) =>
    set((state) => {
      const newStatuses = orderedIds.map((id, index) => {
        const status = state.config.kitchenStatuses.find((s) => s.id === id);
        return status ? { ...status, order: index } : status!;
      });
      return {
        config: { ...state.config, kitchenStatuses: newStatuses },
        isDirty: true,
      };
    }),

  updateStockStatus: (id: string, data: Partial<StockStatus>) =>
    set((state) => {
      const newStatuses = state.config.stockStatuses.map((s) =>
        s.id === id ? { ...s, ...data } : s
      );
      return {
        config: { ...state.config, stockStatuses: newStatuses },
        isDirty: true,
      };
    }),

  addStockStatus: (status: StockStatus) =>
    set((state) => ({
      config: {
        ...state.config,
        stockStatuses: [...state.config.stockStatuses, status],
      },
      isDirty: true,
    })),

  deleteStockStatus: (id: string) =>
    set((state) => ({
      config: {
        ...state.config,
        stockStatuses: state.config.stockStatuses.filter((s) => s.id !== id),
      },
      isDirty: true,
    })),

  reorderStockStatuses: (orderedIds: string[]) =>
    set((state) => {
      const newStatuses = orderedIds.map((id, index) => {
        const status = state.config.stockStatuses.find((s) => s.id === id);
        return status ? { ...status, order: index } : status!;
      });
      return {
        config: { ...state.config, stockStatuses: newStatuses },
        isDirty: true,
      };
    }),

  addDeliveryApp: (app: DeliveryApp) =>
    set((state) => ({
      config: {
        ...state.config,
        deliveryApps: [...state.config.deliveryApps, app],
      },
      isDirty: true,
    })),

  updateDeliveryApp: (id: string, data: Partial<DeliveryApp>) =>
    set((state) => {
      const newApps = state.config.deliveryApps.map((a) =>
        a.id === id ? { ...a, ...data } : a
      );
      return {
        config: { ...state.config, deliveryApps: newApps },
        isDirty: true,
      };
    }),

  deleteDeliveryApp: (id: string) =>
    set((state) => ({
      config: {
        ...state.config,
        deliveryApps: state.config.deliveryApps.filter((a) => a.id !== id),
      },
      isDirty: true,
    })),

  updateTheme: (theme: Partial<ThemeConfig>) =>
    set((state) => ({
      config: { ...state.config, theme: { ...state.config.theme, ...theme } },
      isDirty: true,
    })),

  updateDashboardText: (section: string, data: Partial<{ title: string; subtitle: string }>) =>
    set((state) => {
      const currentTexts = state.config.theme.dashboardTexts || {};
      const current = currentTexts[section] || { title: '', subtitle: '' };
      return {
        config: {
          ...state.config,
          theme: {
            ...state.config.theme,
            dashboardTexts: {
              ...currentTexts,
              [section]: { ...current, ...data },
            },
          },
        },
        isDirty: true,
      };
    }),

  saveAll: async () => {
    set({ isSaving: true });
    try {
      const config = get().config;
      await saveSuperAdmConfig(config);
      savedConfig = config;
      set({ isSaving: false, isDirty: false, lastSaved: new Date() });
    } catch (e) {
      console.error('Error saving config:', e);
      set({ isSaving: false });
    }
  },

  discardChanges: () => {
    if (savedConfig) {
      set({ config: savedConfig, isDirty: false });
    }
  },

  initializeConfig: async () => {
    try {
      const config = await loadSuperAdmConfig();
      savedConfig = config;
      set({ config });
    } catch (e) {
      console.error('Error loading config:', e);
    }
  },
}));
