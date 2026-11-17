// Parte de BlockPropertiesEditor.jsx: BlockPropertiesEditor.
// partes: ./brand-marquee-editor.jsx, ./hero-classic-editor.jsx, ./services-editor.jsx, ./about-mission-editor.jsx, ./generic-editor.jsx, ./about-hero-editor.jsx, ./about-values-editor.jsx, ./featured-editor.jsx, ./piquim-tres-mundos-editor.jsx, ./about-team-editor.jsx, ./piquim-hero-editor.jsx, ./about-stats-editor.jsx, ./about-cta-editor.jsx, ./hero-slides-editor.jsx, ./piquim-catalog-editor.jsx, ./BlockEditorBody.jsx
import { useMemo, useState } from 'react';
import EvolutionInput from '../EvolutionInput';
import MediaField from '../MediaField';
import LinkInput from '../LinkInput';
import { cn } from '../../../../utils/cn';
import { Eye, EyeSlash as EyeOff, IdentificationCard as Baseline, Image as ImageIcon, Layout, LinkSimple as LinkIcon, Palette, Plus, Stack, Trash } from '@phosphor-icons/react';
import { HERO_COLOR_FIELDS, HERO_THEME_TOKEN_MAP, HERO_VARIANT_OPTIONS, createEmptyHeroSlide, getDefaultHeroSlides, normalizeHeroSlides, normalizeHeroStyles, normalizeHeroVariant } from '../../../../data/heroSliderTemplates';
import { FEATURED_COLOR_FIELDS, FEATURED_THEME_TOKEN_MAP, FEATURED_VARIANT_OPTIONS, normalizeFeaturedStyles, normalizeFeaturedVariant } from '../../../../data/featuredProductsTemplates';
import { useStorefrontThemeColors } from '../../../../context/ThemeContext';
import ThemeAwareColorInput from '../ThemeAwareColorInput';
import { uploadPublicFile } from '../../../../utils/uploadsClient';
import { useToast } from '../../../../context/ToastContext';
import { BRAND_MARQUEE_SPEED_OPTIONS, getDefaultBrandMarqueeProps, normalizeBrandMarqueeItems, normalizeBrandMarqueeSpeed } from '../../../../data/brandMarqueeDefaults';
import { ABOUT_MISSION_ICON_OPTIONS, ABOUT_VALUES_ICON_OPTIONS, ColorField, FEATURED_EXAMPLE_BY_VARIANT, HERO_CLASSIC_COLOR_FIELDS, HERO_EXAMPLE_BY_VARIANT, INLINE_IMAGE_MAX_BYTES, SERVICES_ICON_OPTIONS, SectionHeading, SlideCard, UploadButton, compactFieldClass, createBrandMarqueeItemId, normalizeColorInputValue, panelClass, readFileAsDataUrl, selectFieldClass } from './SlideCard.jsx';

import { makeRenderBrandMarqueeEditor } from './brand-marquee-editor.jsx';
import { makeRenderHeroClassicEditor } from './hero-classic-editor.jsx';
import { makeRenderServicesEditor } from './services-editor.jsx';
import { makeRenderAboutMissionEditor } from './about-mission-editor.jsx';
import { makeRenderGenericEditor } from './generic-editor.jsx';
import { makeRenderAboutHeroEditor } from './about-hero-editor.jsx';
import { makeRenderAboutValuesEditor } from './about-values-editor.jsx';
import { makeRenderFeaturedEditor } from './featured-editor.jsx';
import { makeRenderPiquimTresMundosEditor } from './piquim-tres-mundos-editor.jsx';
import { makeRenderAboutTeamEditor } from './about-team-editor.jsx';
import { makeRenderPiquimHeroEditor } from './piquim-hero-editor.jsx';
import { makeRenderAboutStatsEditor } from './about-stats-editor.jsx';
import { makeRenderAboutCtaEditor } from './about-cta-editor.jsx';
import { makeRenderHeroSlidesEditor } from './hero-slides-editor.jsx';
import { makeRenderPiquimCatalogEditor } from './piquim-catalog-editor.jsx';
import BlockEditorBody from './BlockEditorBody.jsx';
export const BlockPropertiesEditor = ({ block, onChange }) => {
    const [uploadingTarget, setUploadingTarget] = useState('');
    const { addToast } = useToast() || {};

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
    const isPiquimHeroBlock = block.type === 'PiquimHero';
    const isPiquimAnnounceBlock = block.type === 'PiquimAnnounceBar';
    const isPiquimTresMundosBlock = block.type === 'PiquimTresMundos';
    const isPiquimCatalogBlock = block.type === 'PiquimCatalog3Panel';
    const isPiquimFeaturedBlock = block.type === 'PiquimFeaturedProducts';
    const isPiquimCtaBlock = block.type === 'PiquimCTABanner';
    const heroVariant = normalizeHeroVariant(block.props?.variant);
    const featuredVariant = normalizeFeaturedVariant(block.props?.variant);
    const isHeroClassic = isHeroBlock && heroVariant === 'classic';
    const subtitleKey = block.props?.description !== undefined ? 'description' : 'subtitle';

    const heroSlides = useMemo(() => {
        if (!isHeroBlock || isHeroClassic) return [];
        return normalizeHeroSlides(heroVariant, block.props?.slides);
    }, [block.props?.slides, heroVariant, isHeroBlock, isHeroClassic]);

    // La portada Industrial no tiene segundo boton.
    const heroColorFields = (HERO_COLOR_FIELDS[heroVariant] || []).filter((field) => heroVariant !== 'sanitarios_industrial' || !field.key.startsWith('secondaryButton'));
    const featuredColorFields = FEATURED_COLOR_FIELDS[featuredVariant] || [];
    const themeColors = useStorefrontThemeColors();
    const featuredStyles = normalizeFeaturedStyles(featuredVariant, block.props?.styles, themeColors);
    const heroThemeMap = HERO_THEME_TOKEN_MAP[heroVariant] || {};
    const featuredThemeMap = FEATURED_THEME_TOKEN_MAP[featuredVariant] || {};
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
        try {
            await handleFileUpload(target, file, callback);
        } finally {
            if (event.target && 'value' in event.target) event.target.value = '';
        }
    };

    const handleFileUpload = async (target, file, callback) => {
        if (!file) return;
        setUploadingTarget(target);
        try {
            // Se sube al servidor de archivos y se guarda la URL: un base64 dentro de la
            // pagina puede superar el limite al guardar con fotos grandes.
            const publicUrl = await uploadPublicFile(file);
            callback(publicUrl);
        } catch (error) {
            console.error('Image upload failed', error);
            if (file.size <= INLINE_IMAGE_MAX_BYTES) {
                const dataUrl = await readFileAsDataUrl(file).catch(() => '');
                if (dataUrl) {
                    callback(dataUrl);
                    return;
                }
            }
            addToast?.('No se pudo subir el archivo. Proba de nuevo o pega un link.', 'error');
        } finally {
            setUploadingTarget('');
        }
    };

    const renderImageControl = ({ label, value, placeholder = 'https://...', uploadKey, onChange, largePreview = false, accept, hint }) => (
        <MediaField
            label={label}
            value={value}
            onChange={onChange}
            onFile={(file) => handleFileUpload(uploadKey, file, onChange)}
            busy={uploadingTarget === uploadKey}
            kind="image"
            accept={accept}
            hint={hint}
            large={largePreview}
            placeholder={placeholder}
        />
    );

    const renderHeroClassicEditor = makeRenderHeroClassicEditor({ block, handleImageUpload, handlePropChange, handleStyleChange, uploadingTarget });

    const renderHeroSlidesEditor = makeRenderHeroSlidesEditor({ addHeroSlide, block, handleFileUpload, handleStyleChange, heroColorFields, heroSlides, heroThemeMap, heroVariant, removeHeroSlide, themeColors, updateHeroSlide, uploadingTarget });

    const renderFeaturedEditor = makeRenderFeaturedEditor({ block, featuredColorFields, featuredStyles, featuredThemeMap, featuredVariant, handlePropChange, handleStyleChange, themeColors });

    const renderServicesEditor = makeRenderServicesEditor({ block, getArrayProp, handleImageUpload, handlePropChange, handleStyleChange, setArrayProp, updateObjectArrayItem, uploadingTarget });

    const renderBrandMarqueeEditor = makeRenderBrandMarqueeEditor({ block, brandMarqueeDefaults, brandMarqueeItems, brandMarqueeSpeed, handleImageUpload, handlePropChange, handleStyleChange, mergeProps, uploadingTarget });

    const renderAboutHeroEditor = makeRenderAboutHeroEditor({ block, handlePropChange, handleStyleChange, renderImageControl });

    const renderAboutMissionEditor = makeRenderAboutMissionEditor({ block, getArrayProp, handlePropChange, handleStyleChange, renderImageControl, setArrayProp, updateObjectArrayItem, updateStringArrayItem });

    const renderAboutStatsEditor = makeRenderAboutStatsEditor({ block, getArrayProp, handleStyleChange, setArrayProp, updateObjectArrayItem });

    const renderAboutValuesEditor = makeRenderAboutValuesEditor({ block, getArrayProp, handlePropChange, handleStyleChange, setArrayProp, updateObjectArrayItem });

    const renderAboutTeamEditor = makeRenderAboutTeamEditor({ block, handlePropChange, handleStyleChange, renderImageControl });

    const renderAboutCtaEditor = makeRenderAboutCtaEditor({ block, handlePropChange, handleStyleChange });

    const renderVideoControl = ({ label, value, placeholder = 'https://.../video.mp4', uploadKey, onChange }) => (
        <MediaField
            label={label}
            value={value}
            onChange={onChange}
            onFile={(file) => handleFileUpload(uploadKey, file, onChange)}
            busy={uploadingTarget === uploadKey}
            kind="video"
            large
            placeholder={placeholder}
        />
    );

    const renderPiquimHeroEditor = makeRenderPiquimHeroEditor({ block, handlePropChange, renderImageControl, renderVideoControl });

    const renderPiquimAnnounceEditor = () => (
        <div className={panelClass}>
            <SectionHeading icon={Baseline}>Barra de anuncio</SectionHeading>
            <EvolutionInput label="Texto" value={block.props?.text || ''} onChange={(e) => handlePropChange('text', e.target.value)} multiline />
        </div>
    );

    const renderPiquimSimpleCtaEditor = () => (
        <div className={panelClass}>
            <SectionHeading icon={Baseline}>Contenido</SectionHeading>
            <div className="space-y-3">
                <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(e) => handlePropChange('title', e.target.value)} />
                <EvolutionInput label="Subtitulo" value={block.props?.subtitle || ''} onChange={(e) => handlePropChange('subtitle', e.target.value)} multiline />
                <div className="grid grid-cols-2 gap-3">
                    <EvolutionInput label="Boton primario" value={block.props?.primaryLabel || ''} onChange={(e) => handlePropChange('primaryLabel', e.target.value)} />
                    <LinkInput label="Link primario" value={block.props?.primaryHref || ''} onChange={(e) => handlePropChange('primaryHref', e.target.value)} />
                    <EvolutionInput label="Boton secundario" value={block.props?.secondaryLabel || ''} onChange={(e) => handlePropChange('secondaryLabel', e.target.value)} />
                    <LinkInput label="Link secundario" value={block.props?.secondaryHref || ''} onChange={(e) => handlePropChange('secondaryHref', e.target.value)} />
                </div>
            </div>
        </div>
    );

    const renderPiquimTresMundosEditor = makeRenderPiquimTresMundosEditor({ block, handleImageUpload, handlePropChange, uploadingTarget });

    const renderPiquimCatalogEditor = makeRenderPiquimCatalogEditor({ block, getArrayProp, handlePropChange, renderImageControl, updateObjectArrayItem });

    const renderGenericEditor = makeRenderGenericEditor({ block, handlePropChange, handleStyleChange, subtitleKey });

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
        if (isPiquimHeroBlock) return renderPiquimHeroEditor();
        if (isPiquimAnnounceBlock) return renderPiquimAnnounceEditor();
        if (isPiquimTresMundosBlock) return renderPiquimTresMundosEditor();
        if (isPiquimCatalogBlock) return renderPiquimCatalogEditor();
        if (isPiquimFeaturedBlock) return renderPiquimSimpleCtaEditor();
        if (isPiquimCtaBlock) return renderPiquimSimpleCtaEditor();
        return renderGenericEditor();
    };

    return (
        <BlockEditorBody block={block} featuredVariant={featuredVariant} handleFeaturedVariantChange={handleFeaturedVariantChange} handleHeroVariantChange={handleHeroVariantChange} heroVariant={heroVariant} isFeaturedBlock={isFeaturedBlock} isHeroBlock={isHeroBlock} onChange={onChange} renderBlockEditor={renderBlockEditor} />
    );
};
