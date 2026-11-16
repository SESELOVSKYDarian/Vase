// Parte de useEditorState.js: RESERVED_PLACEHOLDER_TERMS, normalizePlaceholderValue, isReservedPlaceholder, PIQUIM_SECTION_TYPES, PIQUIM_ABOUT_SECTION_TYPES, GENERIC_FOOTER_DEFAULTS y más.
import { DEFAULT_HOME_SECTIONS, PIQUIM_ABOUT_SECTIONS, PIQUIM_HOME_SECTIONS, mergeSectionsWithDefaults } from '../../../data/defaultSections';
import { isPiquimTenantIdentity } from '../../../utils/tenantBranding';

export const RESERVED_PLACEHOLDER_TERMS = new Set(['messi']);

export const normalizePlaceholderValue = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

export const isReservedPlaceholder = (value) => RESERVED_PLACEHOLDER_TERMS.has(normalizePlaceholderValue(value));

export const PIQUIM_SECTION_TYPES = new Set(PIQUIM_HOME_SECTIONS.map((section) => section.type));
export const PIQUIM_ABOUT_SECTION_TYPES = new Set(PIQUIM_ABOUT_SECTIONS.map((section) => section.type));
export const GENERIC_FOOTER_DEFAULTS = {
    description: 'Catalogo, pedidos y atencion comercial desde una tienda online personalizada.',
    shopLinks: [
        { label: 'Catalogo', href: '/catalog' },
        { label: 'Nosotros', href: '/about' },
    ],
    helpLinks: [{ label: 'Terminos', href: '/terms' }],
    legalLinks: [{ label: 'Terminos y condiciones', href: '/terms' }],
    newsletter: { enabled: false },
    legalText: '(c) 2026 Vase Business. Todos los derechos reservados.',
};

export const normalizeHomeSectionsForBrand = (settings = {}, tenant = null, sections = []) => {
    const source = Array.isArray(sections) ? sections : [];
    if (!isPiquimTenantIdentity({ tenant, settings })) {
        const nonPiquimSections = source.filter((section) => !PIQUIM_SECTION_TYPES.has(section?.type));
        return nonPiquimSections.length ? mergeSectionsWithDefaults('home', nonPiquimSections) : DEFAULT_HOME_SECTIONS;
    }

    const hasPiquimBlocks = source.some((section) => PIQUIM_SECTION_TYPES.has(section?.type));
    if (!source.length || !hasPiquimBlocks) {
        return PIQUIM_HOME_SECTIONS;
    }
    return mergeSectionsWithDefaults('piquim-home', source);
};

export const getNavbarLinkLabel = (link) => {
    if (typeof link === 'string') return link;
    return link?.label || link?.href || link?.path || '';
};

export const getCategoryDepth = (category, byId, visited = new Set()) => {
    const categoryId = category?.id;
    const parentId = category?.parent_id;
    if (!categoryId || !parentId || visited.has(categoryId) || !byId.has(parentId)) return 0;
    visited.add(categoryId);
    return 1 + getCategoryDepth(byId.get(parentId), byId, visited);
};

export const sortCategoriesForCleanup = (items) => {
    const byId = new Map((Array.isArray(items) ? items : []).map((item) => [item.id, item]));
    return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
        const depthDiff = getCategoryDepth(b, byId) - getCategoryDepth(a, byId);
        if (depthDiff !== 0) return depthDiff;
        return String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' });
    });
};
