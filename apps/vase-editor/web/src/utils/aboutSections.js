import {
    DEFAULT_ABOUT_SECTIONS,
    PIQUIM_ABOUT_SECTIONS,
    mergeSectionsWithDefaults,
} from '../data/defaultSections';
import { isPiquimTenantIdentity } from './tenantBranding';

const STANDARD_ABOUT_SECTION_TYPES = new Set([
    'AboutHero',
    'AboutMission',
    'AboutStats',
    'AboutValues',
    'AboutTeam',
    'AboutCTA',
]);

const LEGACY_PIQUIM_ABOUT_SECTION_TYPES = new Set([
    'PiquimHero',
    'PiquimAnnounceBar',
    'PiquimTresMundos',
    'PiquimCatalog3Panel',
    'PiquimCTABanner',
]);

// Una sola regla para el panel admin y para la tienda: lo que el admin muestra en "Nosotros" es
// exactamente lo que ve el visitante (antes la tienda no completaba los valores faltantes con
// los de la plantilla y podia verse distinto).
export const normalizeAboutSectionsForBrand = (settings = {}, tenant = null, sections = []) => {
    const source = Array.isArray(sections) ? sections : [];
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });

    if (!isPiquim) {
        const nonPiquimSections = source.filter((section) => !LEGACY_PIQUIM_ABOUT_SECTION_TYPES.has(section?.type));
        return nonPiquimSections.length ? mergeSectionsWithDefaults('about', nonPiquimSections) : DEFAULT_ABOUT_SECTIONS;
    }

    const standardSections = source.filter((section) => STANDARD_ABOUT_SECTION_TYPES.has(section?.type));
    if (!standardSections.length) {
        return PIQUIM_ABOUT_SECTIONS;
    }
    return mergeSectionsWithDefaults('piquim-about', standardSections);
};
