import React, { useMemo, useState } from 'react';
import EvolutionInput from './EvolutionInput';
import { cn } from '../../../utils/cn';
import {
    Palette,
    LinkSimple as LinkIcon,
    Image as ImageIcon,
    Eye,
    EyeSlash as EyeOff,
    IdentificationCard as Baseline,
    Layout,
    Stack,
    Plus,
    Trash,
    UploadSimple,
} from '@phosphor-icons/react';
import {
    HERO_COLOR_FIELDS,
    HERO_VARIANT_OPTIONS,
    createEmptyHeroSlide,
    getDefaultHeroSlides,
    normalizeHeroSlides,
    normalizeHeroStyles,
    normalizeHeroVariant,
} from '../../../data/heroSliderTemplates';
import {
    FEATURED_COLOR_FIELDS,
    FEATURED_VARIANT_OPTIONS,
    normalizeFeaturedStyles,
    normalizeFeaturedVariant,
} from '../../../data/featuredProductsTemplates';
import {
    BRAND_MARQUEE_SPEED_OPTIONS,
    getDefaultBrandMarqueeProps,
    normalizeBrandMarqueeItems,
    normalizeBrandMarqueeSpeed,
} from '../../../data/brandMarqueeDefaults';

const selectFieldClass =
    'admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200';

const compactFieldClass =
    'admin-input-field w-full rounded-lg border px-2.5 py-2 text-xs outline-none transition-all duration-200';

const HERO_EXAMPLE_BY_VARIANT = {
    classic: 'Hero clasico de portada',
    fashion: 'Plantilla editorial de moda',
    home_decor: 'Plantilla estilo hogar/deco',
    sanitarios_industrial: 'Plantilla industrial tipo showcase',
};

const FEATURED_EXAMPLE_BY_VARIANT = {
    classic: 'Grid clasico de productos',
    modern: 'Grid moderno minimal',
    high_energy: 'Grid dinamico alta energia',
    luxury: 'Grid estilo premium/luxury',
};

const HERO_CLASSIC_COLOR_FIELDS = [
    { key: 'overlayColor', label: 'Overlay', defaultColor: '#000000' },
    { key: 'titleHexColor', label: 'Titulo', defaultColor: '#ffffff' },
    { key: 'subtitleHexColor', label: 'Subtitulo', defaultColor: '#ffffff' },
    { key: 'tagTextColor', label: 'Etiqueta (texto)', defaultColor: '#f27f0d' },
    { key: 'tagBgColor', label: 'Etiqueta (fondo)', defaultColor: '#2b1b08' },
    { key: 'tagBorderColor', label: 'Etiqueta (borde)', defaultColor: '#f27f0d' },
    { key: 'primaryButtonBgColor', label: 'Primario (fondo)', defaultColor: '#f27f0d' },
    { key: 'primaryButtonTextColor', label: 'Primario (texto)', defaultColor: '#ffffff' },
    { key: 'secondaryButtonBgColor', label: 'Secundario (fondo)', defaultColor: '#ffffff' },
    { key: 'secondaryButtonTextColor', label: 'Secundario (texto)', defaultColor: '#111111' },
    { key: 'secondaryButtonBorderColor', label: 'Secundario (borde)', defaultColor: '#ffffff' },
];

const SERVICES_ICON_OPTIONS = [
    { value: 'support_agent', label: 'Asesoria' },
    { value: 'local_shipping', label: 'Envio' },
    { value: 'construction', label: 'Soporte tecnico' },
    { value: 'package', label: 'Paquete' },
    { value: 'shield', label: 'Confianza' },
];

const ABOUT_MISSION_ICON_OPTIONS = [
    { value: 'verified', label: 'Verificado' },
    { value: 'eco', label: 'Eficiencia' },
];

const ABOUT_VALUES_ICON_OPTIONS = [
    { value: 'quality', label: 'Calidad' },
    { value: 'commitment', label: 'Compromiso' },
    { value: 'innovation', label: 'Innovacion' },
];

const panelClass = 'space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4';

const createBrandMarqueeItemId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `brand-marquee-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeColorInputValue = (value, fallback = '#000000') => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (/^#[\da-f]{6}$/i.test(trimmed)) return trimmed;
    if (/^#[\da-f]{3}$/i.test(trimmed)) {
        const raw = trimmed.slice(1);
        return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
    }
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgbMatch) return fallback;
    const channelToHex = (channel) => {
        const clamped = Math.max(0, Math.min(255, Number(channel)));
        return clamped.toString(16).padStart(2, '0');
    };
    return `#${channelToHex(rgbMatch[1])}${channelToHex(rgbMatch[2])}${channelToHex(rgbMatch[3])}`;
};

const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

const SectionHeading = ({ icon: Icon, children }) => (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
        <Icon size={14} weight="bold" />
        {children}
    </div>
);

const ColorField = ({ label, value, defaultColor = '#000000', onChange }) => (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <span className="text-[11px] font-medium text-zinc-300">{label}</span>
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={normalizeColorInputValue(value, defaultColor)}
                onChange={(event) => onChange(event.target.value)}
                className="h-8 w-9 cursor-pointer rounded-lg border-none bg-transparent"
            />
            <span className="min-w-[70px] text-right font-mono text-[10px] uppercase text-zinc-500">
                {normalizeColorInputValue(value, defaultColor)}
            </span>
        </div>
    </label>
);

const UploadButton = ({ busy, label, onChange }) => (
    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-white/20">
        <input type="file" accept="image/*" onChange={onChange} className="hidden" disabled={busy} />
        <UploadSimple size={14} weight="bold" />
        {busy ? 'Subiendo...' : label}
    </label>
);

const SlideCard = ({
    slide,
    index,
    total,
    variant,
    onChange,
    onRemove,
    onUpload,
    uploading,
}) => (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                Slide {index + 1}
            </p>
            <button
                type="button"
                onClick={onRemove}
                disabled={total <= 1}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
            >
                <Trash size={12} weight="bold" />
                Eliminar
            </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
            <input
                type="text"
                value={slide.label || ''}
                placeholder="Etiqueta"
                onChange={(event) => onChange({ label: event.target.value })}
                className={compactFieldClass}
            />
            <input
                type="text"
                value={slide.title || ''}
                placeholder="Titulo principal"
                onChange={(event) => onChange({ title: event.target.value })}
                className={compactFieldClass}
            />
            <input
                type="text"
                value={slide.subtitle || ''}
                placeholder="Subtitulo"
                onChange={(event) => onChange({ subtitle: event.target.value })}
                className={compactFieldClass}
            />
            <textarea
                rows={3}
                value={slide.description || ''}
                placeholder="Descripcion"
                onChange={(event) => onChange({ description: event.target.value })}
                className={cn(compactFieldClass, 'resize-y')}
            />
            <input
                type="text"
                value={slide.featured || ''}
                placeholder="Texto destacado"
                onChange={(event) => onChange({ featured: event.target.value })}
                className={compactFieldClass}
            />

            {variant === 'sanitarios_industrial' ? (
                <>
                    <input
                        type="text"
                        value={slide.cardEyebrow || ''}
                        placeholder="Card: etiqueta superior"
                        onChange={(event) => onChange({ cardEyebrow: event.target.value })}
                        className={compactFieldClass}
                    />
                    <input
                        type="text"
                        value={slide.cardTitle || ''}
                        placeholder="Card: titulo"
                        onChange={(event) => onChange({ cardTitle: event.target.value })}
                        className={compactFieldClass}
                    />
                    <input
                        type="text"
                        value={slide.specLabel || ''}
                        placeholder="Texto superior derecho"
                        onChange={(event) => onChange({ specLabel: event.target.value })}
                        className={compactFieldClass}
                    />
                </>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
                <input
                    type="text"
                    value={slide.primaryButtonLabel || ''}
                    placeholder="Boton principal"
                    onChange={(event) => onChange({ primaryButtonLabel: event.target.value })}
                    className={compactFieldClass}
                />
                <input
                    type="text"
                    value={slide.primaryButtonLink || ''}
                    placeholder="Link principal"
                    onChange={(event) => onChange({ primaryButtonLink: event.target.value })}
                    className={compactFieldClass}
                />
                <input
                    type="text"
                    value={slide.secondaryButtonLabel || ''}
                    placeholder="Boton secundario"
                    onChange={(event) => onChange({ secondaryButtonLabel: event.target.value })}
                    className={compactFieldClass}
                />
                <input
                    type="text"
                    value={slide.secondaryButtonLink || ''}
                    placeholder="Link secundario"
                    onChange={(event) => onChange({ secondaryButtonLink: event.target.value })}
                    className={compactFieldClass}
                />
            </div>

            <input
                type="text"
                value={slide.image || ''}
                placeholder="URL imagen"
                onChange={(event) => onChange({ image: event.target.value })}
                className={compactFieldClass}
            />

            <div className="flex items-center gap-2">
                <UploadButton busy={uploading} label="Subir imagen" onChange={onUpload} />
                {slide.image ? (
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white">
                        <img src={slide.image} alt="" className="h-full w-full object-cover" />
                    </div>
                ) : null}
            </div>
        </div>
    </div>
);

const BlockPropertiesEditor = ({ block, onChange }) => {
    const [uploadingTarget, setUploadingTarget] = useState('');

    if (!block) return null;

    const mergeProps = (patch) => {
        onChange({
            ...block,
            props: {
                ...(block.props || {}),
                ...patch,
            },
        });
    };

    const handlePropChange = (key, value) => {
        mergeProps({ [key]: value });
    };

    const handleStyleChange = (key, value) => {
        mergeProps({
            styles: {
                ...((block.props || {}).styles || {}),
                [key]: value,
            },
        });
    };

    const isHeroBlock = block.type === 'HeroSlider';
    const isBrandMarqueeBlock = block.type === 'BrandMarquee';
    const isFeaturedBlock = block.type === 'FeaturedProducts';
    const isServicesBlock = block.type === 'Services';
    const isAboutHeroBlock = block.type === 'AboutHero';
    const isAboutMissionBlock = block.type === 'AboutMission';
    const isAboutStatsBlock = block.type === 'AboutStats';
    const isAboutValuesBlock = block.type === 'AboutValues';
    const isAboutTeamBlock = block.type === 'AboutTeam';
    const isAboutCtaBlock = block.type === 'AboutCTA';
    const heroVariant = normalizeHeroVariant(block.props?.variant);
    const featuredVariant = normalizeFeaturedVariant(block.props?.variant);
    const isHeroClassic = isHeroBlock && heroVariant === 'classic';
    const subtitleKey = block.props?.description !== undefined ? 'description' : 'subtitle';

    const heroSlides = useMemo(() => {
        if (!isHeroBlock || isHeroClassic) return [];
        return normalizeHeroSlides(heroVariant, block.props?.slides);
    }, [block.props?.slides, heroVariant, isHeroBlock, isHeroClassic]);

    const heroColorFields = HERO_COLOR_FIELDS[heroVariant] || [];
    const featuredColorFields = FEATURED_COLOR_FIELDS[featuredVariant] || [];
    const featuredStyles = normalizeFeaturedStyles(featuredVariant, block.props?.styles);
    const brandMarqueeDefaults = useMemo(() => getDefaultBrandMarqueeProps(), []);
    const brandMarqueeItems = useMemo(
        () => normalizeBrandMarqueeItems(block.props?.items),
        [block.props?.items]
    );
    const brandMarqueeSpeed = normalizeBrandMarqueeSpeed(block.props?.speed || brandMarqueeDefaults.speed);

    const handleHeroVariantChange = (nextVariantRaw) => {
        const currentProps = block.props || {};
        const currentVariant = normalizeHeroVariant(currentProps.variant);
        const nextVariant = normalizeHeroVariant(nextVariantRaw);

        if (nextVariant === currentVariant) {
            mergeProps({ variant: nextVariant });
            return;
        }

        if (nextVariant === 'classic') {
            mergeProps({ variant: 'classic' });
            return;
        }

        const hasSlides = Array.isArray(currentProps.slides) && currentProps.slides.length > 0;
        mergeProps({
            variant: nextVariant,
            slides: hasSlides
                ? normalizeHeroSlides(nextVariant, currentProps.slides)
                : getDefaultHeroSlides(nextVariant),
            styles: normalizeHeroStyles(nextVariant, currentProps.styles),
        });
    };

    const handleFeaturedVariantChange = (nextVariantRaw) => {
        const currentProps = block.props || {};
        const nextVariant = normalizeFeaturedVariant(nextVariantRaw);

        if (nextVariant === 'classic') {
            mergeProps({ variant: 'classic' });
            return;
        }

        mergeProps({
            variant: nextVariant,
            styles: normalizeFeaturedStyles(nextVariant, currentProps.styles),
        });
    };

    const updateHeroSlide = (index, patch) => {
        const nextSlides = heroSlides.map((slide, slideIndex) =>
            slideIndex === index ? { ...slide, ...patch } : slide
        );
        mergeProps({ slides: nextSlides });
    };

    const addHeroSlide = () => {
        const nextSlide = {
            id: `hero-slide-${Date.now()}`,
            ...createEmptyHeroSlide(heroVariant),
        };
        mergeProps({ slides: [...heroSlides, nextSlide] });
    };

    const removeHeroSlide = (index) => {
        if (heroSlides.length <= 1) return;
        mergeProps({ slides: heroSlides.filter((_, slideIndex) => slideIndex !== index) });
    };

    const getArrayProp = (key) => (Array.isArray(block.props?.[key]) ? block.props[key] : []);

    const setArrayProp = (key, updater) => {
        const current = getArrayProp(key);
        const next = typeof updater === 'function' ? updater(current) : updater;
        mergeProps({ [key]: next });
    };

    const updateObjectArrayItem = (key, index, patch) => {
        setArrayProp(key, (items) =>
            items.map((item, itemIndex) => (
                itemIndex === index
                    ? {
                        ...(item || {}),
                        ...(typeof patch === 'function' ? patch(item || {}) : patch),
                    }
                    : item
            ))
        );
    };

    const updateStringArrayItem = (key, index, value) => {
        setArrayProp(key, (items) =>
            items.map((item, itemIndex) => (itemIndex === index ? value : item))
        );
    };

    const handleImageUpload = async (target, event, callback) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingTarget(target);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (dataUrl) callback(dataUrl);
        } catch (error) {
            console.error('Image upload failed', error);
        } finally {
            setUploadingTarget('');
            event.target.value = '';
        }
    };

    const renderImageControl = ({ label, value, placeholder = 'https://...', uploadKey, onChange, uploadLabel = 'Subir imagen' }) => (
        <div className="space-y-2">
            <EvolutionInput
                label={label}
                value={value || ''}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
            />
            <div className="flex items-center gap-2">
                <UploadButton
                    busy={uploadingTarget === uploadKey}
                    label={uploadLabel}
                    onChange={(event) => handleImageUpload(uploadKey, event, onChange)}
                />
                {value ? (
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white">
                        <img src={value} alt="" className="h-full w-full object-cover" />
                    </div>
                ) : null}
            </div>
        </div>
    );

    const renderHeroClassicEditor = () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Contenido principal</SectionHeading>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Etiqueta"
                        value={block.props?.tag || ''}
                        onChange={(event) => handlePropChange('tag', event.target.value)}
                        placeholder="Ej: Lanzamiento"
                    />
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Presenta tu propuesta principal"
                    />
                    <EvolutionInput
                        label="Subtitulo / descripcion"
                        value={block.props?.subtitle || ''}
                        onChange={(event) => handlePropChange('subtitle', event.target.value)}
                        placeholder="Ej: Mensaje de apoyo para explicar la propuesta"
                        multiline
                    />
                </div>
            </div>

            <div className={panelClass}>
                <SectionHeading icon={LinkIcon}>Botones</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                    <EvolutionInput
                        label="Primario: texto"
                        value={block.props?.primaryButton?.label || ''}
                        onChange={(event) =>
                            handlePropChange('primaryButton', {
                                ...(block.props?.primaryButton || {}),
                                label: event.target.value,
                            })
                        }
                        placeholder="Ej: Comprar ahora"
                    />
                    <EvolutionInput
                        label="Primario: link"
                        value={block.props?.primaryButton?.link || ''}
                        onChange={(event) =>
                            handlePropChange('primaryButton', {
                                ...(block.props?.primaryButton || {}),
                                link: event.target.value,
                            })
                        }
                        placeholder="/catalog"
                    />
                    <EvolutionInput
                        label="Secundario: texto"
                        value={block.props?.secondaryButton?.label || ''}
                        onChange={(event) =>
                            handlePropChange('secondaryButton', {
                                ...(block.props?.secondaryButton || {}),
                                label: event.target.value,
                            })
                        }
                        placeholder="Ej: Ver mas"
                    />
                    <EvolutionInput
                        label="Secundario: link"
                        value={block.props?.secondaryButton?.link || ''}
                        onChange={(event) =>
                            handlePropChange('secondaryButton', {
                                ...(block.props?.secondaryButton || {}),
                                link: event.target.value,
                            })
                        }
                        placeholder="/about"
                    />
                </div>
            </div>

            <div className={panelClass}>
                <SectionHeading icon={ImageIcon}>Imagen principal</SectionHeading>
                <div className="space-y-3">
                    <EvolutionInput
                        label="URL imagen"
                        value={block.props?.image || ''}
                        onChange={(event) => handlePropChange('image', event.target.value)}
                        placeholder="https://..."
                    />
                    <div className="flex items-center gap-2">
                        <UploadButton
                            busy={uploadingTarget === 'hero-classic-image'}
                            label="Subir imagen"
                            onChange={(event) =>
                                handleImageUpload('hero-classic-image', event, (value) => handlePropChange('image', value))
                            }
                        />
                        {block.props?.image ? (
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white">
                                <img src={block.props.image} alt="" className="h-full w-full object-cover" />
                            </div>
                        ) : null}
                    </div>
                    {block.props?.image ? (
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5">
                            <img src={block.props.image} alt="Preview hero" className="h-full w-full object-cover opacity-80" />
                        </div>
                    ) : null}
                </div>
            </div>

            <div className={panelClass}>
                <SectionHeading icon={Palette}>Estilo del slider</SectionHeading>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion</label>
                        <select
                            value={block.props?.styles?.alignment || 'left'}
                            onChange={(event) => handleStyleChange('alignment', event.target.value)}
                            className={selectFieldClass}
                        >
                            <option value="left" className="bg-zinc-900">Izquierda</option>
                            <option value="center" className="bg-zinc-900">Centro</option>
                            <option value="right" className="bg-zinc-900">Derecha</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                            <span>Opacidad overlay</span>
                            <span className="admin-accent-text">{block.props?.styles?.overlayOpacity || '0.6'}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={block.props?.styles?.overlayOpacity || '0.6'}
                            onChange={(event) => handleStyleChange('overlayOpacity', event.target.value)}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {HERO_CLASSIC_COLOR_FIELDS.map((field) => (
                            <ColorField
                                key={field.key}
                                label={field.label}
                                value={block.props?.styles?.[field.key]}
                                defaultColor={field.defaultColor}
                                onChange={(value) => handleStyleChange(field.key, value)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );

    const renderHeroSlidesEditor = () => (
        <>
            <div className={panelClass}>
                <div className="flex items-center justify-between gap-3">
                    <SectionHeading icon={Stack}>Slides</SectionHeading>
                    <button
                        type="button"
                        onClick={addHeroSlide}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                    >
                        <Plus size={12} weight="bold" />
                        Agregar slide
                    </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                    Edita cada slide: textos, botones e imagen.
                </p>
                <div className="space-y-3">
                    {heroSlides.map((slide, index) => (
                        <SlideCard
                            key={slide.id || `slide-${index}`}
                            slide={slide}
                            index={index}
                            total={heroSlides.length}
                            variant={heroVariant}
                            onChange={(patch) => updateHeroSlide(index, patch)}
                            onRemove={() => removeHeroSlide(index)}
                            uploading={uploadingTarget === `hero-slide-${index}`}
                            onUpload={(event) =>
                                handleImageUpload(`hero-slide-${index}`, event, (value) => updateHeroSlide(index, { image: value }))
                            }
                        />
                    ))}
                </div>
            </div>

            {heroColorFields.length ? (
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del slider</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        {heroColorFields.map((field) => (
                            <ColorField
                                key={field.key}
                                label={field.label}
                                value={block.props?.styles?.[field.key]}
                                defaultColor={normalizeHeroStyles(heroVariant, block.props?.styles)?.[field.key] || '#000000'}
                                onChange={(value) => handleStyleChange(field.key, value)}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </>
    );

    const renderFeaturedEditor = () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Contenido del modulo</SectionHeading>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Productos destacados"
                    />
                    <EvolutionInput
                        label="Subtitulo"
                        value={block.props?.subtitle || ''}
                        onChange={(event) => handlePropChange('subtitle', event.target.value)}
                        placeholder="Texto de apoyo para la seccion"
                        multiline
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <EvolutionInput
                            label="CTA: texto"
                            value={block.props?.ctaLabel || ''}
                            onChange={(event) => handlePropChange('ctaLabel', event.target.value)}
                            placeholder="Ej: Ver catalogo"
                        />
                        <EvolutionInput
                            label="CTA: link"
                            value={block.props?.ctaLink || ''}
                            onChange={(event) => handlePropChange('ctaLink', event.target.value)}
                            placeholder="/catalog"
                        />
                    </div>
                </div>
            </div>

            {featuredVariant === 'classic' ? (
                <div className={panelClass}>
                    <SectionHeading icon={Layout}>Disposicion</SectionHeading>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion cabecera</label>
                            <select
                                value={block.props?.styles?.alignment || 'items-end justify-between'}
                                onChange={(event) => handleStyleChange('alignment', event.target.value)}
                                className={selectFieldClass}
                            >
                                <option value="items-start justify-between" className="bg-zinc-900">Arriba</option>
                                <option value="items-end justify-between" className="bg-zinc-900">Abajo</option>
                                <option value="items-center justify-between" className="bg-zinc-900">Centro</option>
                                <option value="items-end justify-center gap-6" className="bg-zinc-900">Centrado</option>
                            </select>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            Para colores avanzados, usa una plantilla visual como `Modern`, `High Energy` o `Luxury`.
                        </p>
                    </div>
                </div>
            ) : null}

            {featuredVariant !== 'classic' && featuredColorFields.length ? (
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del modulo</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        {featuredColorFields.map((field) => (
                            <ColorField
                                key={field.key}
                                label={field.label}
                                value={block.props?.styles?.[field.key]}
                                defaultColor={featuredStyles[field.key] || '#000000'}
                                onChange={(value) => handleStyleChange(field.key, value)}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </>
    );

    const renderServicesEditor = () => {
        const items = getArrayProp('items');

        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Contenido del modulo</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Titulo"
                            value={block.props?.title || ''}
                            onChange={(event) => handlePropChange('title', event.target.value)}
                            placeholder="Ej: Beneficios de comprar con tu marca"
                        />
                        <EvolutionInput
                            label="Subtitulo"
                            value={block.props?.subtitle || ''}
                            onChange={(event) => handlePropChange('subtitle', event.target.value)}
                            placeholder="Explica en una frase que aporta esta seccion"
                            multiline
                        />
                        <div className="space-y-1.5">
                            <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion</label>
                            <select
                                value={block.props?.styles?.alignment || 'text-center'}
                                onChange={(event) => handleStyleChange('alignment', event.target.value)}
                                className={selectFieldClass}
                            >
                                <option value="text-left" className="bg-zinc-900">Izquierda</option>
                                <option value="text-center" className="bg-zinc-900">Centro</option>
                                <option value="text-right" className="bg-zinc-900">Derecha</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Boxes del inicio</SectionHeading>
                        <button
                            type="button"
                            onClick={() =>
                                setArrayProp('items', [
                                    ...items,
                                    { icon: 'package', title: 'Nuevo beneficio', text: 'Describe en una frase que gana el cliente.' },
                                ])
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar box
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`service-item-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Box {index + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setArrayProp('items', items.filter((_, itemIndex) => itemIndex !== index))}
                                        disabled={items.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Icono</label>
                                    <select
                                        value={item?.icon || 'package'}
                                        onChange={(event) => updateObjectArrayItem('items', index, { icon: event.target.value })}
                                        className={selectFieldClass}
                                    >
                                        {SERVICES_ICON_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-zinc-900">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <EvolutionInput
                                    label="Titulo"
                                    value={item?.title || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { title: event.target.value })}
                                    placeholder="Ej: Envio coordinado"
                                />
                                <EvolutionInput
                                    label="Descripcion"
                                    value={item?.text || item?.description || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { text: event.target.value, description: event.target.value })}
                                    placeholder="Explica el beneficio o servicio"
                                    multiline
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo seccion" value={block.props?.styles?.backgroundColor} defaultColor="#f8f7f5" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Titulo" value={block.props?.styles?.titleColor} defaultColor="#181411" onChange={(value) => handleStyleChange('titleColor', value)} />
                        <ColorField label="Subtitulo" value={block.props?.styles?.subtitleColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('subtitleColor', value)} />
                        <ColorField label="Fondo box" value={block.props?.styles?.cardBackgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('cardBackgroundColor', value)} />
                        <ColorField label="Titulo box" value={block.props?.styles?.cardTitleColor} defaultColor="#181411" onChange={(value) => handleStyleChange('cardTitleColor', value)} />
                        <ColorField label="Texto box" value={block.props?.styles?.cardTextColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('cardTextColor', value)} />
                        <ColorField label="Icono" value={block.props?.styles?.iconColor} defaultColor="#111111" onChange={(value) => handleStyleChange('iconColor', value)} />
                        <ColorField label="Fondo icono" value={block.props?.styles?.iconBackgroundColor} defaultColor="#f3f4f6" onChange={(value) => handleStyleChange('iconBackgroundColor', value)} />
                    </div>
                </div>
            </>
        );
    };

    const renderBrandMarqueeEditor = () => {
        const setBrandItems = (nextItems) => {
            mergeProps({ items: nextItems });
        };

        const addBrandItem = () => {
            setBrandItems([
                ...brandMarqueeItems,
                {
                    id: createBrandMarqueeItemId(),
                    name: 'Nueva marca',
                    image: '',
                    link: '',
                },
            ]);
        };

        const updateBrandItem = (index, patch) => {
            setBrandItems(
                brandMarqueeItems.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, ...patch } : item
                )
            );
        };

        const removeBrandItem = (index) => {
            if (brandMarqueeItems.length <= 1) return;
            setBrandItems(brandMarqueeItems.filter((_, itemIndex) => itemIndex !== index));
        };

        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Encabezado de marcas</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Etiqueta superior"
                            value={block.props?.eyebrow ?? brandMarqueeDefaults.eyebrow}
                            onChange={(event) => handlePropChange('eyebrow', event.target.value)}
                            placeholder="Ej: Nuestras marcas aliadas"
                        />
                        <EvolutionInput
                            label="Titulo opcional"
                            value={block.props?.title ?? brandMarqueeDefaults.title}
                            onChange={(event) => handlePropChange('title', event.target.value)}
                            placeholder="Dejalo vacio si queres solo la etiqueta"
                        />
                        <EvolutionInput
                            label="Subtitulo opcional"
                            value={block.props?.subtitle ?? brandMarqueeDefaults.subtitle}
                            onChange={(event) => handlePropChange('subtitle', event.target.value)}
                            placeholder="Texto extra debajo de la etiqueta"
                            multiline
                        />
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
                            <EvolutionInput
                                label="Boton: texto"
                                value={block.props?.primaryButton?.label || ''}
                                onChange={(event) =>
                                    handlePropChange('primaryButton', {
                                        ...(block.props?.primaryButton || {}),
                                        label: event.target.value,
                                    })
                                }
                                placeholder="Ej: Ver mas"
                            />
                            <EvolutionInput
                                label="Boton: link"
                                value={block.props?.primaryButton?.link || ''}
                                onChange={(event) =>
                                    handlePropChange('primaryButton', {
                                        ...(block.props?.primaryButton || {}),
                                        link: event.target.value,
                                    })
                                }
                                placeholder="/catalog"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Velocidad</label>
                            <select
                                value={brandMarqueeSpeed}
                                onChange={(event) => handlePropChange('speed', event.target.value)}
                                className={selectFieldClass}
                            >
                                {BRAND_MARQUEE_SPEED_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-zinc-900">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Marcas del carrusel</SectionHeading>
                        <button
                            type="button"
                            onClick={addBrandItem}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar marca
                        </button>
                    </div>
                    <div className="space-y-3">
                        {brandMarqueeItems.map((item, index) => (
                            <div key={item.id || `brand-item-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                                        Marca {index + 1}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => removeBrandItem(index)}
                                        disabled={brandMarqueeItems.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>

                                <EvolutionInput
                                    label="Nombre"
                                    value={item?.name || ''}
                                    onChange={(event) => updateBrandItem(index, { name: event.target.value })}
                                    placeholder="Ej: Roca"
                                />
                                <EvolutionInput
                                    label="URL del logo"
                                    value={item?.image || ''}
                                    onChange={(event) => updateBrandItem(index, { image: event.target.value })}
                                    placeholder="https://..."
                                />
                                <EvolutionInput
                                    label="Link opcional"
                                    value={item?.link || ''}
                                    onChange={(event) => updateBrandItem(index, { link: event.target.value })}
                                    placeholder="https://sitio-de-la-marca.com"
                                />

                                <div className="flex items-center gap-2">
                                    <UploadButton
                                        busy={uploadingTarget === `brand-marquee-${index}`}
                                        label="Subir logo"
                                        onChange={(event) =>
                                            handleImageUpload(`brand-marquee-${index}`, event, (value) =>
                                                updateBrandItem(index, { image: value })
                                            )
                                        }
                                    />
                                    {item?.image ? (
                                        <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white p-2">
                                            <img src={item.image} alt={item.name || 'Marca'} className="max-h-full w-full object-contain" />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField
                            label="Fondo seccion"
                            value={block.props?.styles?.backgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.backgroundColor}
                            onChange={(value) => handleStyleChange('backgroundColor', value)}
                        />
                        <ColorField
                            label="Fondo panel"
                            value={block.props?.styles?.panelBackgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.panelBackgroundColor}
                            onChange={(value) => handleStyleChange('panelBackgroundColor', value)}
                        />
                        <ColorField
                            label="Titulo"
                            value={block.props?.styles?.titleColor}
                            defaultColor={brandMarqueeDefaults.styles.titleColor}
                            onChange={(value) => handleStyleChange('titleColor', value)}
                        />
                        <ColorField
                            label="Subtitulo"
                            value={block.props?.styles?.subtitleColor}
                            defaultColor={brandMarqueeDefaults.styles.subtitleColor}
                            onChange={(value) => handleStyleChange('subtitleColor', value)}
                        />
                        <ColorField
                            label="Badge fondo"
                            value={block.props?.styles?.badgeBackgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.badgeBackgroundColor}
                            onChange={(value) => handleStyleChange('badgeBackgroundColor', value)}
                        />
                        <ColorField
                            label="Badge texto"
                            value={block.props?.styles?.badgeTextColor}
                            defaultColor={brandMarqueeDefaults.styles.badgeTextColor}
                            onChange={(value) => handleStyleChange('badgeTextColor', value)}
                        />
                        <ColorField
                            label="Card logo"
                            value={block.props?.styles?.cardBackgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.cardBackgroundColor}
                            onChange={(value) => handleStyleChange('cardBackgroundColor', value)}
                        />
                        <ColorField
                            label="Borde logo"
                            value={block.props?.styles?.cardBorderColor}
                            defaultColor={brandMarqueeDefaults.styles.cardBorderColor}
                            onChange={(value) => handleStyleChange('cardBorderColor', value)}
                        />
                        <ColorField
                            label="Color acento"
                            value={block.props?.styles?.accentColor}
                            defaultColor="var(--color-primary, #f97316)"
                            onChange={(value) => handleStyleChange('accentColor', value)}
                        />
                    </div>
                </div>
            </>
        );
    };

    const renderAboutHeroEditor = () => {
        const overlayOpacity = Number.isFinite(Number(block.props?.styles?.overlayOpacity))
            ? Number(block.props.styles.overlayOpacity)
            : 0.85;

        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Hero de nosotros</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput label="Etiqueta" value={block.props?.tagline || ''} onChange={(event) => handlePropChange('tagline', event.target.value)} placeholder="Ej: Desde 2014" />
                        <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(event) => handlePropChange('title', event.target.value)} placeholder="Ej: La historia de la marca" />
                        <EvolutionInput
                            label="Descripcion"
                            value={block.props?.description || ''}
                            onChange={(event) => handlePropChange('description', event.target.value)}
                            placeholder="Resume la propuesta y el recorrido de la empresa"
                            multiline
                        />
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={LinkIcon}>Botones</SectionHeading>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput
                                label="Primario: texto"
                                value={block.props?.primaryButton?.label || ''}
                                onChange={(event) => handlePropChange('primaryButton', { ...(block.props?.primaryButton || {}), label: event.target.value })}
                                placeholder="Ej: Ver catalogo"
                            />
                            <EvolutionInput
                                label="Primario: link"
                                value={block.props?.primaryButton?.link || ''}
                                onChange={(event) => handlePropChange('primaryButton', { ...(block.props?.primaryButton || {}), link: event.target.value })}
                                placeholder="/catalog"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput
                                label="Secundario: texto"
                                value={block.props?.secondaryButton?.label || ''}
                                onChange={(event) => handlePropChange('secondaryButton', { ...(block.props?.secondaryButton || {}), label: event.target.value })}
                                placeholder="Ej: Conocer al equipo"
                            />
                            <EvolutionInput
                                label="Secundario: link"
                                value={block.props?.secondaryButton?.link || ''}
                                onChange={(event) => handlePropChange('secondaryButton', { ...(block.props?.secondaryButton || {}), link: event.target.value })}
                                placeholder="#equipo"
                            />
                        </div>
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Imagen de fondo</SectionHeading>
                    {renderImageControl({
                        label: 'Imagen de fondo',
                        value: block.props?.backgroundImage,
                        uploadKey: 'about-hero-background',
                        onChange: (value) => handlePropChange('backgroundImage', value),
                    })}
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del hero</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#d4d4d8" onChange={(value) => handleStyleChange('mutedColor', value)} />
                        <ColorField label="Overlay" value={block.props?.styles?.overlayColor} defaultColor="#111111" onChange={(value) => handleStyleChange('overlayColor', value)} />
                    </div>
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                            <span>Intensidad overlay</span>
                            <span className="admin-accent-text">{Math.round(overlayOpacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={Math.round(overlayOpacity * 100)}
                            onChange={(event) => handleStyleChange('overlayOpacity', Number(event.target.value) / 100)}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                        />
                    </div>
                </div>
            </>
        );
    };

    const renderAboutMissionEditor = () => {
        const paragraphs = getArrayProp('paragraphs');
        const highlights = getArrayProp('highlights');

        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Mision y propuesta</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput label="Eyebrow" value={block.props?.eyebrow || ''} onChange={(event) => handlePropChange('eyebrow', event.target.value)} placeholder="Ej: Nuestro proposito" />
                        <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(event) => handlePropChange('title', event.target.value)} placeholder="Ej: La mision" />
                    </div>
                </div>

                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Parrafos</SectionHeading>
                        <button
                            type="button"
                            onClick={() => setArrayProp('paragraphs', [...paragraphs, 'Nuevo parrafo'])}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {paragraphs.map((paragraph, index) => (
                            <div key={`paragraph-${index}`} className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Parrafo {index + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setArrayProp('paragraphs', paragraphs.filter((_, itemIndex) => itemIndex !== index))}
                                        disabled={paragraphs.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
                                <EvolutionInput
                                    label="Texto"
                                    value={paragraph || ''}
                                    onChange={(event) => updateStringArrayItem('paragraphs', index, event.target.value)}
                                    placeholder="Desarrolla la historia o la propuesta de valor"
                                    multiline
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Puntos destacados</SectionHeading>
                        <button
                            type="button"
                            onClick={() =>
                                setArrayProp('highlights', [
                                    ...highlights,
                                    { icon: 'verified', title: 'Nuevo punto', text: 'Agrega un beneficio o prueba social.' },
                                ])
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {highlights.map((item, index) => (
                            <div key={`highlight-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Punto {index + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setArrayProp('highlights', highlights.filter((_, itemIndex) => itemIndex !== index))}
                                        disabled={highlights.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Icono</label>
                                    <select
                                        value={item?.icon || 'verified'}
                                        onChange={(event) => updateObjectArrayItem('highlights', index, { icon: event.target.value })}
                                        className={selectFieldClass}
                                    >
                                        {ABOUT_MISSION_ICON_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-zinc-900">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <EvolutionInput label="Titulo" value={item?.title || ''} onChange={(event) => updateObjectArrayItem('highlights', index, { title: event.target.value })} placeholder="Ej: Calidad constante" />
                                <EvolutionInput
                                    label="Descripcion"
                                    value={item?.text || ''}
                                    onChange={(event) => updateObjectArrayItem('highlights', index, { text: event.target.value })}
                                    placeholder="Describe el diferencial"
                                    multiline
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Imagen lateral</SectionHeading>
                    {renderImageControl({
                        label: 'Imagen',
                        value: block.props?.image,
                        uploadKey: 'about-mission-image',
                        onChange: (value) => handlePropChange('image', value),
                    })}
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('mutedColor', value)} />
                    </div>
                </div>
            </>
        );
    };

    const renderAboutStatsEditor = () => {
        const items = getArrayProp('items');

        return (
            <>
                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Metricas</SectionHeading>
                        <button
                            type="button"
                            onClick={() => setArrayProp('items', [...items, { value: '0', label: 'Nueva metrica' }])}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`stat-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Metrica {index + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setArrayProp('items', items.filter((_, itemIndex) => itemIndex !== index))}
                                        disabled={items.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
                                <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-3">
                                    <EvolutionInput label="Valor" value={item?.value || ''} onChange={(event) => updateObjectArrayItem('items', index, { value: event.target.value })} placeholder="Ej: 15+" />
                                    <EvolutionInput label="Etiqueta" value={item?.label || ''} onChange={(event) => updateObjectArrayItem('items', index, { label: event.target.value })} placeholder="Ej: Proyectos activos" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateObjectArrayItem('items', index, { accent: !item?.accent })}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors',
                                        item?.accent
                                            ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-white'
                                            : 'border-white/10 bg-white/5 text-zinc-300'
                                    )}
                                >
                                    {item?.accent ? 'Valor destacado' : 'Marcar como destacado'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#181411" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#9ca3af" onChange={(value) => handleStyleChange('mutedColor', value)} />
                    </div>
                </div>
            </>
        );
    };

    const renderAboutValuesEditor = () => {
        const items = getArrayProp('items');

        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Valores</SectionHeading>
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Nuestros valores"
                    />
                </div>

                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Tarjetas</SectionHeading>
                        <button
                            type="button"
                            onClick={() =>
                                setArrayProp('items', [
                                    ...items,
                                    { icon: 'quality', title: 'Nuevo valor', description: 'Describe el principio que representa a la marca.' },
                                ])
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`value-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Tarjeta {index + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setArrayProp('items', items.filter((_, itemIndex) => itemIndex !== index))}
                                        disabled={items.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Icono</label>
                                    <select
                                        value={item?.icon || 'quality'}
                                        onChange={(event) => updateObjectArrayItem('items', index, { icon: event.target.value })}
                                        className={selectFieldClass}
                                    >
                                        {ABOUT_VALUES_ICON_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-zinc-900">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <EvolutionInput label="Titulo" value={item?.title || ''} onChange={(event) => updateObjectArrayItem('items', index, { title: event.target.value })} placeholder="Ej: Claridad" />
                                <EvolutionInput
                                    label="Descripcion"
                                    value={item?.description || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { description: event.target.value })}
                                    placeholder="Describe el valor con una frase concreta"
                                    multiline
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#f8f7f5" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Fondo tarjeta" value={block.props?.styles?.cardBackground} defaultColor="#ffffff" onChange={(value) => handleStyleChange('cardBackground', value)} />
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('mutedColor', value)} />
                    </div>
                </div>
            </>
        );
    };

    const renderAboutTeamEditor = () => {
        const overlayOpacity = Number.isFinite(Number(block.props?.styles?.overlayOpacity))
            ? Number(block.props.styles.overlayOpacity)
            : 0.25;

        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Bloque equipo</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(event) => handlePropChange('title', event.target.value)} placeholder="Ej: Equipo y liderazgo" />
                        <EvolutionInput
                            label="Cita"
                            value={block.props?.quote || ''}
                            onChange={(event) => handlePropChange('quote', event.target.value)}
                            placeholder="Mensaje o declaracion principal"
                            multiline
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput label="Autor" value={block.props?.author || ''} onChange={(event) => handlePropChange('author', event.target.value)} placeholder="Nombre" />
                            <EvolutionInput label="Rol" value={block.props?.role || ''} onChange={(event) => handlePropChange('role', event.target.value)} placeholder="Cargo" />
                        </div>
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Imagenes</SectionHeading>
                    <div className="space-y-4">
                        {renderImageControl({
                            label: 'Avatar',
                            value: block.props?.avatarImage,
                            uploadKey: 'about-team-avatar',
                            onChange: (value) => handlePropChange('avatarImage', value),
                        })}
                        {renderImageControl({
                            label: 'Imagen lateral',
                            value: block.props?.backgroundImage,
                            uploadKey: 'about-team-background',
                            onChange: (value) => handlePropChange('backgroundImage', value),
                        })}
                    </div>
                </div>

                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Texto" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Overlay" value={block.props?.styles?.overlayColor} defaultColor="#000000" onChange={(value) => handleStyleChange('overlayColor', value)} />
                    </div>
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                            <span>Intensidad overlay</span>
                            <span className="admin-accent-text">{Math.round(overlayOpacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={Math.round(overlayOpacity * 100)}
                            onChange={(event) => handleStyleChange('overlayOpacity', Number(event.target.value) / 100)}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                        />
                    </div>
                </div>
            </>
        );
    };

    const renderAboutCtaEditor = () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>CTA final</SectionHeading>
                <EvolutionInput
                    label="Titulo"
                    value={block.props?.title || ''}
                    onChange={(event) => handlePropChange('title', event.target.value)}
                    placeholder="Ej: Listo para dar el siguiente paso?"
                />
            </div>

            <div className={panelClass}>
                <SectionHeading icon={LinkIcon}>Enlaces</SectionHeading>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <EvolutionInput
                            label="Primario: texto"
                            value={block.props?.primaryLink?.label || ''}
                            onChange={(event) => handlePropChange('primaryLink', { ...(block.props?.primaryLink || {}), label: event.target.value })}
                            placeholder="Ej: Ver catalogo"
                        />
                        <EvolutionInput
                            label="Primario: link"
                            value={block.props?.primaryLink?.link || ''}
                            onChange={(event) => handlePropChange('primaryLink', { ...(block.props?.primaryLink || {}), link: event.target.value })}
                            placeholder="/catalog"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <EvolutionInput
                            label="Secundario: texto"
                            value={block.props?.secondaryLink?.label || ''}
                            onChange={(event) => handlePropChange('secondaryLink', { ...(block.props?.secondaryLink || {}), label: event.target.value })}
                            placeholder="Ej: Contacto"
                        />
                        <EvolutionInput
                            label="Secundario: link"
                            value={block.props?.secondaryLink?.link || ''}
                            onChange={(event) => handlePropChange('secondaryLink', { ...(block.props?.secondaryLink || {}), link: event.target.value })}
                            placeholder="/contact"
                        />
                    </div>
                </div>
            </div>

            <div className={panelClass}>
                <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                <div className="grid grid-cols-1 gap-2">
                    <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                    <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                    <ColorField label="Texto" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                    <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('mutedColor', value)} />
                </div>
            </div>
        </>
    );

    const renderGenericEditor = () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Contenido principal</SectionHeading>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Lanzamiento principal"
                    />
                    <EvolutionInput
                        label="Subtitulo / descripcion"
                        value={block.props?.subtitle || block.props?.description || ''}
                        onChange={(event) => handlePropChange(subtitleKey, event.target.value)}
                        placeholder="Ej: Calidad y diseno para tu marca"
                        multiline
                    />
                </div>
            </div>

            {(block.props?.ctaLink !== undefined || block.props?.primaryButton) ? (
                <div className={panelClass}>
                    <SectionHeading icon={LinkIcon}>Accion (CTA)</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Texto del boton"
                            value={block.props?.ctaLabel || block.props?.primaryButton?.label || ''}
                            onChange={(event) => {
                                if (block.props?.primaryButton) {
                                    handlePropChange('primaryButton', { ...block.props.primaryButton, label: event.target.value });
                                    return;
                                }
                                handlePropChange('ctaLabel', event.target.value);
                            }}
                            placeholder="Ej: Ver catalogo"
                        />
                        <EvolutionInput
                            label="Enlace"
                            value={block.props?.ctaLink || block.props?.primaryButton?.link || ''}
                            onChange={(event) => {
                                if (block.props?.primaryButton) {
                                    handlePropChange('primaryButton', { ...block.props.primaryButton, link: event.target.value });
                                    return;
                                }
                                handlePropChange('ctaLink', event.target.value);
                            }}
                            placeholder="/catalog"
                        />
                    </div>
                </div>
            ) : null}

            <div className={panelClass}>
                <SectionHeading icon={Palette}>Estilo</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion</label>
                        <select
                            value={block.props?.styles?.alignment || 'center'}
                            onChange={(event) => handleStyleChange('alignment', event.target.value)}
                            className={selectFieldClass}
                        >
                            <option value="left" className="bg-zinc-900">Izquierda</option>
                            <option value="center" className="bg-zinc-900">Centro</option>
                            <option value="right" className="bg-zinc-900">Derecha</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Fondo</label>
                        <div className="flex items-center gap-2">
                            <div
                                className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-white/10"
                                style={{ backgroundColor: block.props?.styles?.backgroundColor || '#ffffff' }}
                            >
                                <input
                                    type="color"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    value={normalizeColorInputValue(block.props?.styles?.backgroundColor, '#ffffff')}
                                    onChange={(event) => handleStyleChange('backgroundColor', event.target.value)}
                                />
                            </div>
                            <span className="font-mono text-[10px] uppercase text-zinc-500">
                                {normalizeColorInputValue(block.props?.styles?.backgroundColor, '#ffffff')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                        <span>Padding vertical</span>
                        <span className="admin-accent-text">{block.props?.styles?.paddingY || '16'}px</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="120"
                        step="4"
                        value={block.props?.styles?.paddingY || 16}
                        onChange={(event) => handleStyleChange('paddingY', event.target.value)}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                    />
                </div>
            </div>

            {(block.props?.image || block.props?.backgroundImage) ? (
                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Media (imagen)</SectionHeading>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all hover:border-white/20">
                        {(block.props?.image || block.props?.backgroundImage) ? (
                            <img
                                src={block.props?.image || block.props?.backgroundImage}
                                alt="Preview"
                                className="h-full w-full object-cover opacity-60"
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center space-y-2 text-zinc-600">
                                <ImageIcon size={24} weight="bold" />
                                <span className="text-[10px]">Sin imagen</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );

    const renderBlockEditor = () => {
        if (isHeroBlock) {
            return isHeroClassic ? renderHeroClassicEditor() : renderHeroSlidesEditor();
        }
        if (isBrandMarqueeBlock) return renderBrandMarqueeEditor();
        if (isFeaturedBlock) return renderFeaturedEditor();
        if (isServicesBlock) return renderServicesEditor();
        if (isAboutHeroBlock) return renderAboutHeroEditor();
        if (isAboutMissionBlock) return renderAboutMissionEditor();
        if (isAboutStatsBlock) return renderAboutStatsEditor();
        if (isAboutValuesBlock) return renderAboutValuesEditor();
        if (isAboutTeamBlock) return renderAboutTeamEditor();
        if (isAboutCtaBlock) return renderAboutCtaEditor();
        return renderGenericEditor();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                    {block.enabled ? (
                        <Eye size={16} weight="bold" className="text-emerald-500" />
                    ) : (
                        <EyeOff size={16} weight="bold" className="text-zinc-500" />
                    )}
                    <span className="text-xs font-medium text-white">Visible en la tienda</span>
                </div>
                <button
                    onClick={() => onChange({ ...block, enabled: !block.enabled })}
                    className={cn(
                        'relative h-5 w-10 rounded-full transition-all',
                        block.enabled ? 'bg-evolution-indigo' : 'bg-zinc-700'
                    )}
                >
                    <div
                        className={cn(
                            'absolute top-1 h-3 w-3 rounded-full bg-white transition-all',
                            block.enabled ? 'left-6' : 'left-1'
                        )}
                    />
                </button>
            </div>

            {(isHeroBlock || isFeaturedBlock) ? (
                <div className={panelClass}>
                    <SectionHeading icon={Layout}>Plantilla</SectionHeading>

                    {isHeroBlock ? (
                        <>
                            <select
                                value={heroVariant}
                                onChange={(event) => handleHeroVariantChange(event.target.value)}
                                className={selectFieldClass}
                            >
                                {HERO_VARIANT_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value} className="bg-zinc-900">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-zinc-400">
                                Ejemplo activo: {HERO_EXAMPLE_BY_VARIANT[heroVariant] || 'Hero'}
                            </p>
                        </>
                    ) : null}

                    {isFeaturedBlock ? (
                        <>
                            <select
                                value={featuredVariant}
                                onChange={(event) => handleFeaturedVariantChange(event.target.value)}
                                className={selectFieldClass}
                            >
                                {FEATURED_VARIANT_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value} className="bg-zinc-900">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-zinc-400">
                                Ejemplo activo: {FEATURED_EXAMPLE_BY_VARIANT[featuredVariant] || 'Destacados'}
                            </p>
                        </>
                    ) : null}
                </div>
            ) : null}

            {renderBlockEditor()}
        </div>
    );
};

export default BlockPropertiesEditor;
