// Parte de integrationManifest.js: buildProductSyncSchema, buildProductSyncSchemaForRequest, buildTenantIntegrationManifest.
import { resolveUploadsPublicBaseUrl } from '../uploadPublicUrl.js';
import { FTP_IMAGES_SAMPLE_PAYLOAD, LEGACY_SAMPLE_PAYLOAD, PIQUIM_SAMPLE_PAYLOAD, SAMPLE_PAYLOAD, buildProductSyncCompatibilitySecret, getProductFieldsForTenant, isPiquimTenant, resolveServerBaseUrl } from './product-fields.js';

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
