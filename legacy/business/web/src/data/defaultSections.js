import { getDefaultBrandMarqueeProps } from './brandMarqueeDefaults';

export const DEFAULT_HOME_SECTIONS = [
    {
        id: 'home-hero',
        type: 'HeroSlider',
        enabled: true,
        props: {
            variant: 'classic',
            title: 'Sanitarios y griferia para cada proyecto',
            subtitle: 'Productos pensados para renovar tu bano con calidad, diseno y stock real.',
            tag: 'Coleccion destacada',
            primaryButton: { label: 'Ver catalogo', link: '/catalog' },
            secondaryButton: { label: 'Conocer la marca', link: '/about' },
            styles: { alignment: 'center', overlayOpacity: '0.6' },
        },
    },
    {
        id: 'home-brands',
        type: 'BrandMarquee',
        enabled: true,
        props: getDefaultBrandMarqueeProps(),
    },
    {
        id: 'home-featured',
        type: 'FeaturedProducts',
        enabled: true,
        props: {
            variant: 'classic',
            title: 'Productos destacados',
            subtitle: 'Lo mas elegido para renovar banos, cocinas y espacios de uso diario.',
            ctaLabel: 'Ver catalogo completo',
            ctaLink: '/catalog',
            styles: { alignment: 'items-end justify-between' },
        },
    },
    {
        id: 'home-services',
        type: 'Services',
        enabled: true,
        props: {
            title: 'Te acompanamos en cada compra',
            subtitle: 'Asesoria, entrega y soporte para que elijas con confianza.',
            items: [
                { icon: 'support_agent', title: 'Asesoramiento experto', text: 'Te ayudamos a elegir la opcion correcta segun tu obra o renovacion.' },
                { icon: 'local_shipping', title: 'Entrega coordinada', text: 'Retiro en sucursal o envio segun la cobertura disponible para tu zona.' },
                { icon: 'shield', title: 'Compra con respaldo', text: 'Atencion clara, seguimiento y soporte para una experiencia de compra mas simple.' },
            ],
        },
    },
];

export const DEFAULT_ABOUT_SECTIONS = [
    {
        id: 'about-hero',
        type: 'AboutHero',
        enabled: true,
        props: {
            tagline: 'Desde 2014',
            title: 'Nuestra historia',
            description:
                'Construimos experiencias de compra pensadas para marcas que quieren crecer con identidad propia y una comunicacion clara.',
            primaryButton: { label: 'Ver colecciones', link: '/catalog' },
            secondaryButton: { label: 'Conocer al equipo', link: '#equipo' },
            backgroundImage:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDXU4BgrC9W5u9X6qi9WU5vv7H941UAvD-VYPk3k9YMvJ6QF9d4dfPigHBmjoGRgXAabQfjZhvwj8bEniRv7PJlqKfUiVrTvgGKiB3jc3UPiRUTFfETrULuzjjwlUJF_ngD-svg2JWO6i--ELVyRiQw8BxwzxIFUoBtLZ96yurT2qPiR2EM74_bN9dMICD1YE0RFyk4MCqlrq5bvG-5OhCNCh4qV0M_0zANXTAfRmeLbBZQrrOeyPxAl9Zys3aCIsE4XLdEPuV-MZs',
            styles: {
                accentColor: '#f27f0d',
                overlayColor: '#221910',
                overlayOpacity: 0.85,
                textColor: '#ffffff',
                mutedColor: 'rgba(255,255,255,0.75)',
            },
        },
    },
    {
        id: 'about-mission',
        type: 'AboutMission',
        enabled: true,
        props: {
            eyebrow: 'Nuestro proposito',
            title: 'La mision',
            paragraphs: [
                'Creemos que una buena marca se construye con consistencia, claridad y una experiencia simple para cada cliente.',
                'Acompanamos a negocios de distintos rubros con catalogos flexibles, una presentacion cuidada y una tienda facil de gestionar.',
            ],
            highlights: [
                { icon: 'verified', title: 'Calidad constante', text: 'Procesos ordenados y foco en cada detalle.' },
                { icon: 'eco', title: 'Mejora continua', text: 'Ajustes practicos para vender mejor.' },
            ],
            image:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDaDIcmwXvGopChH4z2NtypzPKEOIJB5DIz-cix6aLVUAg6015AqowjMQbKKJ273hv-K-Mdeeq78GFd-8Wt2hah0kOFgDkEGW24otJ-Yqrdn019S_zxUM4qMhyJ0sXG12Fr-Nk9EA4ZnVoQXzs0ZTjGJtuHBj_cdqJ4Z-i7TOx-wRo3JuBOyDsruX5utjj00tVbmE0sUIiRoPxHOH4_ohJ25dVPm0jFLFwKMx0fn7DC6IGRbByTaUUBATc5XDKzCDFZBcDdlv3kpB4',
            imageAlt: 'Equipo trabajando en una propuesta de marca',
            styles: {
                accentColor: '#f27f0d',
                backgroundColor: '#ffffff',
                textColor: '#181411',
                mutedColor: '#6b7280',
            },
        },
    },
    {
        id: 'about-stats',
        type: 'AboutStats',
        enabled: true,
        props: {
            items: [
                { value: '10+', label: 'Anos de experiencia', accent: true },
                { value: '5k+', label: 'Clientes satisfechos' },
                { value: '2', label: 'Canales activos' },
                { value: '24/7', label: 'Soporte al cliente' },
            ],
            styles: {
                backgroundColor: '#181411',
                accentColor: '#f27f0d',
                textColor: '#ffffff',
                mutedColor: '#9ca3af',
            },
        },
    },
    {
        id: 'about-values',
        type: 'AboutValues',
        enabled: true,
        props: {
            title: 'Nuestros valores',
            items: [
                {
                    icon: 'quality',
                    title: 'Calidad',
                    description: 'Cuidamos la presentacion, la experiencia y la consistencia en cada punto de contacto.',
                },
                {
                    icon: 'commitment',
                    title: 'Compromiso',
                    description: 'Acompanamos cada proyecto con soporte real, claro y cercano.',
                },
                {
                    icon: 'innovation',
                    title: 'Innovacion',
                    description: 'Probamos nuevas ideas para mejorar la tienda y la forma de vender.',
                },
            ],
            styles: {
                backgroundColor: '#f8f7f5',
                cardBackground: '#ffffff',
                accentColor: '#f27f0d',
                textColor: '#181411',
                mutedColor: '#6b7280',
            },
        },
    },
    {
        id: 'about-team',
        type: 'AboutTeam',
        enabled: true,
        props: {
            anchor: 'equipo',
            title: 'Ideas claras y ejecucion consistente.',
            quote:
                'Nuestro trabajo no es solo vender productos: es ayudar a que cada marca se presente mejor, ordene su oferta y conecte con sus clientes.',
            author: 'Alex Morgan',
            role: 'Fundador y direccion general',
            avatarImage:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuAea9Hk8KW-uNz2oCLHAOeVLaF4OEuHrLoMYAQ5icf0UpW2MbWEoppeOoK7-_ef46vSPLm9bOZn19yxGPkKgbqwzNxdl8pCXwjX84M0rsOM-14FdHnwu8rzaIZR1UJSvo2LVbbFvgWP_nntPKbU-nmwnPjWuzy9XiXqlmi62Yw8p6R5XWHQoEjxiw4mfhRuljOaKyPWkvPFELxYq8TKyXzDzeOlvj5ntTgVpCWOshfxNK3WLIQvRk7FstFclk10_lOYekLKXyXKEYA',
            backgroundImage:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDd5sRN9c3Iyg5tub-t6DownNaquR6DBO7x9kWyTXKAhtTfCcSMSUTP3XZGAiL1-Mj-9MbM-m0jm0ijRI13F0_dNFIyToqwNriV9r4akyx6ZAWADgUH407R7Tas-tfzDuwHbfz29pugtdtM3dlMJNOiv20x3Gv8czAs6T9Sq2RN7e0tDp-X78LAcNw4Fz02UVghwohyhXjshm1zUxjj620L3W_ET5Q_zILEvX-EgPT6IDycP7lycSMQhu25nTE1qZeNJUjPddDvAg0',
            styles: {
                backgroundColor: '#ffffff',
                overlayColor: '#000000',
                overlayOpacity: 0.25,
                textColor: '#181411',
            },
        },
    },
    {
        id: 'about-cta',
        type: 'AboutCTA',
        enabled: true,
        props: {
            title: 'Listo para llevar tu marca al siguiente nivel?',
            primaryLink: { label: 'Ver productos', link: '/catalog' },
            secondaryLink: { label: 'Contactar ventas', link: '/#contacto' },
            styles: {
                backgroundColor: '#ffffff',
                accentColor: '#f27f0d',
                textColor: '#181411',
                mutedColor: '#6b7280',
            },
        },
    },
];
