// Pedidos del catalogo: cache en memoria con "stale-while-revalidate" y precarga de los subcatalogos de Piquim.

export const CATALOG_FRESH_MS = 30_000;
const MAX_ENTRIES = 24;
const store = new Map();

// El subcatalogo de Piquim pide todos los productos juntos y pagina en el navegador: cambiar de pagina
// no debe volver a pedir ni borrar los productos (antes sí, y por eso hacia falta tocar el boton dos veces).
export const getProductsRequestPage = ({ isPiquimSubcatalog, page }) => (isPiquimSubcatalog ? 1 : page);

export const buildCatalogCacheKey = (url, headers = {}) => `${url}|${headers.Authorization || headers.authorization || ''}`;

export const getCatalogCache = (key) => store.get(key) || null;

export const isCatalogCacheFresh = (entry, now = Date.now()) => Boolean(entry) && now - entry.at < CATALOG_FRESH_MS;

export const setCatalogCache = (key, data) => {
    store.delete(key);
    store.set(key, { data, at: Date.now() });
    while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
};

export const clearCatalogCache = () => store.clear();

// Misma URL que arma CatalogPage para un rubro de Piquim sin otros filtros (el orden de los parametros importa
// porque la URL es la clave de la cache).
export const buildSubcatalogProductsUrl = ({ apiBase, category, sort = 'name-asc' }) => {
    const url = new URL(`${apiBase}/public/products`);
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '500');
    url.searchParams.set('grouped', 'true');
    url.searchParams.set('sort', sort);
    url.searchParams.set('category', category);
    return url.toString();
};

// Las imagenes de producto salen del servidor en 900 px; en las tarjetas alcanza con 480 px
// (mucho menos peso y menos trabajo de conversion en el servidor).
export const withImageWidth = (url, width = 480) => {
    if (typeof url !== 'string' || !url.startsWith('/public/products/') || /[?&]w=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
};

// Pide un rubro de Piquim y lo deja en cache. Si ya hay una copia reciente no vuelve a pedirlo.
export async function prefetchCatalogUrl({ url, headers, fetchImpl = fetch }) {
    const key = buildCatalogCacheKey(url, headers);
    if (isCatalogCacheFresh(getCatalogCache(key))) return;
    try {
        const response = await fetchImpl(url, { headers });
        if (!response.ok) return;
        const data = await response.json();
        setCatalogCache(key, { items: Array.isArray(data?.items) ? data.items : [], total: Number(data?.total || 0) });
    } catch {
        // La precarga es una mejora: si falla, la pagina pide los datos normalmente.
    }
}
