import { getApiBase, getTenantHeaders } from './api';
import { collectImageUrls, createPageCache, sameSections } from './pageCacheCore';

export { sameSections };

const pageCache = createPageCache({
    load: async (slug) => {
        const response = await fetch(`${getApiBase()}/public/pages/${slug}`, { headers: getTenantHeaders() });
        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data?.sections) ? data.sections : [];
    },
});

const preloadImages = (sections) => {
    if (typeof Image === 'undefined') return;
    collectImageUrls(sections).forEach((url) => {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
    });
};

export const getCachedPage = (slug) => pageCache.get(slug);

export const fetchPublicPage = (slug) =>
    pageCache.fetch(slug).then((sections) => {
        if (sections) preloadImages(sections);
        return sections;
    });

export const prefetchPublicPage = (slug) => {
    if (!pageCache.get(slug)) fetchPublicPage(slug);
};
