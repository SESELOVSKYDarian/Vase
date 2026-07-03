export const buildGtmSnippets = (containerId = '') => {
  const id = String(containerId || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '');

  if (!id) {
    return { head: '', body: '' };
  }

  const head = `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${id}');</script>\n<!-- End Google Tag Manager -->`;
  const body = `<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->`;

  return { head, body };
};

export const normalizeSeoSettings = (rawSeo = {}) => {
  const keywordList = Array.isArray(rawSeo?.secondaryKeywords)
    ? rawSeo.secondaryKeywords
    : String(rawSeo?.secondaryKeywords || '')
        .split(/[\n,]/g);

  const containerId = String(rawSeo?.tracking?.googleTagManagerContainerId || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '');

  return {
    title: String(rawSeo?.title || '').trim(),
    description: String(rawSeo?.description || '').trim(),
    keyword: String(rawSeo?.keyword || '').trim(),
    secondaryKeywords: keywordList.map((item) => String(item || '').trim()).filter(Boolean),
    canonicalPath: String(rawSeo?.canonicalPath || '').trim(),
    indexable: rawSeo?.indexable !== false,
    ogTitle: String(rawSeo?.ogTitle || '').trim(),
    ogDescription: String(rawSeo?.ogDescription || '').trim(),
    tracking: {
      googleTagManagerContainerId: containerId,
      enabled: rawSeo?.tracking?.enabled !== false && Boolean(containerId),
      notes: String(rawSeo?.tracking?.notes || '').trim(),
    },
  };
};

export const resolveCanonicalUrl = ({ pathname = '/', canonicalPath = '' } = {}) => {
  const resolvedPath = String(canonicalPath || '').trim() || String(pathname || '/').trim() || '/';
  if (/^https?:\/\//i.test(resolvedPath)) {
    return resolvedPath;
  }

  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  return `${window.location.origin.replace(/\/$/, '')}${normalizedPath}`;
};

