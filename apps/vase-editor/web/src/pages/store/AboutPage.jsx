import React, { useEffect, useState } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import PageBuilder from '../../components/PageBuilder';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { getDefaultSectionsForPage, mergeSectionsWithDefaults } from '../../data/defaultSections';
import { useTenant } from '../../context/TenantContext';
import { isPiquimTenantIdentity } from '../../utils/tenantBranding';

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

const shouldUseFetchedSections = (pageKey, sections = []) => {
    if (!Array.isArray(sections) || !sections.length) return false;
    if (pageKey === 'piquim-about') {
        return sections.some((section) => STANDARD_ABOUT_SECTION_TYPES.has(section?.type));
    }
    return sections.some((section) => !LEGACY_PIQUIM_ABOUT_SECTION_TYPES.has(section?.type));
};

const filterSectionsForPage = (pageKey, sections = []) => {
    const source = Array.isArray(sections) ? sections : [];
    if (pageKey === 'piquim-about') {
        return source.filter((section) => STANDARD_ABOUT_SECTION_TYPES.has(section?.type));
    }
    return source.filter((section) => !LEGACY_PIQUIM_ABOUT_SECTION_TYPES.has(section?.type));
};

export default function AboutPage() {
    const { tenant, settings } = useTenant();
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });
    const pageKey = isPiquim ? 'piquim-about' : 'about';
    const [sections, setSections] = useState(() => getDefaultSectionsForPage(pageKey));

    useEffect(() => {
        setSections(getDefaultSectionsForPage(pageKey));
    }, [pageKey]);

    useEffect(() => {
        const loadAbout = async () => {
            try {
                const response = await fetch(`${getApiBase()}/public/pages/about`, {
                    headers: getTenantHeaders(),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (shouldUseFetchedSections(pageKey, data.sections)) {
                        setSections(mergeSectionsWithDefaults(pageKey, filterSectionsForPage(pageKey, data.sections)));
                    }
                }
            } catch (err) {
                console.error('No se pudo cargar la página Sobre Nosotros', err);
            }
        };

        loadAbout();
    }, [pageKey]);

    const visibleSections = Array.isArray(sections)
        ? sections.filter((section) => section.enabled !== false)
        : [];

    return (
        <StoreLayout>
            <PageBuilder sections={visibleSections} />
        </StoreLayout>
    );
}
