// Nombres de campos que puede mandar un sistema de gestión y valores fijos de la sincronización.

export const DEFAULT_SOURCE_SYSTEM = 'erp';
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
export const PIQUIM_HELADERIA_CATEGORY_LABEL = 'Heladeria';
export const PIQUIM_PANADERIA_CONFITERIA_CATEGORY_LABEL = 'Panaderia/Confiteria';
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DEFAULT_SYNC_OPERATION = 'upsert';
export const MAX_PRICE_TIER_COUNT = 10;
export const SYNC_OPERATION_ALIASES = {
  create: 'create',
  insert: 'create',
  new: 'create',
  alta: 'create',
  update: 'update',
  edit: 'update',
  modify: 'update',
  actualizar: 'update',
  upsert: 'upsert',
  sync: 'upsert',
  sincronizar: 'upsert',
};
export const UNDEFINED_LIKE_TEXTS = new Set([
  'ninguno',
  'ninguna',
  'sin definir',
  'sin categoria',
  'sin marca',
  'no definido',
  'no definida',
  'n/a',
  'na',
  'null',
  '-',
  '--',
]);
export const UNDEFINED_CATEGORY_LABEL = 'Sin definir';
export const STRUCTURED_PRICE_TIER_KEYS = ['price_tiers', 'priceTiers', 'prices', 'precios', 'tarifas'];
export const PRICE_TIER_SLOT_ALIASES = Array.from({ length: MAX_PRICE_TIER_COUNT }, (_, index) => {
  const slot = index + 1;
  const padded = String(slot).padStart(2, '0');
  return {
    slot,
    aliases: [
      `price_${slot}`,
      `price${slot}`,
      `price_${padded}`,
      `price${padded}`,
      `precio_${slot}`,
      `precio${slot}`,
      `precio_${padded}`,
      `precio${padded}`,
      `tarifa_${slot}`,
      `tarifa${slot}`,
      `lista_${slot}`,
      `lista${slot}`,
      `price_list_${slot}`,
      `priceList${slot}`,
    ],
  };
});
export const RETAIL_PRICE_ALIASES = [
  'price_retail',
  'priceRetail',
  'price',
  'precio',
  'precio_venta',
  'precioVenta',
  'precio_iva',
  'precio_final',
];
export const WHOLESALE_PRICE_ALIASES = [
  'price_wholesale',
  'priceWholesale',
  'wholesale_price',
  'precio_wholesale',
  'precio_mayorista',
  'mayorista',
];
export const CATEGORY_PATH_ALIASES = [
  'category_path',
  'categoryPath',
  'categoria_path',
  'categoriaPath',
  'category_tree',
  'categoryTree',
  'category_hierarchy',
  'categoryHierarchy',
  'jerarquia_categoria',
  'jerarquiaCategoria',
];
export const CATEGORY_ROOT_ALIASES = [
  'categoria',
  'category',
  'rubro',
  'linea',
  'line',
  'categoria_padre',
  'categoriaPadre',
  'categoria_raiz',
  'categoriaRaiz',
  'categoria_principal',
  'categoriaPrincipal',
  'root_category',
  'rootCategory',
  'parent_category',
  'parentCategory',
];
export const CATEGORY_GROUP_ALIASES = [
  'gran_familia',
  'granFamilia',
  'grand_family',
  'grandFamily',
  'group_category',
  'groupCategory',
  'subcategoria',
  'sub_category',
  'subcategory',
];
export const CATEGORY_LEAF_ALIASES = ['familia', 'family'];
export const CATEGORY_REF_ALIASES = [
  'category_id',
  'categoryId',
  'category_ids',
  'categoryIds',
  'family_id',
  'familyId',
  'family_ids',
  'familyIds',
  'familia_id',
  'familiaId',
  'familia_ids',
  'familiaIds',
  'categories',
  'categorias',
  'familias',
  'family',
  'familia',
  'category',
  'categoria',
];
export const CATEGORY_SIGNAL_ALIASES = [
  ...new Set([
    ...CATEGORY_PATH_ALIASES,
    ...CATEGORY_REF_ALIASES,
    ...CATEGORY_ROOT_ALIASES,
    ...CATEGORY_GROUP_ALIASES,
    ...CATEGORY_LEAF_ALIASES,
  ]),
];
