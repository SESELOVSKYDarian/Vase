// Parte de defaultSections.js: cloneValue, isPlainObject, deepMerge, DEFAULT_HOME_SECTIONS.
import { getDefaultBrandMarqueeProps } from '../brandMarqueeDefaults';

export const cloneValue = (value) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
};

export const isPlainObject = (value) =>
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value);

export const deepMerge = (baseValue, overrideValue) => {
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
