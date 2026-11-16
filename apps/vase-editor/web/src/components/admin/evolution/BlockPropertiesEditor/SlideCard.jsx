// Parte de BlockPropertiesEditor.jsx: selectFieldClass, compactFieldClass, HERO_EXAMPLE_BY_VARIANT, FEATURED_EXAMPLE_BY_VARIANT, HERO_CLASSIC_COLOR_FIELDS, SERVICES_ICON_OPTIONS y más.
import { useState } from 'react';
import EvolutionInput from '../EvolutionInput';
import MediaField from '../MediaField';
import LinkInput from '../LinkInput';
import { cn } from '../../../../utils/cn';
import { Trash, UploadSimple } from '@phosphor-icons/react';

export const selectFieldClass =
    'admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200';

export const compactFieldClass =
    'admin-input-field w-full rounded-lg border px-2.5 py-2 text-xs outline-none transition-all duration-200';

export const HERO_EXAMPLE_BY_VARIANT = {
    classic: 'Banner clasico de portada',
    fashion: 'Plantilla editorial de moda',
    home_decor: 'Plantilla estilo hogar / decoracion',
    sanitarios_industrial: 'Plantilla industrial tipo vitrina',
};

export const FEATURED_EXAMPLE_BY_VARIANT = {
    classic: 'Grilla clasica de productos',
    modern: 'Grilla moderna minimalista',
    high_energy: 'Grilla dinamica alta energia',
    luxury: 'Grilla estilo premium / lujo',
};

export const HERO_CLASSIC_COLOR_FIELDS = [
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

export const SERVICES_ICON_OPTIONS = [
    { value: 'support_agent', label: 'Asesoria' },
    { value: 'local_shipping', label: 'Envio' },
    { value: 'construction', label: 'Soporte tecnico' },
    { value: 'package', label: 'Paquete' },
    { value: 'shield', label: 'Confianza' },
];

export const ABOUT_MISSION_ICON_OPTIONS = [
    { value: 'verified', label: 'Verificado' },
    { value: 'eco', label: 'Eficiencia' },
];

export const ABOUT_VALUES_ICON_OPTIONS = [
    { value: 'quality', label: 'Calidad' },
    { value: 'commitment', label: 'Compromiso' },
    { value: 'innovation', label: 'Innovacion' },
];

export const panelClass = 'space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4';

export const createBrandMarqueeItemId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `brand-marquee-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const normalizeColorInputValue = (value, fallback = '#000000') => {
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

// Si el servidor de archivos falla, solo imagenes chicas se guardan embebidas.
export const INLINE_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;

export const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

export const SectionHeading = ({ icon: Icon, children }) => (
    <div data-section-heading="" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
        <Icon size={14} weight="bold" />
        {children}
    </div>
);

export const ColorField = ({ label, value, defaultColor = '#000000', onChange }) => (
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

export const UploadButton = ({ busy, label, onChange, accept = 'image/*' }) => {
    const [over, setOver] = useState(false);
    return (
        <label
            className={cn('mf-up w-fit', over && 'over')}
            onDragOver={(event) => { event.preventDefault(); if (!busy) setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const files = event.dataTransfer?.files;
                if (!busy && files?.length) onChange({ target: { files, value: '' } });
            }}
        >
            <input type="file" accept={accept} onChange={onChange} className="hidden" disabled={busy} />
            <UploadSimple size={14} weight="bold" />
            {busy ? 'Subiendo…' : label}
            {!busy ? <small>o arrastralo acá</small> : null}
        </label>
    );
};

export const SlideCard = ({
    slide,
    index,
    total,
    variant,
    onChange,
    onRemove,
    onFile,
    uploading,
}) => {
    // La portada Industrial no tiene segundo boton: esos datos viejos se muestran como texto de la tarjeta.
    const isIndustrial = variant === 'sanitarios_industrial';
    const text = (label, key, props = {}) => (
        <EvolutionInput label={label} value={slide[key] || ''} onChange={(event) => onChange({ [key]: event.target.value })} {...props} />
    );
    return (
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
                {text('Etiqueta', 'label')}
                {text('Titulo principal', 'title')}
                {text(isIndustrial ? 'Segunda linea del titulo' : 'Subtitulo', 'subtitle')}
                {text('Descripcion', 'description', { multiline: true })}

                {isIndustrial ? (
                    <>
                        {text('Tarjeta: etiqueta superior', 'cardEyebrow')}
                        <EvolutionInput label="Tarjeta: titulo" value={slide.cardTitle || slide.featured || ''} onChange={(event) => onChange({ cardTitle: event.target.value, featured: event.target.value })} />
                        <EvolutionInput label="Texto superior derecho" value={slide.specLabel || slide.secondaryButtonLabel || ''} onChange={(event) => onChange({ specLabel: event.target.value, secondaryButtonLabel: event.target.value })} />
                    </>
                ) : text('Texto destacado', 'featured')}

                <div className="grid grid-cols-2 gap-2">
                    {text('Boton principal', 'primaryButtonLabel')}
                    <LinkInput label="Boton principal: link" value={slide.primaryButtonLink || ''} onChange={(event) => onChange({ primaryButtonLink: event.target.value })} />
                    {isIndustrial ? null : (
                        <>
                            {text('Boton secundario', 'secondaryButtonLabel')}
                            <LinkInput label="Boton secundario: link" value={slide.secondaryButtonLink || ''} onChange={(event) => onChange({ secondaryButtonLink: event.target.value })} />
                        </>
                    )}
                </div>

                <MediaField
                    label="Imagen"
                    value={slide.image || ''}
                    onChange={(value) => onChange({ image: value })}
                    onFile={onFile}
                    busy={uploading}
                    kind="image"
                />
            </div>
        </div>
    );
};
