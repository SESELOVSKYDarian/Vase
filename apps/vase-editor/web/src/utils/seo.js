const DEFAULT_SEO_TRACKING = {
    googleTagManagerContainerId: '',
    enabled: false,
    notes: '',
};

const DEFAULT_SEO = {
    title: '',
    description: '',
    keyword: '',
    secondaryKeywords: [],
    canonicalPath: '',
    indexable: true,
    ogTitle: '',
    ogDescription: '',
    tracking: DEFAULT_SEO_TRACKING,
};

const normalizeKeywordList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }

    return String(value || '')
        .split(/[\n,]/g)
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const normalizeTracking = (tracking = {}) => {
    const containerId = String(tracking?.googleTagManagerContainerId || '')
        .trim()
        .replace(/[^A-Za-z0-9_-]/g, '');
    return {
        ...DEFAULT_SEO_TRACKING,
        ...tracking,
        googleTagManagerContainerId: containerId,
        enabled: tracking?.enabled !== false && Boolean(containerId),
        notes: String(tracking?.notes || '').trim(),
    };
};

export const buildDefaultSeoSettings = () => ({
    ...DEFAULT_SEO,
    tracking: { ...DEFAULT_SEO_TRACKING },
});

export const normalizeSeoSettings = (rawSeo = {}) => ({
    ...buildDefaultSeoSettings(),
    ...rawSeo,
    title: String(rawSeo?.title || '').trim(),
    description: String(rawSeo?.description || '').trim(),
    keyword: String(rawSeo?.keyword || '').trim(),
    secondaryKeywords: normalizeKeywordList(rawSeo?.secondaryKeywords),
    canonicalPath: String(rawSeo?.canonicalPath || '').trim(),
    indexable: rawSeo?.indexable !== false,
    ogTitle: String(rawSeo?.ogTitle || '').trim(),
    ogDescription: String(rawSeo?.ogDescription || '').trim(),
    tracking: normalizeTracking(rawSeo?.tracking || {}),
});

export const buildGtmSnippets = (containerId = '') => {
    const id = String(containerId || '').trim();
    if (!id) {
        return { head: '', body: '' };
    }

    const head = `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${id}');</script>\n<!-- End Google Tag Manager -->`;
    const body = `<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->`;

    return { head, body };
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
