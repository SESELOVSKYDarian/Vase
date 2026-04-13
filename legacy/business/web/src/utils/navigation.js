const INTERNAL_ALIAS_MAP = {
    inicio: '/',
    home: '/',
    catalogo: '/catalog',
    catalog: '/catalog',
    ofertas: '/#ofertas',
    oferta: '/#ofertas',
    nosotros: '/about',
    about: '/about',
    'sobre-nosotros': '/about',
    'sobre nosotros': '/about',
    contacto: '/#contacto',
};

const normalizeKey = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

export const isExternalPath = (value) =>
    /^(https?:|mailto:|tel:|\/\/)/i.test(String(value || '').trim());

export const normalizeInternalPath = (path, fallback = '/') => {
    const raw = String(path || '').trim();
    if (!raw) return fallback;
    if (isExternalPath(raw)) return raw;

    if (raw.startsWith('#')) {
        if (raw === '#') return fallback;
        return `/${raw}`;
    }

    const [rawPath, rawHash] = raw.split('#');
    const key = normalizeKey(rawPath.replace(/^\/+/, ''));
    const aliasPath = INTERNAL_ALIAS_MAP[key];
    const pathPart = aliasPath || (rawPath.startsWith('/') ? rawPath : `/${rawPath}`);
    const hashPart = rawHash ? `#${rawHash}` : '';
    return `${pathPart}${hashPart}`;
};

/**
 * Simple navigation utility for SPA routing without hashes.
 * @param {string} path - The path to navigate to (e.g., '/admin')
 */
export const navigate = (path) => {
    if (isExternalPath(path)) {
        window.location.href = path;
        return;
    }

    const normalizedTarget = normalizeInternalPath(path, '/');
    const nextPath = normalizedTarget.startsWith('#')
        ? `${window.location.pathname}${normalizedTarget}`
        : normalizedTarget;
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new Event('navigate'));

    const hashIndex = nextPath.indexOf('#');
    if (hashIndex !== -1) {
        const hash = nextPath.slice(hashIndex + 1);
        if (hash) {
            const scrollToHash = (attempts = 0) => {
                const target = document.getElementById(hash);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return;
                }
                if (attempts < 20) {
                    window.requestAnimationFrame(() => scrollToHash(attempts + 1));
                } else {
                    window.scrollTo(0, 0);
                }
            };
            scrollToHash();
            return;
        }
    }

    window.scrollTo(0, 0);
};
