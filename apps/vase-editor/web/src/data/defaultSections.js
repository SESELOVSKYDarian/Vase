import { getDefaultBrandMarqueeProps } from './brandMarqueeDefaults';
import { PIQUIM_CATALOG_CARDS } from './piquimBranding';

const cloneValue = (value) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
};

const isPlainObject = (value) =>
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value);

const deepMerge = (baseValue, overrideValue) => {
    if (overrideValue === undefined) return cloneValue(baseValue);

    if (Array.isArray(baseValue)) {
        return Array.isArray(overrideValue) ? cloneValue(overrideValue) : cloneValue(baseValue);
    }

    if (isPlainObject(baseValue)) {
        const next = { ...cloneValue(baseValue) };
        if (!isPlainObject(overrideValue)) return next;

        Object.entries(overrideValue).forEach(([key, value]) => {
            next[key] = key in next ? deepMerge(next[key], value) : cloneValue(value);
        });
        return next;
    }

    return cloneValue(overrideValue);
};

export const DEFAULT_HOME_SECTIONS = [
    {
        id: 'home-hero',
        type: 'HeroSlider',
        enabled: true,
        props: {
            variant: 'sanitarios_industrial',
            slides: [
                {
                    label: 'Tienda personalizada',
                    title: 'TU MARCA\nLISTA PARA VENDER',
                    description:
                        'Catalogo, pedidos y atencion comercial organizados para vender online con una experiencia clara.',
                    featured: 'Atencion comercial',
                    cardEyebrow: 'Linea destacada',
                    cardTitle: 'Catalogo destacado',
                    specLabel: 'Stock, pedidos y consultas',
                    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop',
                    primaryButtonLabel: 'VER CATALOGO',
                    primaryButtonLink: '/catalog',
                    secondaryButtonLabel: 'NOSOTROS',
                    secondaryButtonLink: '/about',
                },
                {
                    label: 'Operacion comercial',
                    title: 'PRODUCTOS\nSIEMPRE ORDENADOS',
                    description:
                        'Una tienda preparada para presentar categorias, productos, promociones y canales de contacto.',
                    featured: 'Entrega coordinada',
                    cardEyebrow: 'Gestion online',
                    cardTitle: 'Pedidos y consultas',
                    specLabel: 'Catalogo actualizado',
                    image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=2070&auto=format&fit=crop',
                    primaryButtonLabel: 'EXPLORAR LINEAS',
                    primaryButtonLink: '/catalog',
                    secondaryButtonLabel: 'CONTACTO',
                    secondaryButtonLink: '/about',
                },
            ],
            styles: {
                backgroundColor: '#f97316',
                leftPanelColor: '#121212',
                titleColor: '#ffffff',
                textColor: '#f4f4f5',
                labelColor: '#f97316',
                primaryButtonBgColor: '#ffffff',
                primaryButtonTextColor: '#f97316',
                secondaryButtonBgColor: '#18181b',
                secondaryButtonTextColor: '#ffffff',
                secondaryButtonBorderColor: '#3f3f46',
            },
        },
    },
    {
        id: 'home-brands',
        type: 'BrandMarquee',
        enabled: true,
        props: {
            ...getDefaultBrandMarqueeProps(),
            variant: 'grid_static',
            eyebrow: 'Marcas y lineas',
            title: 'Un catalogo ordenado para tu negocio',
            subtitle: 'Categorias claras para comparar productos, consultar disponibilidad y avanzar con pedidos.',
            items: [
                { id: 'brand-generic-lineas', name: 'Lineas' },
                { id: 'brand-generic-categorias', name: 'Categorias' },
                { id: 'brand-generic-destacados', name: 'Destacados' },
                { id: 'brand-generic-novedades', name: 'Novedades' },
                { id: 'brand-generic-ofertas', name: 'Ofertas' },
                { id: 'brand-generic-stock', name: 'Stock' },
                { id: 'brand-generic-pedidos', name: 'Pedidos' },
            ],
            styles: {
                backgroundColor: '#f8fafc',
                panelBackgroundColor: '#ffffff',
                titleColor: '#111827',
                subtitleColor: '#64748b',
                badgeBackgroundColor: '#f97316',
                badgeTextColor: '#ffffff',
                cardBackgroundColor: '#ffffff',
                cardBorderColor: '#dbe2ea',
            },
        },
    },
    {
        id: 'home-featured',
        type: 'FeaturedProducts',
        enabled: true,
        props: {
            variant: 'modern',
            title: 'Productos destacados',
            subtitle: 'Los productos principales de la tienda listos para consultar, comparar y comprar.',
            ctaLabel: 'Ver catalogo completo',
            ctaLink: '/catalog',
            styles: {
                backgroundColor: '#ffffff',
                cardBackgroundColor: '#ffffff',
                titleColor: '#111827',
                subtitleColor: '#64748b',
                accentColor: '#f97316',
                priceColor: '#f97316',
                buttonBackgroundColor: '#111827',
                buttonTextColor: '#ffffff',
            },
        },
    },
    {
        id: 'home-services',
        type: 'Services',
        enabled: true,
        props: {
            title: 'Acompanamiento para elegir mejor',
            subtitle: 'Atencion clara para resolver productos, disponibilidad, pagos y coordinacion de entrega.',
            items: [
                {
                    icon: 'support_agent',
                    title: 'Atencion comercial',
                    text: 'Ayudamos a responder consultas y convertir busquedas en pedidos concretos.',
                },
                {
                    icon: 'local_shipping',
                    title: 'Entrega coordinada',
                    text: 'Organizamos retiro o envio segun cobertura para que la compra llegue a tiempo.',
                },
                {
                    icon: 'shield',
                    title: 'Compra con respaldo',
                    text: 'Cada pedido conserva seguimiento comercial para resolver consultas y cambios.',
                },
            ],
            styles: {
                backgroundColor: '#111827',
                titleColor: '#ffffff',
                subtitleColor: '#cbd5e1',
                cardBackgroundColor: '#1f2937',
                cardTitleColor: '#ffffff',
                cardTextColor: '#cbd5e1',
                iconColor: '#f97316',
                iconBackgroundColor: 'rgba(249, 115, 22, 0.16)',
            },
        },
    },
];

export const DEFAULT_ABOUT_SECTIONS = [
    {
        id: 'about-hero',
        type: 'AboutHero',
        enabled: true,
        props: {
            tagline: 'Vase Business',
            title: 'Una tienda online preparada para tu operacion',
            description:
                'Acompanamos cada venta con catalogo claro, canales de contacto y una experiencia adaptable a cada cliente.',
            primaryButton: { label: 'Ver catalogo', link: '/catalog' },
            secondaryButton: { label: 'Contactar ventas', link: '/about' },
            backgroundImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop',
            styles: {
                accentColor: '#f97316',
                overlayColor: '#111827',
                overlayOpacity: 0.8,
                textColor: '#f8fafc',
                mutedColor: 'rgba(248,250,252,0.82)',
            },
        },
    },
    {
        id: 'about-mission',
        type: 'AboutMission',
        enabled: true,
        props: {
            eyebrow: 'Como trabajamos',
            title: 'Atencion comercial para comprar con criterio.',
            paragraphs: [
                'La tienda organiza su catalogo para que cada cliente pueda comparar rubros, variantes y alternativas sin friccion.',
                'El equipo acompana consultas comerciales para transformar una busqueda amplia en una compra concreta.',
            ],
            highlights: [
                { icon: 'verified', title: 'Catalogo claro', text: 'Categorias y fichas orientadas a decision de compra real.' },
                { icon: 'eco', title: 'Soluciones aplicables', text: 'Productos pensados para la necesidad real de cada cliente.' },
            ],
            image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=2070&auto=format&fit=crop',
            imageAlt: 'Espacio comercial moderno',
            styles: {
                accentColor: '#f97316',
                backgroundColor: '#ffffff',
                textColor: '#111827',
                mutedColor: '#64748b',
            },
        },
    },
    {
        id: 'about-stats',
        type: 'AboutStats',
        enabled: true,
        props: {
            items: [
                { value: '+30', label: 'anos de experiencia', accent: true },
                { value: '+200', label: 'productos' },
                { value: '24/7', label: 'catalogo online' },
                { value: 'Soporte', label: 'comercial' },
            ],
            styles: {
                backgroundColor: '#111827',
                accentColor: '#f97316',
                textColor: '#ffffff',
                mutedColor: '#cbd5e1',
            },
        },
    },
    {
        id: 'about-values',
        type: 'AboutValues',
        enabled: true,
        props: {
            title: 'Principios de trabajo',
            items: [
                {
                    icon: 'quality',
                    title: 'Claridad',
                    description: 'La compra debe ser simple: producto, medida, uso y disponibilidad visibles.',
                },
                {
                    icon: 'commitment',
                    title: 'Continuidad',
                    description: 'El objetivo es resolver necesidades actuales y futuras de cada cliente.',
                },
                {
                    icon: 'innovation',
                    title: 'Criterio de producto',
                    description: 'Ordenamos variedad de rubros en decisiones concretas y aplicables.',
                },
            ],
            styles: {
                backgroundColor: '#f8fafc',
                cardBackground: '#ffffff',
                accentColor: '#f97316',
                textColor: '#111827',
                mutedColor: '#64748b',
            },
        },
    },
    {
        id: 'about-team',
        type: 'AboutTeam',
        enabled: true,
        props: {
            anchor: 'equipo',
            title: 'Acompanamos proyectos, no solo pedidos.',
            quote:
                'Cuando el catalogo, el stock y la comunicacion comercial se alinean, comprar online se vuelve simple.',
            author: 'Equipo comercial',
            role: 'Operacion y soporte de producto',
            avatarImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80&auto=format&fit=crop',
            backgroundImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop',
            styles: {
                backgroundColor: '#ffffff',
                overlayColor: '#111827',
                overlayOpacity: 0.34,
                textColor: '#111827',
            },
        },
    },
    {
        id: 'about-cta',
        type: 'AboutCTA',
        enabled: true,
        props: {
            title: 'Necesitas resolver una compra o consulta?',
            primaryLink: { label: 'Ver productos', link: '/catalog' },
            secondaryLink: { label: 'Hablar con ventas', link: '/about' },
            styles: {
                backgroundColor: '#ffffff',
                accentColor: '#f97316',
                textColor: '#111827',
                mutedColor: '#64748b',
            },
        },
    },
];

export const PIQUIM_HOME_SECTIONS = [
    {
        id: 'piquim-hero',
        type: 'PiquimHero',
        enabled: true,
        props: {
            badgeText: 'Heladeria | Panaderia/Confiteria',
            preTitle: 'Materia prima',
            titleHighlight: 'que inspira',
            postTitle: 'cada receta.',
            primaryLabel: 'Comprar ahora',
            primaryHref: '/catalog',
            secondaryLabel: 'Ver catalogo',
            secondaryHref: '/catalog',
            statProducts: '+200',
            statCategories: '2',
            statYears: '+30',
            mediaType: 'video',
            image: '',
            videoUrl: '',
            videoUrlDesktop: '',
            videoUrlMobile: '',
            videoPoster: '',
            videoAutoplay: true,
            videoLoop: true,
            videoMuted: true,
            videoControls: false,
        },
    },
    {
        id: 'piquim-announce',
        type: 'PiquimAnnounceBar',
        enabled: true,
        props: {
            text: 'ENVIO GRATUITO en pedidos +$50.000 ARG · 10% OFF en tu primera compra · Industria Argentina · Hecho en Mar del Plata',
        },
    },
    {
        id: 'piquim-tres-mundos',
        type: 'PiquimTresMundos',
        enabled: true,
        props: {
            title: 'Dos mundos, una misma calidad',
            subtitle: 'Elegi tu rubro y encontra productos pensados para tu operacion.',
            items: [
                {
                    id: 'heladeria',
                    title: 'Heladeria',
                    description: 'Bases, pulpas y coberturas para un mostrador con sabor constante.',
                    image: '/piquim/catalog-heladeria.jpg',
                    href: '/catalog?category=heladeria',
                },
                {
                    id: 'panaderia',
                    title: 'Panaderia/Confiteria',
                    description: 'Mejoradores, rellenos, cremas y materias primas para produccion diaria.',
                    image: '/piquim/catalog-panaderia.jpg',
                    href: '/catalog?category=panaderia',
                },
            ],
        },
    },
    {
        id: 'piquim-catalog',
        type: 'PiquimCatalog3Panel',
        enabled: true,
        props: {
            title: 'Catalogos por especialidad',
            subtitle: 'Accede rapido a cada linea de productos.',
            cards: PIQUIM_CATALOG_CARDS,
        },
    },
    {
        id: 'piquim-featured',
        type: 'PiquimFeaturedProducts',
        enabled: true,
        props: {
            title: 'Productos destacados',
            subtitle: 'Una seleccion para compra agil y rendimiento constante.',
            ctaLabel: 'Ver catalogo completo',
            ctaLink: '/catalog',
            products: [],
        },
    },
    {
        id: 'piquim-cta',
        type: 'PiquimCTABanner',
        enabled: true,
        props: {
            title: 'Necesitas ayuda para elegir materia prima?',
            subtitle: 'Nuestro equipo comercial te acompana para armar pedidos segun tu produccion.',
            primaryLabel: 'Hablar con ventas',
            primaryHref: '/about',
            secondaryLabel: 'Ver catalogo',
            secondaryHref: '/catalog',
        },
    },
];

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

const DEFAULT_SECTIONS_BY_PAGE = {
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
