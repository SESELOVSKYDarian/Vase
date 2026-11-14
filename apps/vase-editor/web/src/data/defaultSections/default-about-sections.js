// Parte de defaultSections.js: DEFAULT_ABOUT_SECTIONS, PIQUIM_HOME_SECTIONS.
import { PIQUIM_CATALOG_CARDS } from '../piquimBranding';

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
