export const HERO_VARIANT_OPTIONS = [
    { value: 'classic', label: 'Clasico (actual)' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'home_decor', label: 'Home Decor' },
    { value: 'sanitarios_industrial', label: 'Industrial Showcase' },
    { value: 'gaming', label: 'Gaming Neon' },
    { value: 'corporate', label: 'Corporate Clean' },
    { value: 'sale_burst', label: 'Liquidación Burst' },
];

export const HERO_COLOR_FIELDS = {
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

const GAMING_DEFAULT_SLIDES = [{ label: 'Gaming', title: 'Level Up', subtitle: 'Next Gen', description: 'Gaming accessories', featured: '', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070', primaryButtonLabel: 'Shop Now', primaryButtonLink: '/catalog', secondaryButtonLabel: '', secondaryButtonLink: '' }];
const CORPORATE_DEFAULT_SLIDES = [{ label: 'Corporate', title: 'Elevate Business', subtitle: 'Enterprise solutions', description: 'Enterprise gear', featured: '', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069', primaryButtonLabel: 'Contact Us', primaryButtonLink: '/catalog', secondaryButtonLabel: '', secondaryButtonLink: '' }];
const SALE_BURST_DEFAULT_SLIDES = [{ label: 'Limited Offer', title: 'MEGA SALE', subtitle: '50% OFF', description: 'Clearance sale', featured: '', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070', primaryButtonLabel: 'SHOP', primaryButtonLink: '/catalog', secondaryButtonLabel: '', secondaryButtonLink: '' }];

const SLIDE_DEFAULTS_BY_VARIANT = {
    fashion: FASHION_DEFAULT_SLIDES,
    home_decor: HOME_DECOR_DEFAULT_SLIDES,
    sanitarios_industrial: SANITARIOS_INDUSTRIAL_DEFAULT_SLIDES,
    gaming: GAMING_DEFAULT_SLIDES,
    corporate: CORPORATE_DEFAULT_SLIDES,
    sale_burst: SALE_BURST_DEFAULT_SLIDES,
};

const STYLE_DEFAULTS_BY_VARIANT = {
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
    gaming: { titleColor: '#ffffff', overlayOpacity: '0.9', overlayColor: '#0f0c29' },
    corporate: {},
    sale_burst: {},
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

export const normalizeHeroStyles = (variant, styles) => {
    const defaults = getDefaultHeroStyles(variant);
    const source = styles && typeof styles === 'object' ? styles : {};
    const next = { ...defaults };
    Object.keys(defaults).forEach((key) => {
        if (typeof source[key] === 'string' && source[key].trim().length > 0) {
            next[key] = source[key];
        }
    });
    return next;
};
