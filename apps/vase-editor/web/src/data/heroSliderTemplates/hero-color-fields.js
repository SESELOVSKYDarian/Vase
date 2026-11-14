// Parte de heroSliderTemplates.js: HERO_VARIANT_OPTIONS, HERO_COLOR_FIELDS, FASHION_DEFAULT_SLIDES, HOME_DECOR_DEFAULT_SLIDES, SANITARIOS_INDUSTRIAL_DEFAULT_SLIDES, MODERNIST_DEFAULT_SLIDES y más.

export const HERO_VARIANT_OPTIONS = [
    { value: 'classic', label: 'Clasico' },
    { value: 'modernist', label: 'Moderno Premium' },
    { value: 'modernist_centered', label: 'Moderno Centrado' },
    { value: 'modern_boutique', label: 'Boutique Moderno' },
    { value: 'fashion', label: 'Moda Minimal' },
    { value: 'home_decor', label: 'Decoracion Hogar' },
    { value: 'sanitarios_industrial', label: 'Industrial Vitrina' },
    { value: 'corporate', label: 'Corporativo Limpio' },
];

export const HERO_COLOR_FIELDS = {
    modernist: [
        { key: 'titleColor', label: 'Titulos' },
        { key: 'textColor', label: 'Texto descriptivo' },
        { key: 'labelColor', label: 'Etiqueta superior' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
        { key: 'overlayColor', label: 'Overlay (gradiente)' },
    ],
    fashion: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'titleColor', label: 'Titulos' },
        { key: 'textColor', label: 'Texto' },
        { key: 'labelColor', label: 'Etiqueta' },
        { key: 'accentColor', label: 'Acento' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
    ],
    home_decor: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'titleColor', label: 'Titulos' },
        { key: 'textColor', label: 'Texto' },
        { key: 'labelColor', label: 'Etiqueta' },
        { key: 'accentColor', label: 'Acento' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
    ],
    sanitarios_industrial: [
        { key: 'backgroundColor', label: 'Fondo blueprint' },
        { key: 'gridLineColor', label: 'Lineas grid' },
        { key: 'leftPanelColor', label: 'Panel diagonal' },
        { key: 'titleColor', label: 'Titulos' },
        { key: 'labelColor', label: 'Etiqueta' },
        { key: 'cardBgColor', label: 'Card vidrio (fondo)' },
        { key: 'cardBorderColor', label: 'Card vidrio (borde)' },
        { key: 'cardTitleColor', label: 'Card titulo' },
        { key: 'cardSubtitleColor', label: 'Card subtitulo' },
        { key: 'textColor', label: 'Card texto' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
        { key: 'specColor', label: 'Especificacion superior' },
        { key: 'dotActiveColor', label: 'Dot activo' },
        { key: 'dotInactiveColor', label: 'Dot inactivo' },
    ],
    modern_boutique: [
        { key: 'titleColor', label: 'Titulos' },
        { key: 'textColor', label: 'Texto descriptivo' },
        { key: 'labelBgColor', label: 'Fondo etiqueta (Badge)' },
        { key: 'labelTextColor', label: 'Texto etiqueta (Badge)' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
        { key: 'accentBgColor', label: 'Pill de oferta (fondo)' },
        { key: 'accentTextColor', label: 'Pill de oferta (texto)' },
        { key: 'overlayColor', label: 'Capa de oscuridad (Overlay)' },
    ],
    modernist_centered: [
        { key: 'titleColor', label: 'Titulos' },
        { key: 'textColor', label: 'Texto descriptivo' },
        { key: 'labelColor', label: 'Etiqueta superior' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
        { key: 'overlayColor', label: 'Overlay (gradiente)' },
    ],
    classic: [
        { key: 'titleHexColor', label: 'Titulo' },
        { key: 'subtitleHexColor', label: 'Subtitulo' },
        { key: 'overlayColor', label: 'Overlay del fondo' },
        { key: 'tagTextColor', label: 'Etiqueta (texto)' },
        { key: 'tagBgColor', label: 'Etiqueta (fondo)' },
        { key: 'tagBorderColor', label: 'Etiqueta (borde)' },
        { key: 'primaryButtonBgColor', label: 'Boton primario (fondo)' },
        { key: 'primaryButtonTextColor', label: 'Boton primario (texto)' },
        { key: 'secondaryButtonBgColor', label: 'Boton secundario (fondo)' },
        { key: 'secondaryButtonTextColor', label: 'Boton secundario (texto)' },
        { key: 'secondaryButtonBorderColor', label: 'Boton secundario (borde)' },
    ],
    corporate: [
        { key: 'titleColor', label: 'Titulos' },
        { key: 'textColor', label: 'Texto descriptivo' },
        { key: 'labelColor', label: 'Etiqueta superior' },
    ],
};

export const FASHION_DEFAULT_SLIDES = [
    {
        label: 'Disponible ahora',
        title: 'Coleccion Minimalista',
        subtitle: 'Nueva temporada',
        description: 'Diseno sobrio y materiales premium para destacar cada ambiente.',
        featured: 'Producto destacado',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCEP3rkEsdrZYUu5E5Gm0UsbfEeygONnqMt5DbDwg_0YaOauB2Bhr5sYDe87Jlc28eFAMWSHp1_QR6mIDVmDGBkNOB-Z_i60M0RDGRig6r9cg8O-63_q4fKm_bt4Z7U7VnkdPBBscIkUnT8DwkPCH73Nxz-olpjyveC_vMAX2t2i0uwJ1jSdGw5qdIBlry0GSZ_v4Kyho_iC-c038tLVz7uw2zTn-zFuIgVqO8v-vJRB9yKqJQkuFZqLcsTfAKZFedY0LGqOMfmB9g',
        primaryButtonLabel: 'Comprar ahora',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: '',
        secondaryButtonLink: '',
    },
    {
        label: 'Lanzamiento',
        title: 'Look Urbano',
        subtitle: 'Edicion limitada',
        description: 'Piezas seleccionadas para una presentacion elegante y moderna.',
        featured: 'Coleccion premium',
        image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=900&q=80&auto=format&fit=crop',
        primaryButtonLabel: 'Ver catalogo',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: '',
        secondaryButtonLink: '',
    },
];

export const HOME_DECOR_DEFAULT_SLIDES = [
    {
        label: 'Nueva temporada',
        title: 'Confort y estilo',
        subtitle: '',
        description: 'Descubri muebles y accesorios para transformar tus espacios.',
        featured: '',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCVhvkYBdnOleG-Z-XnXwCSL6_l6oepFXgffpD5_uB8OujfUbm1XfEPH6pcjis5D6WDJfzQwQg6rUkq1Dj-_3fi51AMaY-luZCbHLPzWWzUsZZ1Nn8OurbMfYfUB2h5QytLEcXWMTWSXsPjXUYCOouHe9ok_RfWcVdDg-bIOypIq7Engm4Gi5ya_eZrIwi013yjjNHNGZPlsDZUzYwVkXtNJZcYuukpk4tQnQA7Rrvj4jEOIkRzjs7bsnpbDpRovQYmhDjr-TyaCik',
        primaryButtonLabel: 'Ver coleccion',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: 'Explorar mas',
        secondaryButtonLink: '/catalog',
    },
    {
        label: 'Seleccion especial',
        title: 'Inspiracion natural',
        subtitle: '',
        description: 'Texturas organicas y diseno moderno para cada rincon de tu hogar.',
        featured: '',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80&auto=format&fit=crop',
        primaryButtonLabel: 'Comprar ahora',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: 'Ver destacados',
        secondaryButtonLink: '/catalog',
    },
];

export const SANITARIOS_INDUSTRIAL_DEFAULT_SLIDES = [
    {
        label: 'Industrial Series',
        title: 'PRODUCTO',
        subtitle: 'DESTACADO',
        description: 'Presencia visual fuerte y detalles tecnicos para lanzamientos de alto impacto.',
        featured: 'Marca principal',
        cardEyebrow: 'Edicion especial',
        cardTitle: 'Nombre de marca',
        specLabel: 'Spec: Model_01 // 2026',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCtrx3pTyYlPgB-m5Qu8uUwctQeJRkUAX5nF4uBy2EZwom64tlIa_jjJvKQZoFhDcseM0gZGo98GRYEGNf2hmNgD_EbPbEoOxG5vWrWAiXYIIWF2p48XGa626y2T8Xfxt5AK9C4upAWDExfCK11CrcPsFqDSnlQ5hTkj0bxFygNWYkKXfJXjpiX4QTnbkzXxUTP1V14BbbMtMm6kle200TQd25KHbu1zdec36SSAutjvA0O9VIiku54n_VWSvD0qL0kXDAiOZKDahg',
        primaryButtonLabel: 'VER MAS',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: '',
        secondaryButtonLink: '',
    },
];

export const MODERNIST_DEFAULT_SLIDES = [
    {
        label: 'New Arrival',
        title: 'The Obsidian \n Lounge',
        subtitle: '$2,850.00',
        description: 'An icon of adaptive modernism, blending ergonomic precision with sustainable oak and hand-stitched premium wool.',
        featured: 'Free Worldwide Shipping',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmLfVe_lRk70frWnyjcp30xQQruP2IXrHkvjTh6l5A1S7Pf3mpsjgKxTLbsQSJfWiViyJwin5tCwOO8XLKzx3YfZXxjV8jarEarpXObaPjQkWmu4qO1N3lnR9j01QgsqD-t8kMJFLKfLdE8PnFq1mmt1diUhftANAPCU-RRmbnLgAXUthQBkX30C0je5TdnvQ-qruxKna254Y7ZjBdpvz3GXHoHCu8VafVSi5-A4nnagOiSnyhCVGPYHkKdgDmYkguWAIqFaHIu6j6',
        primaryButtonLabel: 'Buy Now',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: 'Discover More',
        secondaryButtonLink: '/catalog'
    }
];

export const MODERNIST_CENTERED_DEFAULT_SLIDES = [
    {
        label: 'PREMIUM EXPERIENCE',
        title: 'Elevate Your \n Vision',
        subtitle: '',
        description: 'Precision-engineered solutions for the modern landscape. We blend architectural rigor with creative fluidity to define the future of premium aesthetics.',
        featured: '',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDawx2tUlvekFWrw8NIoVqwfipXyZA33w2tqo_4TcgFmuSSvynkQpzrq1GW4l69k0VayTrLDm5ucsUCazZy2fO0b51aU5k3Wj8oSVcsM0NjhafOs25VXm0SOr22-g8AWXBxRDkXGSvw-1GBcJtBOhTuMqZTr2pbMNGnTFUTZnlX3I7DHXrcaFxlc-u6r2u6jJuMmeEWET1uDRIbIAGDNXKTAKXqNgJnh34CscsbnXTotISwhCyU9ZdEHWTfwZLn0KuJev9ZOgx9XLtl',
        primaryButtonLabel: 'Explore Portfolio',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: 'Our Process',
        secondaryButtonLink: '/catalog'
    }
];

export const CORPORATE_DEFAULT_SLIDES = [{ label: 'Corporate', title: 'Elevate Business', subtitle: 'Enterprise solutions', description: 'Enterprise gear', featured: '', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069', primaryButtonLabel: 'Contact Us', primaryButtonLink: '/catalog', secondaryButtonLabel: '', secondaryButtonLink: '' }];

export const BOUTIQUE_DEFAULT_SLIDES = [{
    label: 'EXCLUSIVE SALE',
    title: 'Winter \n Collection',
    subtitle: '30% OFF',
    description: 'Experience the fusion of architectural precision and wearable art. Designed for those who demand quiet excellence.',
    featured: '',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcciZH4gbXwBFVWmVGrhoKehFFOg-0D2O5GgS6DHuFs8q-WQGocQDz21shk9cnmvesxEmaPkgWpfJAnJi32HcXttBrd13i33S9TbSg2QUhHl_3XIDL1r5HJnrUtuKWOpbrZAZBuRRu6fd5KE5zF2YFXCGVyQD-TE3FQZBEMG6KgSL5pk60hlnC_RWc0T1ERlHE3PPO8v1oZqCr7RvAejZct6GWaVVh-d6djpl-bA8F7U0KBtNoVFTZ_q2Kfey5DxXattxuy5HoKwEJ',
    primaryButtonLabel: 'Shop Now',
    primaryButtonLink: '/catalog',
    secondaryButtonLabel: 'View Collections',
    secondaryButtonLink: '/catalog'
}];

export const SLIDE_DEFAULTS_BY_VARIANT = {
    modernist: MODERNIST_DEFAULT_SLIDES,
    modernist_centered: MODERNIST_CENTERED_DEFAULT_SLIDES,
    modern_boutique: BOUTIQUE_DEFAULT_SLIDES,
    fashion: FASHION_DEFAULT_SLIDES,
    home_decor: HOME_DECOR_DEFAULT_SLIDES,
    sanitarios_industrial: SANITARIOS_INDUSTRIAL_DEFAULT_SLIDES,
    corporate: CORPORATE_DEFAULT_SLIDES,
};
