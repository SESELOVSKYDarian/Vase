import React, { useEffect, useState } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import PageBuilder from '../../components/PageBuilder';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { DEFAULT_ABOUT_SECTIONS } from '../../data/defaultSections';

export default function AboutPage() {
    const [sections, setSections] = useState(DEFAULT_ABOUT_SECTIONS);

    useEffect(() => {
        const loadAbout = async () => {
            try {
                const response = await fetch(`${getApiBase()}/public/pages/about`, {
                    headers: getTenantHeaders(),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data.sections)) {
                        setSections(data.sections);
                    }
                }
            } catch (err) {
                console.error('No se pudo cargar la página Sobre Nosotros', err);
            }
        };

        loadAbout();
    }, []);

    const visibleSections = Array.isArray(sections)
        ? sections.filter((section) => section.enabled !== false)
        : [];

    return (
        <StoreLayout>
            <PageBuilder sections={visibleSections} />
        </StoreLayout>
    );
}
