// Parte de integrationManifest.js: PRICE_TIER_FIELDS, ENABLE_PIQUIM_INTEGRATION_RULES, PIQUIM_TENANT_IDS, isPiquimTenant, PRODUCT_FIELDS, getProductFieldsForTenant y más.
import crypto from 'crypto';
import { resolveRequestBaseUrl } from '../uploadPublicUrl.js';

export const PRICE_TIER_FIELDS = Array.from({ length: 10 }, (_, index) => ({
  key: `price_${index + 1}`,
  type: 'number',
  required: false,
  description: `Precio libre ${index + 1}. El ecommerce lo guarda como tarifa sincronizada sin asumir el nombre comercial.`,
}));

export const ENABLE_PIQUIM_INTEGRATION_RULES =
  String(process.env.ENABLE_PIQUIM_BOOTSTRAP || process.env.ENABLE_PIQUIM_INTEGRATIONS || '')
    .trim()
    .toLowerCase() === 'true';

export const PIQUIM_TENANT_IDS = new Set(
  String(ENABLE_PIQUIM_INTEGRATION_RULES ? (process.env.PIQUIM_TENANT_IDS || process.env.PIQUIM_TENANT_ID || '') : '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

export const isPiquimTenant = (tenantId) => PIQUIM_TENANT_IDS.has(String(tenantId || '').trim());

export const PRODUCT_FIELDS = [
  {
    key: 'external_id',
    type: 'string',
    required: true,
    description: 'Identificador unico y estable del producto en el sistema de gestion.',
  },
  {
    key: 'sku',
    type: 'string',
    required: false,
    description: 'Codigo comercial o SKU del producto.',
  },
  {
    key: 'name',
    type: 'string',
    required: false,
    description: 'Nombre oficial del producto.',
  },
  {
    key: 'description',
    type: 'string',
    required: false,
    description: 'Descripcion ampliada o texto informativo del articulo.',
  },
  {
    key: 'short_description',
    type: 'string',
    required: false,
    description: 'Descripcion corta para catalogo, cards y destacados.',
  },
  {
    key: 'brand',
    type: 'string',
    required: false,
    description: 'Marca del producto si existe en el sistema de gestion.',
  },
  ...PRICE_TIER_FIELDS,
  {
    key: 'stock',
    type: 'number',
    required: false,
    description: 'Cantidad disponible en stock.',
  },
  {
    key: 'is_active',
    type: 'boolean',
    required: false,
    description: 'Indica si el producto sigue activo en el sistema de gestion.',
  },
  {
    key: 'images',
    type: 'string[]',
    required: false,
    description: 'Lista de URLs publicas de imagenes.',
  },
  {
    key: 'category_id',
    type: 'uuid',
    required: false,
    description: 'UUID real de una categoria principal ya creada en el ecommerce.',
  },
  {
    key: 'category_ids',
    type: 'uuid[]',
    required: false,
    description: 'Lista de UUIDs de categorias del ecommerce para asociar el producto.',
  },
  {
    key: 'category_path',
    type: 'string|string[]',
    required: false,
    description: 'Jerarquia recomendada para el sync. Ejemplo: Categoria > Gran Familia > Familia.',
  },
  {
    key: 'updated_at',
    type: 'datetime',
    required: false,
    description: 'Fecha de ultima modificacion para sync incremental.',
  },
];

export const getProductFieldsForTenant = (tenantId) => {
  if (!isPiquimTenant(tenantId)) return PRODUCT_FIELDS;
  return PRODUCT_FIELDS.filter((field) => field.key !== 'images');
};

export const SAMPLE_PAYLOAD = {
  source_system: 'sistema-gestion-cliente',
  items: [
    {
      external_id: 'PROD-1001',
      sku: 'PROD-1001',
      name: 'Producto ejemplo',
      short_description: 'Texto corto para cards y listados.',
      description: 'Descripcion ampliada del producto',
      brand: 'Marca Test',
      price_1: 24990,
      price_2: 21990,
      price_3: 20990,
      stock: 15,
      is_active: true,
      images: [
        'https://dominio-del-sistema.com/imagenes/prod-1001.jpg',
      ],
      category_path: 'Categoria principal > Subcategoria > Linea',
      updated_at: '2026-03-14T15:00:00.000Z',
    },
  ],
};

export const PIQUIM_SAMPLE_PAYLOAD = {
  source_system: 'sistema-gestion-piquim',
  items: [
    {
      external_id: 'PROD-1001',
      sku: 'PROD-1001',
      name: 'Producto ejemplo',
      short_description: 'Texto corto para cards y listados.',
      description: 'Descripcion ampliada del producto',
      brand: 'PIQUIM',
      price_1: 24990,
      price_2: 21990,
      price_3: 20990,
      stock: 15,
      is_active: true,
      category_path: 'Heladeria > Estabilizantes > Neutros artesanales',
      updated_at: '2026-03-14T15:00:00.000Z',
    },
  ],
};

export const FTP_IMAGES_SAMPLE_PAYLOAD = {
  host: 'ftp.cliente.com',
  user: 'ftp_user',
  password: 'ftp_password',
  remote_dir: '/imagenes-productos',
  options: {
    dry_run: false,
    replace_existing_images: false,
    delete_remote_after_sync: false,
    skip_admin_locked: true,
    max_files: 300,
  },
};

export const LEGACY_SAMPLE_PAYLOAD = {
  source_system: 'gestion-escritorio',
    producto: {
      codigo_propio: '666',
      detalle_ampliado: 'ABLANDADOR AGUA AF1500 FLUVIAL',
      detalle_abreviado: 'ABLANDADOR AGUA AF1500 FLUVIAL',
      texto_asociado: 'Descripcion ampliada del articulo enviada por el sistema de gestion.',
      jerarquia_categoria: 'Tratamiento de agua > Ablandadores',
      precio_1: 1465583,
      precio_2: 1399000,
      precio_3: 1325000,
      disponibilidad: 12,
    activo: true,
    imagenes: [
      'https://dominio-del-sistema.com/imagenes/666_1.jpg',
      'https://dominio-del-sistema.com/imagenes/666_2.jpg',
    ],
  },
};

export const buildProductSyncCompatibilitySecret = ({ tenantId, tokenValue }) => {
  const normalizedTenant = String(tenantId || '').trim();
  const normalizedToken = String(tokenValue || '').trim();
  if (!normalizedTenant || !normalizedToken) return null;

  const salt = String(
    process.env.INTEGRATIONS_COMPAT_SECRET_SALT ||
    process.env.APP_SECRET ||
    'teflon-integrations-compat'
  );

  return crypto
    .createHmac('sha256', salt)
    .update(`${normalizedTenant}:${normalizedToken}`)
    .digest('hex');
};

export const resolveServerBaseUrl = (req) => {
  const envBase =
    process.env.INTEGRATIONS_PUBLIC_BASE_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    '';
  if (envBase) {
    return String(envBase).replace(/\/+$/, '');
  }

  return resolveRequestBaseUrl(req);
};
