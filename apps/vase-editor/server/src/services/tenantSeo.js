// SEO por tienda: valores por defecto de Piquim, favicon, robots.txt, sitemap.xml y datos
// estructurados. Todo lo que el cliente cargue en el panel admin (SEO / favicon) tiene prioridad:
// estos valores solo se usan cuando el campo esta vacio.

export const PIQUIM_SEO_DEFAULTS = {
  title: 'Piquim | Materia prima para heladería y panadería',
  description:
    'Heladería | Panadería. Materia prima que inspira cada receta. Comprar ahora. +200 productos para heladerías, panaderías y confiterías de Mar del Plata y la región.',
  faviconUrl: '/piquim/favicon-48.png',
  ogImage: '/piquim/og-image.jpg',
  themeColor: '#ff4d00',
};

const PIQUIM_FAVICONS = [
  { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/piquim/favicon-48.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/piquim/favicon-96.png' },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/piquim/favicon-192.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/piquim/apple-touch-icon.png' },
];

const SOCIAL_HOSTS = /^https?:\/\//i;
const ASSET_PATH = /\.[a-z0-9]{2,6}$/i;

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function isPiquimTenant(tenant = {}, branding = {}) {
  const text = (value) => String(value || '').trim().toLowerCase();
  return (
    text(tenant?.name) === 'piquim' ||
    text(tenant?.external_tenant_slug) === 'piquim' ||
    text(branding?.design_preset) === 'piquim'
  );
}

// Rellena solo los campos vacios con los valores por defecto de la tienda.
export function applyTenantSeoDefaults(rawSeo, tenant, branding) {
  const seo = rawSeo && typeof rawSeo === 'object' ? rawSeo : {};
  if (!isPiquimTenant(tenant, branding)) return seo;

  const filled = (value, fallback) => (String(value || '').trim() ? value : fallback);
  return {
    ...seo,
    title: filled(seo.title, PIQUIM_SEO_DEFAULTS.title),
    description: filled(seo.description, PIQUIM_SEO_DEFAULTS.description),
    ogTitle: filled(seo.ogTitle, filled(seo.title, PIQUIM_SEO_DEFAULTS.title)),
    ogDescription: filled(seo.ogDescription, filled(seo.description, PIQUIM_SEO_DEFAULTS.description)),
    favicon_url: filled(seo.favicon_url, PIQUIM_SEO_DEFAULTS.faviconUrl),
  };
}

export function resolveRequestOrigin(req) {
  const host = String(req.get('x-forwarded-host') || req.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) return '';
  // Las tiendas publicas siempre se sirven por HTTPS; solo en local se respeta http.
  const isLocal = /^(localhost|127\.|\[?::1)/.test(host);
  const proto = isLocal ? String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim() : 'https';
  return `${proto}://${host}`;
}

export function toAbsoluteUrl(origin, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!origin) return raw;
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function isAssetLikePath(path) {
  return ASSET_PATH.test(String(path || ''));
}

const dataUriPattern = /^data:/i;

// Links del favicon para el <head>. Un favicon cargado como data URI en el panel se sirve por /favicon.ico
// para que Google y otros buscadores puedan leerlo.
export function buildFaviconLinks({ branding = {}, seo = {}, tenant = {} }) {
  const configured = String(branding?.favicon_url || '').trim();
  if (configured) {
    if (dataUriPattern.test(configured)) return [{ rel: 'icon', href: '/favicon.ico' }];
    return [{ rel: 'icon', href: configured }];
  }
  if (isPiquimTenant(tenant, branding)) return PIQUIM_FAVICONS;
  const fromSeo = String(seo?.favicon_url || '').trim();
  return fromSeo ? [{ rel: 'icon', href: fromSeo }] : [];
}

export function renderLinkTags(links, origin = '') {
  return links
    .map((link) => {
      const attrs = Object.entries({ ...link, href: toAbsoluteUrl(origin, link.href) })
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
        .join(' ');
      return `<link ${attrs} />`;
    })
    .join('\n');
}

export function buildStructuredData({ tenant, branding = {}, seo = {}, origin }) {
  if (!origin) return null;
  const name = String(branding?.name || tenant?.name || '').trim();
  if (!name) return null;

  const socials = Array.isArray(branding?.footer?.socials) ? branding.footer.socials : [];
  const sameAs = [...new Set(socials.map((item) => String(item?.href || '').trim()).filter((href) => SOCIAL_HOSTS.test(href)))];
  const logo = isPiquimTenant(tenant, branding) ? toAbsoluteUrl(origin, '/piquim/favicon-192.png') : '';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name,
        url: origin,
        ...(logo ? { logo } : {}),
        ...(seo?.description ? { description: seo.description } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name,
        inLanguage: 'es-AR',
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
}

export function renderJsonLd(data) {
  // "<" escapado para que el JSON no pueda cerrar el script.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function cleanDescription(value, max = 155) {
  const text = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function buildRobotsTxt({ origin, indexable = true }) {
  const lines = ['User-agent: *'];
  if (!indexable) {
    lines.push('Disallow: /');
  } else {
    lines.push('Allow: /', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /checkout', 'Disallow: /cart', 'Disallow: /profile', 'Disallow: /order-success', 'Disallow: /order-details');
    if (origin) lines.push('', `Sitemap: ${origin}/sitemap.xml`);
  }
  return `${lines.join('\n')}\n`;
}

export function buildSitemapXml({ origin, entries }) {
  const urls = entries
    .map(({ path, lastmod, changefreq, priority }) => {
      const parts = [`<loc>${escapeHtml(`${origin}${path}`)}</loc>`];
      if (lastmod) parts.push(`<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`);
      if (changefreq) parts.push(`<changefreq>${changefreq}</changefreq>`);
      if (priority) parts.push(`<priority>${priority}</priority>`);
      return `  <url>${parts.join('')}</url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
