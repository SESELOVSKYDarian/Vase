// Bloques de las páginas de la tienda (editor.pageSections.home / .about).

export const BLOCK_TYPES = {
    home: [
        ['HeroSlider', 'Portada con fotos'],
        ['BrandMarquee', 'Marcas en movimiento'],
        ['FeaturedProducts', 'Productos destacados'],
        ['Services', 'Beneficios'],
    ],
    about: [
        ['AboutHero', 'Portada'],
        ['AboutMission', 'Misión'],
        ['AboutStats', 'Números'],
        ['AboutValues', 'Valores'],
        ['AboutTeam', 'Equipo'],
        ['AboutCTA', 'Llamado a la acción'],
    ],
    'piquim-home': [
        ['PiquimHero', 'Portada con video'],
        ['PiquimAnnounceBar', 'Barra de anuncio'],
        ['PiquimTresMundos', 'Bloque destacado'],
        ['PiquimCatalog3Panel', 'Catálogo en 3 paneles'],
        ['PiquimFeaturedProducts', 'Productos destacados'],
        ['PiquimCTABanner', 'Llamado a la acción'],
    ],
    'piquim-about': [
        ['PiquimHero', 'Portada con video'],
        ['PiquimAnnounceBar', 'Barra de anuncio'],
        ['PiquimTresMundos', 'Bloque destacado'],
        ['PiquimCatalog3Panel', 'Líneas de negocio'],
        ['PiquimCTABanner', 'Llamado a la acción'],
    ],
};

export const editorPageKey = (page, isPiquim) => (isPiquim ? `piquim-${page}` : page);

export function blockLabel(pageKey, type) {
    const known = (BLOCK_TYPES[pageKey] || []).find(([id]) => id === type)
        || Object.values(BLOCK_TYPES).flat().find(([id]) => id === type);
    return known ? known[1] : String(type || 'Bloque').replace(/([A-Z])/g, ' $1').trim();
}

// Texto corto para reconocer el bloque en la lista (su título si tiene).
export function blockSummary(block) {
    const props = block?.props || {};
    const text = props.title || props.heading || props.headline || props.text || props.slides?.[0]?.title || '';
    return String(text).replace(/<[^>]+>/g, '').trim().slice(0, 48);
}

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sec-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

export function createBlock(type, templates = []) {
    const template = templates.find((item) => item.type === type);
    return template ? { ...clone(template), id: newId(), enabled: true } : { id: newId(), type, enabled: true, props: { styles: {} } };
}

export function moveBlock(list, from, to) {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export const toggleBlock = (list, id) => list.map((block) => (block.id === id ? { ...block, enabled: block.enabled === false } : block));
export const removeBlock = (list, id) => list.filter((block) => block.id !== id);
export const replaceBlock = (list, next) => list.map((block) => (block.id === next.id ? next : block));
