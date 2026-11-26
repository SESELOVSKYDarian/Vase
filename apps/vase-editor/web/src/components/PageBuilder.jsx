import React, { Suspense, lazy } from 'react';
import HeroSlider from './blocks/HeroSlider';
import BrandMarquee from './blocks/BrandMarquee';
import FeaturedProducts from './blocks/FeaturedProducts';
import Services from './blocks/Services';
import { BLOCK_LOADERS } from './blockLoaders';
import { useTenant } from '../context/TenantContext';
import { deviceClass, spacingStyle } from '../utils/sectionStyle';
import Reveal from './Reveal';

// Los bloques que usa casi toda tienda en el inicio van incluidos, así aparecen sin esperar.
// El resto (Sobre nosotros, grillas y los de Piquim) se descarga solo si la página lo usa:
// una tienda común ya no baja código de bloques que no muestra.
const COMPONENT_MAP = {
    HeroSlider,
    BrandMarquee,
    FeaturedProducts,
    Services,
    ...Object.fromEntries(Object.entries(BLOCK_LOADERS).map(([name, load]) => [name, lazy(load)])),
};

const ANCHOR_MAP = {
    FeaturedProducts: 'ofertas',
    BrandMarquee: 'marcas',
    Services: 'sobre-nosotros',
};

// Altura que se reserva mientras llega un bloque, para que la página no salte cuando aparece.
const PLACEHOLDER_HEIGHT = { PiquimAnnounceBar: 40, PiquimHero: 520, AboutHero: 420 };

// Lo que se ve mientras se descarga un bloque: un rectángulo suave del tamaño aproximado.
function BlockSkeleton({ type }) {
    return (
        <div
            aria-hidden="true"
            className="w-full animate-pulse bg-black/5"
            style={{ minHeight: PLACEHOLDER_HEIGHT[type] || 280 }}
        />
    );
}

// ignoreDevice: en la vista previa del editor los bloques ocultos en un dispositivo se muestran atenuados en vez de desaparecer.
export default function PageBuilder({ sections = [], ignoreDevice = false }) {
    const { settings } = useTenant();
    const catalogCards = Array.isArray(settings?.branding?.catalog_cards) && settings.branding.catalog_cards.length
        ? settings.branding.catalog_cards
        : null;
    if (!sections || sections.length === 0) {
        return (
            <div className="p-10 text-center border-2 border-dashed border-gray-300 rounded-xl m-10">
                <p className="text-gray-500">Página vacía. Agregá secciones desde el editor.</p>
            </div>
        );
    }

    const usedAnchors = new Set();

    return (
        <div className="flex flex-col">
            {sections.map((section, index) => {
                const Component = COMPONENT_MAP[section.type];
                const anchor = section.props?.anchor || ANCHOR_MAP[section.type];
                const anchorId = anchor && !usedAnchors.has(anchor) ? anchor : null;
                if (anchorId) {
                    usedAnchors.add(anchorId);
                }

                if (!Component) {
                    console.warn(`Tipo de componente desconocido: ${section.type}`);
                    return (
                        <div
                            key={section.id || index}
                            className="p-4 bg-red-100 text-red-800 text-center my-2 rounded"
                        >
                            No existe el bloque "{section.type.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}".
                        </div>
                    );
                }

                return (
                    <section
                        key={section.id || index}
                        id={anchorId || undefined}
                        className={ignoreDevice ? undefined : deviceClass(section.props)}
                        style={spacingStyle(section.props)}
                    >
                        {/* Cada sección aparece suave al entrar en pantalla (en el editor se ve directo). */}
                        <Reveal disabled={ignoreDevice}>
                            <Suspense fallback={<BlockSkeleton type={section.type} />}>
                                <Component {...section.props} {...(section.type === 'PiquimCatalog3Panel' && catalogCards ? { cards: catalogCards } : {})} />
                            </Suspense>
                        </Reveal>
                    </section>
                );
            })}
        </div>
    );
}
