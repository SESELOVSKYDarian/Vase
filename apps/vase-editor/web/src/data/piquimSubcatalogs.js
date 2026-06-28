const CARD_VARIANTS = [
    {
        badge: 'MAS VENDIDO',
        category: 'ESTABILIZANTES',
        name: 'Neutro Cream (para crema)',
        subtype: 'Neutro artesanal',
        price: '$ 8.450',
        mediaKind: 'icon',
        icon: 'ice',
        mediaGradient: 'linear-gradient(135deg, rgba(107, 184, 224, 0.18) 0%, rgba(107, 184, 224, 0.42) 100%)',
        coldAccent: '#1A1614',
        favoriteOffset: 222,
    },
    {
        category: 'PULPAS FRUTALES',
        name: 'Frutilla',
        subtype: 'Para decoracion o rellenos',
        price: '$ 12.900',
        mediaKind: 'image',
        imageSrc: '/piquim/carta/image-2.png',
        mediaGradient: 'linear-gradient(135deg, rgba(224, 81, 138, 0.18) 0%, rgba(224, 81, 138, 0.42) 100%)',
        coldAccent: '#4BEAFF',
        favoriteOffset: 227,
    },
    {
        badge: 'PROMO -15%',
        badgeDark: true,
        category: 'VARIEGATTOS',
        name: 'Nutticrock',
        subtype: 'Avellana, cacao y grana crocante de avellana',
        price: '$ 6.800',
        mediaKind: 'icon',
        icon: 'ice',
        mediaGradient: 'linear-gradient(135deg, rgba(107, 184, 224, 0.18) 0%, rgba(107, 184, 224, 0.42) 100%)',
        coldAccent: '#61EDFF',
        favoriteOffset: 227,
    },
    {
        category: 'PASTAS OLEOSAS Y FRUTALES',
        name: 'Vainilla',
        subtype: 'Pasta de Vainilla',
        price: '$ 5.300',
        mediaKind: 'image',
        imageSrc: '/piquim/carta/image-3.png',
        mediaGradient: 'linear-gradient(135deg, rgba(224, 81, 138, 0.18) 0%, rgba(224, 81, 138, 0.42) 100%)',
        coldAccent: '#4BEAFF',
        favoriteOffset: 227,
    },
];

const PANADERIA_VARIANTS = [
    {
        category: 'PREMEZCLAS',
        name: 'Premezcla Pan Suave',
        subtype: 'Panaderia profesional',
        price: '$ 7.900',
        mediaKind: 'icon',
        icon: 'bread',
        mediaGradient: 'linear-gradient(135deg, rgba(212, 162, 74, 0.18) 0%, rgba(212, 162, 74, 0.42) 100%)',
        coldAccent: '#D4A24A',
        badge: 'MAS VENDIDO',
        favoriteOffset: 222,
    },
    {
        category: 'RELLENOS',
        name: 'Membrillo',
        subtype: 'Para facturas y medialunas',
        price: '$ 12.900',
        mediaKind: 'image',
        imageSrc: '/piquim/carta/image-2.png',
        mediaGradient: 'linear-gradient(135deg, rgba(212, 162, 74, 0.14) 0%, rgba(212, 162, 74, 0.34) 100%)',
        coldAccent: '#4BEAFF',
        favoriteOffset: 227,
    },
    {
        category: 'MEJORADORES',
        name: 'Mejorador Integral',
        subtype: 'Volumen y textura',
        price: '$ 7.820',
        mediaKind: 'icon',
        icon: 'bread',
        mediaGradient: 'linear-gradient(135deg, rgba(212, 162, 74, 0.18) 0%, rgba(212, 162, 74, 0.42) 100%)',
        coldAccent: '#D4A24A',
        badge: 'PROMO -15%',
        badgeDark: true,
        favoriteOffset: 227,
    },
    {
        category: 'SABORES',
        name: 'Vainilla',
        subtype: 'Pasta de Vainilla',
        price: '$ 5.300',
        mediaKind: 'image',
        imageSrc: '/piquim/carta/image-3.png',
        mediaGradient: 'linear-gradient(135deg, rgba(212, 162, 74, 0.14) 0%, rgba(212, 162, 74, 0.34) 100%)',
        coldAccent: '#4BEAFF',
        favoriteOffset: 227,
    },
];

const CONFITERIA_VARIANTS = [
    {
        category: 'CREMAS',
        name: 'Crema Pastelera Premium',
        subtype: 'Base repostera',
        price: '$ 8.250',
        mediaKind: 'icon',
        icon: 'cake',
        mediaGradient: 'linear-gradient(135deg, rgba(224, 81, 138, 0.18) 0%, rgba(224, 81, 138, 0.42) 100%)',
        coldAccent: '#E0518A',
        badge: 'MAS VENDIDO',
        favoriteOffset: 222,
    },
    {
        category: 'RELLENOS',
        name: 'Frutilla',
        subtype: 'Para decoracion o rellenos',
        price: '$ 12.900',
        mediaKind: 'image',
        imageSrc: '/piquim/carta/image-2.png',
        mediaGradient: 'linear-gradient(135deg, rgba(224, 81, 138, 0.18) 0%, rgba(224, 81, 138, 0.42) 100%)',
        coldAccent: '#4BEAFF',
        favoriteOffset: 227,
    },
    {
        category: 'MOUSSES',
        name: 'Mousse Chocolate Intenso',
        subtype: 'Confiteria profesional',
        price: '$ 7.980',
        mediaKind: 'icon',
        icon: 'cake',
        mediaGradient: 'linear-gradient(135deg, rgba(224, 81, 138, 0.18) 0%, rgba(224, 81, 138, 0.42) 100%)',
        coldAccent: '#E0518A',
        badge: 'PROMO -15%',
        badgeDark: true,
        favoriteOffset: 227,
    },
    {
        category: 'COBERTURAS',
        name: 'Vainilla',
        subtype: 'Pasta de Vainilla',
        price: '$ 5.300',
        mediaKind: 'image',
        imageSrc: '/piquim/carta/image-3.png',
        mediaGradient: 'linear-gradient(135deg, rgba(224, 81, 138, 0.18) 0%, rgba(224, 81, 138, 0.42) 100%)',
        coldAccent: '#4BEAFF',
        favoriteOffset: 227,
    },
];

const HELADERIA_PRODUCT_GROUPS = [
    {
        title: 'Estabilizantes',
        keywords: ['estabilizante', 'estabilizantes'],
        categories: [
            {
                title: 'Neutros artesanales',
                keywords: [
                    'neutro artesanal',
                    'neutros artesanales',
                    'neutro cream',
                    'neutro fruit',
                    'neutro pr 15',
                    'base neutra',
                    'base neutra 50',
                    'base pr',
                    'base pr 50',
                    'base mousse helado neutro',
                    'base granita neutra',
                ],
            },
            {
                title: 'Bases en polvo',
                keywords: [
                    'bases en polvo',
                    'base en polvo',
                    'choco forte',
                    'choco clasico',
                    'choco clasico',
                    'choco amargo',
                    'choco pronto',
                    'chantilly pr',
                    'vainilla pr',
                    'chocolate soft',
                    'chantilly soft',
                    'dulce de leche soft',
                    'choco mousse',
                    'sambayon',
                    'mousse limon',
                ],
            },
            {
                title: 'Est. Especificos',
                keywords: [
                    'est especificos',
                    'est. especificos',
                    'estabilizantes especificos',
                    'especificos',
                    'almendrado',
                    'crema rusa',
                    'chantilly v',
                ],
            },
        ],
    },
    {
        title: 'Aditivos',
        keywords: ['aditivo', 'aditivos'],
        categories: [
            {
                title: 'Agente batido',
                keywords: ['agente batido', 'piquim cream', 'cream alt'],
            },
            {
                title: 'Pronto Mix',
                keywords: ['pronto mix', 'pronto miele', 'pronto mix textura', 'pronto mix dry'],
            },
        ],
    },
    {
        title: 'Sabor & Color en Polvo',
        keywords: ['sabor color polvo', 'sabor & color en polvo', 'sabor y color en polvo', 'color en polvo'],
        categories: [
            {
                title: 'Sabor & Color en Polvo',
                keywords: ['sabor color polvo', 'sabor & color en polvo', 'sabor y color en polvo', 'almendrado', 'frutilla', 'vainilla', 'banana'],
            },
        ],
        flavors: [
            { name: 'Almendrado', color: '#D89A5D' },
            { name: 'Anana', color: '#FFF0A3' },
            { name: 'Chantilly / Chantilly V', color: '#FFFFFF' },
            { name: 'Durazno', color: '#F47C4D' },
            { name: 'Frutilla', color: '#E50922' },
            { name: 'Limon', color: '#F4E300' },
            { name: 'Mandarina', color: '#F5821F' },
            { name: 'Mascarpone', color: '#F25F66' },
            { name: 'Menta', color: '#76BD22' },
            { name: 'Naranja', color: '#FF8500' },
            { name: 'Vainilla', color: '#E8C47F' },
            { name: 'Banana', color: '#FFD400' },
            { name: 'Manzana', color: '#B9D9A7' },
            { name: 'Uva', color: '#5D3F9B' },
            { name: 'Chocolate amargo', color: '#4A2A14' },
            { name: 'Yogurth', color: '#ECECEC' },
        ],
    },
    {
        title: 'Pastas Oleosas y Frutales',
        keywords: ['pastas oleosas', 'pastas frutales', 'pasta oleosa', 'pasta frutal'],
        categories: [
            {
                title: 'Pastas Oleosas y Frutales',
                keywords: ['pastas oleosas', 'pastas frutales', 'mascarpone', 'crema del cielo', 'frutilla', 'marroc'],
            },
            {
                title: 'Pastas puras',
                keywords: ['pastas puras', 'pistacho tostado', 'avellana tostada', 'nuez', 'almendra'],
            },
        ],
        flavors: [
            { name: 'Mascarpone', color: '#F05B63' },
            { name: 'Vainilla', color: '#D8B16A' },
            { name: 'Americana', color: '#F7F2E8' },
            { name: 'Menta', color: '#A6D19C' },
            { name: 'Crema del Cielo', color: '#62C7DD' },
            { name: 'Frutilla', color: '#E50922' },
            { name: 'Limon', color: '#F4E300' },
            { name: 'Pasta Sablee', color: '#F0DAA6' },
            { name: 'Cereza', color: '#E85E4B' },
            { name: 'Frambuesa', color: '#E51F37' },
            { name: 'Coco', color: '#EFEFE7' },
            { name: 'Licor Irlandes', color: '#8B7F6D' },
            { name: 'Marroc', color: '#9A642F' },
            { name: 'Bon Bon', color: '#C9A46A' },
            { name: 'Nutt', color: '#6C3919' },
            { name: 'Nuttti Choc', color: '#4A2A14' },
            { name: 'Tiramisu', color: '#C99B72' },
            { name: 'Lotus', color: '#D29A61' },
            { name: 'Bueno Quim', color: '#B75B2A' },
            { name: 'Pistacho Tostado', color: '#A69B18' },
            { name: 'Avellana Tostada', color: '#8A451E' },
            { name: 'Nuez', color: '#D98C55' },
            { name: 'Almendra', color: '#C28A63' },
        ],
    },
];

const PANADERIA_PRODUCT_GROUPS = [
    {
        title: 'Premezclas',
        keywords: ['premezcla', 'premezclas', 'premix'],
        categories: [
            { title: 'Pan Lactal / Integral', keywords: ['pan lactal', 'pan integral', 'lactal integral'] },
            { title: 'Pan Multisemillas', keywords: ['pan multisemillas', 'multisemillas'] },
            { title: 'Chipa', keywords: ['chipa'] },
            { title: 'Pan de Viena', keywords: ['pan de viena', 'viena'] },
            { title: 'Ciabatta', keywords: ['ciabatta'] },
            { title: 'Panini', keywords: ['panini'] },
            { title: 'Medialuna Marplatense', keywords: ['medialuna marplatense', 'medialuna'] },
            { title: 'Donas y Berlinesas', keywords: ['donas', 'berlinesas', 'dona', 'berlinesa'] },
            { title: 'Budin Vainilla / Chocolate', keywords: ['budin vainilla', 'budin chocolate', 'budin vainilla chocolate'] },
            { title: 'Budin Integral', keywords: ['budin integral'] },
            { title: 'Torta Vainilla / Chocolate', keywords: ['torta vainilla', 'torta chocolate', 'torta vainilla chocolate'] },
            { title: 'Brownie', keywords: ['brownie'] },
            { title: 'Pan Dulce y Rosca', keywords: ['pan dulce', 'rosca'] },
            { title: 'Crema Pastelera', keywords: ['crema pastelera'] },
            { title: 'Merengue', keywords: ['merengue'] },
            { title: 'Mousse de Chocolate', keywords: ['mousse de chocolate', 'mousse chocolate'] },
        ],
    },
    {
        title: 'Dulces de Leche',
        keywords: ['dulce de leche', 'dulces de leche', 'ddl'],
        categories: [
            { title: 'Dulces de Leche', keywords: ['dulce de leche', 'dulces de leche', 'ddl'] },
        ],
    },
    {
        title: 'Aditivos & Mejoradores',
        keywords: ['aditivos', 'mejoradores', 'aditivos mejoradores', 'aditivos & mejoradores'],
        categories: [
            { title: 'Aditivos', keywords: ['aditivo', 'aditivos'] },
            { title: 'Mejoradores', keywords: ['mejorador', 'mejoradores'] },
        ],
    },
    {
        title: 'Confiteria',
        keywords: ['confiteria', 'reposteria', 'pasteleria'],
        categories: [
            { title: 'Cremas', keywords: ['crema', 'cremas', 'crema pastelera'] },
            { title: 'Mousses', keywords: ['mousse', 'mousses'] },
            { title: 'Dulce de leche', keywords: ['dulce de leche', 'ddl'] },
            { title: 'Brownie', keywords: ['brownie'] },
            { title: 'Coberturas', keywords: ['cobertura', 'coberturas'] },
        ],
    },
];

function makeProducts(prefix, variants, count = 6) {
    return Array.from({ length: count }, (_, index) => {
        const variant = variants[index % variants.length];
        return {
            id: `piquim-${prefix}-${variant.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
            ...variant,
        };
    });
}

export function getAllPiquimSubcatalogProducts() {
    const products = [];
    Object.values(PIQUIM_SUBCATALOGS).forEach((catalog) => {
        catalog.sections.forEach((section) => {
            section.products.forEach((product) => {
                if (!products.some((item) => item.id === product.id)) {
                    products.push({
                        ...product,
                        section: section.title,
                        catalogSlug: catalog.slug,
                        catalogTitle: catalog.headingAccent,
                    });
                }
            });
        });
    });
    return products;
}

export function findPiquimProductById(id) {
    return getAllPiquimSubcatalogProducts().find((product) => product.id === id) || null;
}

export function getRelatedPiquimProducts(id, limit = 4) {
    return getAllPiquimSubcatalogProducts()
        .filter((product) => product.id !== id)
        .slice(0, limit);
}

export const PIQUIM_SUBCATALOGS = {
    heladeria: {
        slug: 'heladeria',
        headingBase: 'Productos',
        headingAccent: 'de heladeria',
        accent: '#6BB8E0',
        mediaGradient: 'linear-gradient(135deg, rgba(107, 184, 224, 0.18) 0%, rgba(107, 184, 224, 0.42) 100%)',
        icon: 'ice',
        filters: {
            title: 'Filtros',
            subtitle: 'Refina tu busqueda\nprofesional',
            searchPlaceholder: 'Producto...',
            groups: [
                {
                    title: 'Tipo de Producto',
                    items: ['Estabilizantes', 'Aditivos', 'Sabor & Color en Polvo', 'Pastas Oleosas y Frutales'],
                },
                {
                    title: 'Categoria',
                    items: ['Neutros artesanales', 'Bases en polvo', 'Est. Especificos', 'Agente batido', 'Pronto Mix', 'Sabor & Color en Polvo', 'Pastas Oleosas y Frutales', 'Pastas puras'],
                },
            ],
        },
        productGroups: HELADERIA_PRODUCT_GROUPS,
        sections: [
            {
                title: 'Estabilizantes',
                products: makeProducts('heladeria-estabilizantes', CARD_VARIANTS),
            },
            {
                title: 'Aditivos',
                products: makeProducts('heladeria-aditivos', CARD_VARIANTS),
            },
        ],
    },
    panaderia: {
        slug: 'panaderia',
        headingBase: 'Productos',
        headingAccent: 'de panaderia y confiteria',
        accent: '#D4A24A',
        mediaGradient: 'linear-gradient(135deg, rgba(212, 162, 74, 0.18) 0%, rgba(212, 162, 74, 0.42) 100%)',
        icon: 'bread',
        filters: {
            title: 'Filtros',
            subtitle: 'Refina tu busqueda\nprofesional',
            searchPlaceholder: 'Producto...',
            groups: [
                {
                    title: 'Tipo de Producto',
                    items: ['Premezclas', 'Dulces de Leche', 'Aditivos & Mejoradores', 'Confiteria'],
                },
                {
                    title: 'Categoria',
                    items: [
                        'Pan Lactal / Integral',
                        'Pan Multisemillas',
                        'Chipa',
                        'Pan de Viena',
                        'Ciabatta',
                        'Panini',
                        'Medialuna Marplatense',
                        'Donas y Berlinesas',
                        'Budin Vainilla / Chocolate',
                        'Budin Integral',
                        'Torta Vainilla / Chocolate',
                        'Brownie',
                        'Pan Dulce y Rosca',
                        'Crema Pastelera',
                        'Merengue',
                        'Mousse de Chocolate',
                        'Dulces de Leche',
                        'Aditivos',
                        'Mejoradores',
                        'Cremas',
                        'Mousses',
                        'Dulce de leche',
                        'Coberturas',
                    ],
                },
            ],
        },
        productGroups: PANADERIA_PRODUCT_GROUPS,
        sections: [
            {
                title: 'Premezclas',
                products: makeProducts('panaderia-premezclas', PANADERIA_VARIANTS),
            },
            {
                title: 'Mejoradores',
                products: makeProducts('panaderia-mejoradores', PANADERIA_VARIANTS),
            },
            {
                title: 'Cremas',
                products: makeProducts('panaderia-confiteria-cremas', CONFITERIA_VARIANTS),
            },
            {
                title: 'Mousses',
                products: makeProducts('panaderia-confiteria-mousses', CONFITERIA_VARIANTS),
            },
        ],
    },
};
