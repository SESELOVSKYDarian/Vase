export type SeccionSistema =
  | 'analytics'
  | 'mesas'
  | 'pedidos'
  | 'cocina'
  | 'cajero'
  | 'historial'
  | 'stock'
  | 'platos'
  | 'promociones'
  | 'reservas'
  | 'administracion'
  | 'delivery'
  | 'soporte';

export type RolSistema =
  | 'admin'
  | 'cajero'
  | 'cocina'
  | 'mozo'
  | 'stock'
  | 'delivery'
  | 'desarrollador';

export const SECCIONES_POR_ROL: Record<RolSistema, SeccionSistema[]> = {
  admin: [
    'analytics',
    'mesas',
    'pedidos',
    'cocina',
    'cajero',
    'historial',
    'stock',
    'platos',
    'promociones',
    'reservas',
    'administracion',
    'delivery',
    'soporte',
  ],
  cajero: ['mesas', 'pedidos', 'cajero', 'historial'],
  cocina: ['cocina'],
  mozo: ['mesas', 'pedidos', 'cocina'],
  stock: ['stock', 'platos', 'promociones'],
  delivery: ['delivery'],
  desarrollador: ['soporte'],
};

export const RUTA_POR_SECCION: Record<SeccionSistema, string> = {
  analytics:      '/dashboard/analytics',
  mesas:          '/dashboard/mesas',
  pedidos:        '/dashboard/pedido',
  cocina:         '/dashboard/cocina',
  cajero:         '/dashboard/facturas',
  historial:      '/dashboard/historial',
  stock:          '/dashboard/stock',
  platos:         '/dashboard/platos',
  promociones:    '/dashboard/promociones',
  reservas:       '/dashboard/reservas',
  administracion: '/dashboard/administracion',
  delivery:       '/dashboard/delivery',
  soporte:        '/dashboard/soporte',
};

export const LABEL_POR_SECCION: Record<SeccionSistema, string> = {
  analytics:      'Dashboard',
  mesas:          'Mesas',
  pedidos:        'Pedidos',
  cocina:         'Cocina',
  cajero:         'Facturas',
  historial:      'Historial',
  stock:          'Stock',
  platos:         'Platos',
  promociones:    'Promociones',
  reservas:       'Reservas',
  administracion: 'Administración',
  delivery:       'Delivery',
  soporte:        'Soporte',
};

export const HOME_POR_ROL: Record<RolSistema, string> = {
  admin: '/dashboard/mesas',
  cajero: '/dashboard/facturas',
  cocina: '/dashboard/cocina',
  mozo: '/dashboard/mesas',
  stock: '/dashboard/stock',
  delivery: '/dashboard/delivery',
  desarrollador: '/dashboard/soporte',
};

export function obtenerSeccionesPorRol(rol?: string | null): SeccionSistema[] {
  if (!rol) return SECCIONES_POR_ROL.admin;

  return SECCIONES_POR_ROL[rol as RolSistema] || SECCIONES_POR_ROL.admin;
}

export function puedeAccederASeccion(
  rol: string | null | undefined,
  seccion: SeccionSistema
) {
  return obtenerSeccionesPorRol(rol).includes(seccion);
}
