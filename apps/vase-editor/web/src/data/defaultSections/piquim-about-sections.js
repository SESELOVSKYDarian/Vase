// Parte de defaultSections.js: PIQUIM_ABOUT_SECTIONS, DEFAULT_SECTIONS_BY_PAGE, getDefaultSectionsForPage, mergeSectionsWithDefaults.
import { DEFAULT_HOME_SECTIONS, cloneValue, deepMerge } from './default-home-sections.js';
import { DEFAULT_ABOUT_SECTIONS, PIQUIM_HOME_SECTIONS } from './default-about-sections.js';

export const PIQUIM_ABOUT_SECTIONS = [
    {
        id: 'piquim-about-hero',
        type: 'AboutHero',
        enabled: true,
        props: {
            tagline: 'Piquim Profesional',
            title: 'Materia prima premium para tu obrador',
            description:
                'Acompanamos a heladerias, panaderias y confiterias con productos estables, lectura clara de catalogo y soporte tecnico comercial.',
            primaryButton: { label: 'Ver catalogo', link: '/catalog' },
            secondaryButton: { label: 'Contactar ventas', link: '/about' },
            backgroundImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop',
            styles: {
                accentColor: '#ff4d00',
                overlayColor: '#1a1614',
                overlayOpacity: 0.8,
                textColor: '#fffaf6',
                mutedColor: 'rgba(255,250,246,0.85)',
            },
        },
    },
    {
        id: 'piquim-about-mission',
        type: 'AboutMission',
        enabled: true,
        props: {
            eyebrow: 'Como trabajamos',
            title: 'Dos mundos, una misma calidad constante.',
            paragraphs: [
                'En Piquim organizamos insumos para que cada maestro heladero, panadero y pastelero encuentre bases, pulpas, mejoradores y materias primas de manera agil.',
                'Acompanamos a negocios y fabricas de alimentos en Mar del Plata y la region para sostener una produccion diaria con rendimiento parejo.',
            ],
            highlights: [
                { icon: 'verified', title: 'Formula confiable', text: 'Insumos que rinden y mantienen uniformidad en cada receta.' },
                { icon: 'eco', title: 'Soporte de obrador', text: 'Asesoramiento tecnico para optimizar procesos de elaboracion.' },
            ],
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2072&auto=format&fit=crop',
            imageAlt: 'Elaboracion artesanal en obrador',
            styles: {
                accentColor: '#ff4d00',
                backgroundColor: '#ffffff',
                textColor: '#1a1614',
                mutedColor: '#6f625d',
            },
        },
    },
    {
        id: 'piquim-about-stats',
        type: 'AboutStats',
        enabled: true,
        props: {
            items: [
                { value: '+30', label: 'anos de trayectoria', accent: true },
                { value: '+200', label: 'productos en catalogo' },
                { value: '2', label: 'rubros especializados' },
                { value: 'Mar del Plata', label: 'origen y distribucion' },
            ],
            styles: {
                backgroundColor: '#1a1614',
                accentColor: '#ff4d00',
                textColor: '#ffffff',
                mutedColor: '#fffaf6',
            },
        },
    },
    {
        id: 'piquim-about-values',
        type: 'AboutValues',
        enabled: true,
        props: {
            title: 'Nuestros pilares',
            items: [
                {
                    icon: 'quality',
                    title: 'Calidad constante',
                    description: 'Cada lote entregado respeta las especificaciones de rendimiento y sabor esperadas.',
                },
                {
                    icon: 'commitment',
                    title: 'Compromiso de entrega',
                    description: 'Entendemos los tiempos de produccion y coordinamos repartos para evitar quiebres de stock.',
                },
                {
                    icon: 'innovation',
                    title: 'Innovacion en recetas',
                    description: 'Buscamos tendencias en bases, aditivos y soluciones para la industria dulce.',
                },
            ],
            styles: {
                backgroundColor: '#fffaf6',
                cardBackground: '#ffffff',
                accentColor: '#ff4d00',
                textColor: '#1a1614',
                mutedColor: '#6f625d',
            },
        },
    },
    {
        id: 'piquim-about-team',
        type: 'AboutTeam',
        enabled: true,
        props: {
            anchor: 'equipo',
            title: 'Detras de cada gran receta hay materias primas confiables.',
            quote:
                'Trabajamos codo a codo con maestros pasteleros y fabricantes de helados para que sus materias primas nunca sean una preocupacion.',
            author: 'Equipo Piquim',
            role: 'Operacion e insumos profesionales',
            avatarImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80&auto=format&fit=crop',
            backgroundImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop',
            styles: {
                backgroundColor: '#ffffff',
                overlayColor: '#1a1614',
                overlayOpacity: 0.34,
                textColor: '#1a1614',
            },
        },
    },
    {
        id: 'piquim-about-cta',
        type: 'AboutCTA',
        enabled: true,
        props: {
            title: 'Queres optimizar la materia prima de tu produccion?',
            primaryLink: { label: 'Ver catalogo', link: '/catalog' },
            secondaryLink: { label: 'Hablar con ventas', link: '/about' },
            styles: {
                backgroundColor: '#ffffff',
                accentColor: '#ff4d00',
                textColor: '#1a1614',
                mutedColor: '#6f625d',
            },
        },
    },
];

export const DEFAULT_SECTIONS_BY_PAGE = {
    home: DEFAULT_HOME_SECTIONS,
    about: DEFAULT_ABOUT_SECTIONS,
    'piquim-home': PIQUIM_HOME_SECTIONS,
    'piquim-about': PIQUIM_ABOUT_SECTIONS,
};

export const getDefaultSectionsForPage = (pageKey = 'home') =>
    cloneValue(DEFAULT_SECTIONS_BY_PAGE[pageKey] || DEFAULT_HOME_SECTIONS);

export const mergeSectionsWithDefaults = (pageKey = 'home', sections = []) => {
    const templates = DEFAULT_SECTIONS_BY_PAGE[pageKey] || [];
    const source = Array.isArray(sections) ? sections : [];

    return source.map((section) => {
        const template = templates.find((item) => item.type === section?.type);
        if (!template) return cloneValue(section);
        return deepMerge(template, section);
    });
};
