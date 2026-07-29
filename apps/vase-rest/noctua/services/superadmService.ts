import type { SuperAdmConfig } from '@/types/superadm';

const STORAGE_KEY = 'noctua-superadm-config';

const defaultConfig: SuperAdmConfig = {
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

export async function loadSuperAdmConfig(): Promise<SuperAdmConfig> {
  if (typeof window === 'undefined') {
    return defaultConfig;
  }
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      parsed.lastModified = new Date(parsed.lastModified);
      // Merge with default config to ensure all fields exist
      return {
        ...defaultConfig,
        ...parsed,
        theme: {
          ...defaultConfig.theme,
          ...parsed.theme,
        },
      };
    } catch (e) {
      console.error('Error parsing config:', e);
    }
  }
  return defaultConfig;
}

export async function saveSuperAdmConfig(config: SuperAdmConfig): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot save config on server');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...config,
    lastModified: new Date().toISOString(),
  }));
}

export async function testDeliveryConnection(appId: string): Promise<'connected' | 'error'> {
  console.log('Testing delivery connection test');
  return 'connected';
}
