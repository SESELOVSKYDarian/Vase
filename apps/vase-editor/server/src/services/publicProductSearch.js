// Busqueda del catalogo publico. Debe coincidir con las sugerencias del buscador
// (Header.jsx): sin distinguir mayusculas ni tildes, cada palabra por separado y
// en cualquier orden, y tolerando espacios/puntuacion ("5kg" encuentra "5 kg").

const ACCENTED = 'áéíóúüñàèìòùâêîôûäëïöç';
const PLAIN = 'aeiouunaeiouaeiouaeioc';

const MAX_TOKENS = 8;

export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function tokenizeSearchQuery(value) {
  const tokens = normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(Boolean);
  return [...new Set(tokens)].slice(0, MAX_TOKENS);
}

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const normalizeSql = (expression) => `translate(lower(${expression}), '${ACCENTED}', '${PLAIN}')`;

// Texto donde se busca: nombre, descripciones, SKU, codigo ERP, marca y categorias.
const SEARCH_HAYSTACK_SQL = normalizeSql([
  "concat_ws(' ', p.name, p.description, p.data->>'short_description', p.sku, p.erp_id, p.brand,",
  '(select string_agg(c.name, \' \') from product_categories pc',
  'join categories c on c.id = pc.category_id',
  'where pc.product_id = p.id and c.tenant_id = p.tenant_id))',
].join(' '));

// Devuelve la condicion SQL (o '' si no hay terminos) y agrega sus parametros a `params`.
export function buildPublicProductSearchSql(query, params) {
  const tokens = tokenizeSearchQuery(query);
  if (!tokens.length) return '';

  const conditions = tokens.map((token) => {
    params.push(`%${escapeLike(token)}%`);
    const textParam = `$${params.length}`;
    const compact = token.replace(/[^a-z0-9]/g, '');
    if (!compact) return `search.haystack like ${textParam}`;
    params.push(`%${compact}%`);
    return `(search.haystack like ${textParam} or search.compact like $${params.length})`;
  });

  return [
    'exists (select 1 from (',
    "select haystack, regexp_replace(haystack, '[^a-z0-9]', '', 'g') as compact",
    `from (select ${SEARCH_HAYSTACK_SQL} as haystack) h`,
    `) search where ${conditions.join(' and ')})`,
  ].join(' ');
}
