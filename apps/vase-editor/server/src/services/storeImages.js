// Todas las fotos que usa una tienda, con dónde se usa cada una. Lo usa app.vase.ar (sección Imágenes).
// Las fotos incrustadas (data:) no viajan: las de producto se piden por su dirección pública.

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i;
const MAX_IMAGES = 3000;

export function isImageUrl(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text || text.startsWith('data:')) return false;
  if (/^\/public\/products\/[^/]+\/images\/\d+/.test(text)) return true;
  if (!/^https?:\/\//i.test(text) && !(text.startsWith('/') && !text.startsWith('//'))) return false;
  return IMAGE_EXT.test(text) || /uploads\.vase\.ar|\/uploads\//.test(text);
}

function walk(value, found, depth = 0) {
  if (depth > 8 || found.size > 500 || value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (isImageUrl(value)) found.add(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, found, depth + 1));
    return;
  }
  if (typeof value === 'object') Object.values(value).forEach((item) => walk(item, found, depth + 1));
}

function collect(value) {
  const found = new Set();
  walk(value, found);
  return found;
}

/** Fotos de un producto: siempre por su dirección pública, que sirve tanto las subidas como las incrustadas. */
export function productImageUrls(product) {
  const data = product?.data && typeof product.data === 'object' ? product.data : {};
  const urls = [];
  const images = Array.isArray(data.images) ? data.images : [];
  // image_count: cuando la consulta no trae las fotos (pesan), solo cuántas hay.
  const count = Math.min(Number(product.image_count ?? images.length) || 0, 20);
  for (let index = 0; index < count; index += 1) {
    const image = images[index];
    const source = image === undefined ? 'x' : typeof image === 'string' ? image : image?.url || image?.src;
    if (typeof source === 'string' && source.trim()) urls.push(`/public/products/${product.id}/images/${index}`);
  }
  if (!urls.length) {
    const single = data.image_url || data.imageUrl || data.image;
    if (isImageUrl(single)) urls.push(String(single).trim());
  }
  return urls;
}

/**
 * groups: productos, paginas, marca. where: dónde se usa (nombre del producto, página o "Logo y colores").
 * productId: para las de producto, así app puede llevar a editarlo.
 */
export function collectStoreImages({ settings = {}, sections = [], categories = [], products = [] } = {}) {
  const map = new Map();
  const add = (src, group, where, productId = null) => {
    if (map.size >= MAX_IMAGES && !map.has(src)) return;
    const row = map.get(src) || { src, groups: new Set(), where: new Set(), productId };
    row.groups.add(group);
    if (where) row.where.add(where);
    map.set(src, row);
  };
  sections.forEach((section) => collect(section.props).forEach((src) => add(src, 'paginas', section.page === 'home' ? 'Inicio' : section.page === 'about' ? 'Nosotros' : section.page)));
  collect(settings).forEach((src) => add(src, 'marca', 'Logo, colores y catálogo'));
  categories.forEach((category) => collect(category.data || {}).forEach((src) => add(src, 'marca', `Categoría ${category.name}`)));
  products.forEach((product) => productImageUrls(product).forEach((src) => add(src, 'productos', product.name || 'Producto', String(product.id))));
  return [...map.values()].map((row) => ({ src: row.src, groups: [...row.groups], where: [...row.where], productId: row.productId }));
}
