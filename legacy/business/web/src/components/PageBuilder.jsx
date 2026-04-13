import React from 'react';
import HeroSlider from './blocks/HeroSlider';
import BrandMarquee from './blocks/BrandMarquee';
import FeaturedProducts from './blocks/FeaturedProducts';
import Services from './blocks/Services';
import AboutHero from './blocks/AboutHero';
import AboutMission from './blocks/AboutMission';
import AboutStats from './blocks/AboutStats';
import AboutValues from './blocks/AboutValues';
import AboutTeam from './blocks/AboutTeam';
import AboutCTA from './blocks/AboutCTA';

const COMPONENT_MAP = {
    HeroSlider,
    BrandMarquee,
    FeaturedProducts,
    Services,
    AboutHero,
    AboutMission,
    AboutStats,
    AboutValues,
    AboutTeam,
    AboutCTA,
};

const ANCHOR_MAP = {
    FeaturedProducts: 'ofertas',
    BrandMarquee: 'marcas',
    Services: 'sobre-nosotros',
};

export default function PageBuilder({ sections = [] }) {
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
                    <section key={section.id || index} id={anchorId || undefined}>
                        <Component {...section.props} />
                    </section>
                );
            })}
        </div>
    );
}
