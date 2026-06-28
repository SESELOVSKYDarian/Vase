import crypto from 'crypto';
import { resolveRequestBaseUrl, resolveUploadsPublicBaseUrl } from './uploadPublicUrl.js';

const PRICE_TIER_FIELDS = Array.from({ length: 10 }, (_, index) => ({
  key: `price_${index + 1}`,
  type: 'number',
  required: false,
  description: `Precio libre ${index + 1}. El ecommerce lo guarda como tarifa sincronizada sin asumir el nombre comercial.`,
}));

const ENABLE_PIQUIM_INTEGRATION_RULES =
  String(process.env.ENABLE_PIQUIM_BOOTSTRAP || process.env.ENABLE_PIQUIM_INTEGRATIONS || '')
    .trim()
    .toLowerCase() === 'true';

const PIQUIM_TENANT_IDS = new Set(
  String(ENABLE_PIQUIM_INTEGRATION_RULES ? (process.env.PIQUIM_TENANT_IDS || process.env.PIQUIM_TENANT_ID || '') : '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const isPiquimTenant = (tenantId) => PIQUIM_TENANT_IDS.has(String(tenantId || '').trim());

const PRODUCT_FIELDS = [
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

const getProductFieldsForTenant = (tenantId) => {
  if (!isPiquimTenant(tenantId)) return PRODUCT_FIELDS;
  return PRODUCT_FIELDS.filter((field) => field.key !== 'images');
};

const SAMPLE_PAYLOAD = {
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

const PIQUIM_SAMPLE_PAYLOAD = {
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

const FTP_IMAGES_SAMPLE_PAYLOAD = {
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

const LEGACY_SAMPLE_PAYLOAD = {
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

export const buildProductSyncSchema = (baseUrl, { tenantId = null } = {}) => ({
  integration: 'product_sync',
  version: 1,
  base_url: baseUrl,
  endpoints: {
    ping_url: `${baseUrl}/api/v1/integrations/ping`,
    sync_products_url: `${baseUrl}/api/v1/integrations/products/sync`,
    upload_image_url: `${baseUrl}/api/v1/integrations/images/upload`,
    sync_ftp_images_url: `${baseUrl}/api/v1/integrations/images/ftp/sync`,
    schema_product_url: `${baseUrl}/api/v1/integrations/schema/product`,
  },
  auth: {
    accepted_headers: ['x-api-key', 'Authorization: Bearer TOKEN', 'x-tenant-id'],
    required_scope: 'products:sync',
  },
  notes: [
    'Stock viaja dentro del item de producto. No hace falta un endpoint separado para stock.',
    'El campo external_id es obligatorio para crear o actualizar sin ambiguedad.',
    'La API acepta hasta 10 tarifas libres mediante price_1 hasta price_10.',
    'El contrato publicado recomienda enviar solo price_1 hasta price_10; los aliases legacy siguen aceptandose solo por compatibilidad interna.',
    'Usa category_path para enviar el arbol Categoria > Gran Familia > Familia. Si no lo envias, la API arma el arbol con categoria/rubro + gran_familia + familia cuando esos campos existen.',
    'category_id queda reservado para un UUID real de categoria del ecommerce. Para sistemas de gestion, lo recomendado es category_path o campos de familia.',
    ...(isPiquimTenant(tenantId)
      ? [
          'Piquim no debe enviar imagenes desde el sistema de gestion: el sync de productos toma solo datos de texto, precios y stock.',
          'Las imagenes se cargan desde el panel web y se conservan por SKU aunque el producto se vuelva a sincronizar desde gestion.',
        ]
      : [
          'Para imagenes, el flujo recomendado es subir cada archivo por /images/upload y mandar la URL devuelta en images del producto.',
          'El sync FTP de imagenes queda disponible solo como compatibilidad legacy.',
        ]),
  ],
  fields: getProductFieldsForTenant(tenantId),
  sample_payload: isPiquimTenant(tenantId) ? PIQUIM_SAMPLE_PAYLOAD : SAMPLE_PAYLOAD,
  ftp_image_sync: {
    endpoint_url: `${baseUrl}/api/v1/integrations/images/ftp/sync`,
    required_scope: 'products:sync',
    file_naming: {
      recommended: 'SKU_orden.ext',
      examples: ['ABC-100_1.jpg', 'ABC-100_2.webp', '789__principal.png'],
      regex_group_hint: 'Si usas filename_regex, el codigo debe salir en grupo sku, code, codigo o primer grupo.',
    },
    sample_payload: FTP_IMAGES_SAMPLE_PAYLOAD,
  },
  http_image_upload: {
    endpoint_url: `${baseUrl}/api/v1/integrations/images/upload`,
    method: 'POST',
    content_type: 'multipart/form-data',
    field_name: 'file',
    accepted_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    max_file_size_mb: 50,
    response_url_field: 'url',
  },
});

export const buildProductSyncSchemaForRequest = (req) => ({
  ...buildProductSyncSchema(resolveServerBaseUrl(req), { tenantId: req.tenantId || req.apiKey?.tenant_id || req.get?.('x-tenant-id') || null }),
  uploads_public_base_url: resolveUploadsPublicBaseUrl(req),
});

export const buildTenantIntegrationManifest = ({ baseUrl, uploadsBaseUrl = null, tenantId, tokenRecord = null }) => {
  const schema = {
    ...buildProductSyncSchema(baseUrl, { tenantId }),
    uploads_public_base_url: uploadsBaseUrl || baseUrl,
  };
  const consumerKey = tokenRecord?.token_hash || null;
  const consumerSecret = buildProductSyncCompatibilitySecret({
    tenantId,
    tokenValue: consumerKey,
  });

  return {
    tenant_id: tenantId,
    auth: {
      scope: 'products:sync',
      header_name: 'x-api-key',
      bearer_supported: true,
      token_name: tokenRecord?.name || null,
      token: tokenRecord?.token_hash || null,
    },
    endpoints: schema.endpoints,
    schema,
    compatibility: {
      mode: 'consumer_key_secret',
      domain: baseUrl,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      endpoints: {
        ping_url: `${baseUrl}/api/v1/integrations/gestion/ping`,
        product_url: `${baseUrl}/api/v1/integrations/gestion/producto`,
        products_url: `${baseUrl}/api/v1/integrations/gestion/productos`,
        ftp_images_url: `${baseUrl}/api/v1/integrations/gestion/imagenes/ftp`,
      },
      notes: [
        'Pensado para sistemas de gestion que solo permiten configurar Dominio, Consumer Key y Consumer Secret.',
        'Acepta un producto por request o un lote de productos.',
        'Tambien acepta x-www-form-urlencoded ademas de JSON.',
      ],
      sample_payload: LEGACY_SAMPLE_PAYLOAD,
    },
  };
};
