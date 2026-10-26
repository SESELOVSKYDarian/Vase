// Cache en memoria de las paginas publicas (Inicio, Nosotros). Se precargan en segundo plano y al pasar el
// mouse por un enlace, asi al navegar el contenido ya esta y no hace falta mostrar un esqueleto.

export const sameSections = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createPageCache({ load }) {
    const memory = new Map();
    const inflight = new Map();

    const fetchPage = (slug) => {
        if (inflight.has(slug)) return inflight.get(slug);
        const pending = Promise.resolve()
            .then(() => load(slug))
            .then((sections) => {
                if (Array.isArray(sections)) memory.set(slug, sections);
                return Array.isArray(sections) ? sections : null;
            })
            .catch(() => null)
            .finally(() => inflight.delete(slug));
        inflight.set(slug, pending);
        return pending;
    };

    return {
        get: (slug) => (memory.has(slug) ? memory.get(slug) : null),
        fetch: fetchPage,
        prefetch: (slug) => {
            if (!memory.has(slug)) fetchPage(slug);
        },
        clear: () => memory.clear(),
    };
}

const IMAGE_KEY = /(image|background|poster|avatar|logo|cover|thumb)/i;
const VIDEO_URL = /\.(mp4|webm|mov)(\?|$)|\/media\/[^?]*\?path=video/i;

// URLs de imagen de las primeras secciones: se precargan para que no aparezcan "de golpe".
export function collectImageUrls(sections, limit = 4) {
    const urls = [];
    const visit = (value, key) => {
        if (urls.length >= limit) return;
        if (typeof value === 'string') {
            if (IMAGE_KEY.test(key) && /^(https?:\/\/|\/)/i.test(value) && !VIDEO_URL.test(value) && !urls.includes(value)) {
                urls.push(value);
            }
            return;
        }
        if (Array.isArray(value)) value.forEach((item) => visit(item, key));
        else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => visit(v, k));
    };
    (Array.isArray(sections) ? sections.slice(0, 3) : []).forEach((section) => visit(section?.props, ''));
    return urls;
}
