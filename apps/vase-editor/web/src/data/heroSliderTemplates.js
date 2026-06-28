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

const FASHION_DEFAULT_SLIDES = [
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

const HOME_DECOR_DEFAULT_SLIDES = [
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

const SANITARIOS_INDUSTRIAL_DEFAULT_SLIDES = [
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

const MODERNIST_DEFAULT_SLIDES = [
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

const MODERNIST_CENTERED_DEFAULT_SLIDES = [
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

const CORPORATE_DEFAULT_SLIDES = [{ label: 'Corporate', title: 'Elevate Business', subtitle: 'Enterprise solutions', description: 'Enterprise gear', featured: '', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069', primaryButtonLabel: 'Contact Us', primaryButtonLink: '/catalog', secondaryButtonLabel: '', secondaryButtonLink: '' }];

const BOUTIQUE_DEFAULT_SLIDES = [{
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

const SLIDE_DEFAULTS_BY_VARIANT = {
    modernist: MODERNIST_DEFAULT_SLIDES,
    modernist_centered: MODERNIST_CENTERED_DEFAULT_SLIDES,
    modern_boutique: BOUTIQUE_DEFAULT_SLIDES,
    fashion: FASHION_DEFAULT_SLIDES,
    home_decor: HOME_DECOR_DEFAULT_SLIDES,
    sanitarios_industrial: SANITARIOS_INDUSTRIAL_DEFAULT_SLIDES,
    corporate: CORPORATE_DEFAULT_SLIDES,
};

const STYLE_DEFAULTS_BY_VARIANT = {
    classic: {
        titleHexColor: '#ffffff',
        subtitleHexColor: '#f4f4f5',
        overlayColor: '#000000',
        tagTextColor: '#ea580c',
        tagBgColor: 'rgba(234, 88, 12, 0.2)',
        tagBorderColor: 'transparent',
        primaryButtonBgColor: '#ea580c',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: 'transparent',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: '#ffffff',
    },
    modernist: {
        titleColor: '#000000',
        textColor: '#444748',
        labelColor: '#1c1b1b',
        primaryButtonBgColor: '#000000',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: 'transparent',
        secondaryButtonTextColor: '#000000',
        secondaryButtonBorderColor: '#000000',
        overlayColor: 'rgba(0,0,0,0.2)',
    },
    modernist_centered: {
        titleColor: '#ffffff',
        textColor: '#d4d4d8',
        labelColor: '#ffffff',
        primaryButtonBgColor: '#ffffff',
        primaryButtonTextColor: '#000000',
        secondaryButtonBgColor: 'transparent',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: 'rgba(255, 255, 255, 0.3)',
        overlayColor: '#000000',
    },
    fashion: {
        backgroundColor: '#f5f3f0',
        titleColor: '#111111',
        textColor: '#52525b',
        labelColor: '#52525b',
        accentColor: '#111111',
        primaryButtonBgColor: '#111111',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: '#ffffff',
        secondaryButtonTextColor: '#111111',
        secondaryButtonBorderColor: '#111111',
    },
    home_decor: {
        backgroundColor: '#ffffff',
        titleColor: '#0f172a',
        textColor: '#475569',
        labelColor: '#135bec',
        accentColor: '#135bec',
        primaryButtonBgColor: '#135bec',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: '#ffffff',
        secondaryButtonTextColor: '#0f172a',
        secondaryButtonBorderColor: '#cbd5e1',
    },
    sanitarios_industrial: {
        backgroundColor: '#f97316',
        gridLineColor: '#ffffff',
        leftPanelColor: '#121212',
        titleColor: '#ffffff',
        labelColor: '#f97316',
        cardBgColor: '#ffffff',
        cardBorderColor: '#ffffff',
        cardTitleColor: '#ffffff',
        cardSubtitleColor: '#e4e4e7',
        textColor: '#f4f4f5',
        primaryButtonBgColor: '#ffffff',
        primaryButtonTextColor: '#f97316',
        secondaryButtonBgColor: '#18181b',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: '#3f3f46',
        specColor: '#e4e4e7',
        dotActiveColor: '#f97316',
        dotInactiveColor: '#d4d4d8',
    },
    corporate: {},
    modern_boutique: {
        titleColor: '#ffffff',
        textColor: '#f4f4f5',
        labelBgColor: '#000000',
        labelTextColor: '#ffffff',
        primaryButtonBgColor: '#000000',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: 'rgba(255, 255, 255, 0)',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: 'rgba(255, 255, 255, 0.3)',
        accentBgColor: '#ffffff',
        accentTextColor: '#000000',
        overlayColor: '#000000',
    },
};

const EMPTY_SLIDE = {
    label: '',
    title: '',
    subtitle: '',
    description: '',
    featured: '',
    cardEyebrow: '',
    cardTitle: '',
    specLabel: '',
    image: '',
    primaryButtonLabel: '',
    primaryButtonLink: '',
    secondaryButtonLabel: '',
    secondaryButtonLink: '',
};

const cloneSlides = (slides = []) => slides.map((slide) => ({ ...slide }));

const sanitizeText = (value) => (typeof value === 'string' ? value : '');

export const normalizeHeroVariant = (variant) =>
    HERO_VARIANT_OPTIONS.some((option) => option.value === variant) ? variant : 'classic';

export const getDefaultHeroSlides = (variant) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    const defaults = SLIDE_DEFAULTS_BY_VARIANT[normalizedVariant] || [];
    return cloneSlides(defaults);
};

export const getDefaultHeroStyles = (variant) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    return { ...(STYLE_DEFAULTS_BY_VARIANT[normalizedVariant] || {}) };
};

export const createEmptyHeroSlide = (variant) => {
    const defaults = getDefaultHeroSlides(variant);
    if (defaults.length > 0) {
        return { ...defaults[0], label: '', title: '', subtitle: '', description: '', featured: '' };
    }
    return { ...EMPTY_SLIDE };
};

const normalizeSlide = (rawSlide = {}) => ({
    label: sanitizeText(rawSlide.label),
    title: sanitizeText(rawSlide.title),
    subtitle: sanitizeText(rawSlide.subtitle),
    description: sanitizeText(rawSlide.description),
    featured: sanitizeText(rawSlide.featured),
    cardEyebrow: sanitizeText(rawSlide.cardEyebrow),
    cardTitle: sanitizeText(rawSlide.cardTitle),
    specLabel: sanitizeText(rawSlide.specLabel),
    image: sanitizeText(rawSlide.image),
    primaryButtonLabel: sanitizeText(rawSlide.primaryButtonLabel),
    primaryButtonLink: sanitizeText(rawSlide.primaryButtonLink),
    secondaryButtonLabel: sanitizeText(rawSlide.secondaryButtonLabel),
    secondaryButtonLink: sanitizeText(rawSlide.secondaryButtonLink),
});

export const normalizeHeroSlides = (variant, slides) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    const sourceSlides = Array.isArray(slides) && slides.length > 0 ? slides : getDefaultHeroSlides(normalizedVariant);
    const normalized = sourceSlides.map((slide) => normalizeSlide(slide));
    return normalized.length > 0 ? normalized : [normalizeSlide(createEmptyHeroSlide(normalizedVariant))];
};

// Slot de color → token de tema. Slots ausentes no heredan del tema (solo hardcoded).
export const HERO_THEME_TOKEN_MAP = {
    classic: {
        // titleHexColor y subtitleHexColor NO se enchufan al tema:
        // el hero clasico va sobre imagen con overlay oscuro, default claro hardcoded.
        tagTextColor: 'primary',
        tagBgColor: 'primary',
        tagBorderColor: 'primary',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
    },
    modernist: {
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    modernist_centered: {
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    modern_boutique: {
        titleColor: 'text',
        textColor: 'secondary',
        labelBgColor: 'primary',
        labelTextColor: 'background',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
        accentBgColor: 'accent',
        accentTextColor: 'background',
    },
    fashion: {
        backgroundColor: 'background',
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        accentColor: 'accent',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    home_decor: {
        backgroundColor: 'background',
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        accentColor: 'accent',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    sanitarios_industrial: {
        titleColor: 'text',
        labelColor: 'secondary',
        cardTitleColor: 'text',
        cardSubtitleColor: 'secondary',
        textColor: 'secondary',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
        specColor: 'accent',
        dotActiveColor: 'primary',
    },
    corporate: {
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'accent',
    },
};

export const normalizeHeroStyles = (variant, styles, themeColors = null) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    const defaults = getDefaultHeroStyles(variant);
    const source = styles && typeof styles === 'object' ? styles : {};
    const themeMap = HERO_THEME_TOKEN_MAP[normalizedVariant] || {};
    const next = { ...defaults };

    Object.keys(defaults).forEach((key) => {
        const override = source[key];
        if (typeof override === 'string' && override.trim().length > 0) {
            next[key] = override;
            return;
        }
        const tokenName = themeMap[key];
        if (tokenName && themeColors && typeof themeColors[tokenName] === 'string' && themeColors[tokenName].length > 0) {
            next[key] = themeColors[tokenName];
        }
    });

    return next;
};
