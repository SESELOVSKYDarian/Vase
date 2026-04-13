export const BRAND_VARIANT_OPTIONS = [
    { value: 'classic', label: 'Clasico (actual)' },
    { value: 'glass', label: 'Cristal' },
    { value: 'monochrome', label: 'Monocromatico' },
    { value: 'grid_static', label: 'Grilla Estatica' },
];

export const BRAND_MARQUEE_SPEED_OPTIONS = [
    { value: 'static', label: 'Fija' },
    { value: 'slow', label: 'Lenta' },
    { value: 'medium', label: 'Media' },
    { value: 'fast', label: 'Rapida' },
];

export const getDefaultBrandMarqueeItems = () => [
    {
        id: 'brand-marquee-kohler',
        name: 'Kohler',
        link: '',
    },
    {
        id: 'brand-marquee-delta',
        name: 'Delta',
        link: '',
    },
    {
        id: 'brand-marquee-moen',
        name: 'Moen',
        link: '',
    },
    {
        id: 'brand-marquee-grohe',
        name: 'Grohe',
        link: '',
    },
    {
        id: 'brand-marquee-toto',
        name: 'Toto',
        link: '',
    },
    {
        id: 'brand-marquee-hansgrohe',
        name: 'Hansgrohe',
        link: '',
    },
    {
        id: 'brand-marquee-duravit',
        name: 'Duravit',
        link: '',
    },
    {
        id: 'brand-marquee-roca',
        name: 'Roca',
        link: '',
    },
    {
        id: 'brand-marquee-american-standard',
        name: 'American Standard',
        link: '',
    },
    {
        id: 'brand-marquee-pfister',
        name: 'Pfister',
        link: '',
    },
];

export const getDefaultBrandMarqueeProps = () => ({
    eyebrow: 'Nuestras marcas aliadas',
    title: '',
    subtitle: '',
    speed: 'medium',
    primaryButton: { label: '', link: '' },
    items: getDefaultBrandMarqueeItems(),
    styles: {
        backgroundColor: 'rgba(249, 250, 251, 0.5)',
        panelBackgroundColor: '#ffffff',
        titleColor: '#111111',
        subtitleColor: '#9ca3af',
        badgeBackgroundColor: '#f97316',
        badgeTextColor: '#111111',
        cardBackgroundColor: '#ffffff',
        cardBorderColor: '#e5e7eb',
    },
});

export const normalizeBrandMarqueeSpeed = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (BRAND_MARQUEE_SPEED_OPTIONS.some((option) => option.value === normalized)) {
        return normalized;
    }
    return 'static';
};

export const normalizeBrandMarqueeItems = (items) => {
    const source = Array.isArray(items) && items.length ? items : getDefaultBrandMarqueeItems();
    return source.map((item, index) => ({
        id: String(item?.id || `brand-marquee-${index + 1}`),
        name: String(item?.name || `Marca ${index + 1}`).trim(),
        image: String(item?.image || '').trim(),
        link: String(item?.link || '').trim(),
    }));
};
