// Parte de AppearanceEditor.jsx: fieldClass, GENERIC_FOOTER_DEFAULTS, paletteLabelMap, PaletteChip, ColorField, ThemeModeButton y más.
import { useState } from 'react';
import LinkInput from '../LinkInput';
import { normalizeHex } from '../../../../utils/colorField';

export const fieldClass =
    'admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200';

export const GENERIC_FOOTER_DEFAULTS = {
    shopLinks: [
        { label: 'Catalogo', href: '/catalog' },
        { label: 'Nosotros', href: '/about' },
    ],
    helpLinks: [
        { label: 'Carrito', href: '/cart' },
        { label: 'Terminos', href: '/terms' },
    ],
    legalLinks: [{ label: 'Terminos y condiciones', href: '/terms' }],
    newsletter: {
        enabled: false,
        title: 'Novedades',
        description: '',
        placeholder: 'tu@email.com',
        buttonLabel: 'Enviar',
    },
};

export const paletteLabelMap = {
    primary: 'Acento',
    background: 'Fondo',
    text: 'Texto',
    secondary: 'Texto secundario',
    shell_bg: 'Shell',
    sidebar_bg: 'Sidebar',
    panel_bg: 'Paneles',
    canvas_bg: 'Canvas',
    muted_text: 'Texto secundario',
};

export const PaletteChip = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className="mt-0.5 font-mono text-xs text-zinc-300">{value}</p>
        </div>
        <span className="h-8 w-8 shrink-0 rounded-lg border border-white/15" style={{ backgroundColor: value }} />
    </div>
);

// Color: muestra grande que abre el selector y el código editable (#ff6a00).
export const ColorField = ({ label, value, onChange }) => {
    const [draft, setDraft] = useState(null);
    const shown = draft ?? String(value || '');
    const commit = () => {
        if (draft === null) return;
        const hex = normalizeHex(draft);
        if (hex) onChange(hex);
        setDraft(null);
    };
    return (
        <div className="cf">
            <label className="cf-sw" style={{ backgroundColor: normalizeHex(value) || '#000000' }} title={`Elegir ${label}`}>
                <input type="color" value={normalizeHex(value) || '#000000'} onChange={(e) => { setDraft(null); onChange(e.target.value); }} aria-label={`Elegir ${label}`} />
            </label>
            <div className="cf-tx">
                <span>{label}</span>
                <input
                    value={shown}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setDraft(null); }}
                    spellCheck={false}
                    aria-label={`Código de ${label}`}
                    className={draft !== null && !normalizeHex(draft) ? 'bad' : ''}
                />
            </div>
        </div>
    );
};

export const ThemeModeButton = ({ active, icon, title, description, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="group relative overflow-hidden rounded-2xl border p-4 text-left transition-all"
        style={{
            backgroundColor: active ? 'var(--admin-accent-soft)' : 'var(--admin-hover)',
            borderColor: active ? 'var(--admin-accent-border)' : 'var(--admin-border-soft)',
            boxShadow: active ? '0 18px 40px rgba(0,0,0,0.18)' : 'none',
        }}
    >
        <div className="flex items-start gap-3">
            <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                    backgroundColor: active ? 'var(--admin-accent)' : 'var(--admin-panel-bg)',
                    borderColor: active ? 'var(--admin-accent-border)' : 'var(--admin-border-soft)',
                    color: active ? 'var(--admin-accent-contrast)' : 'var(--admin-text)',
                }}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.14em] admin-text-primary">{title}</p>
                <p className="mt-1 text-xs leading-relaxed admin-text-muted">{description}</p>
            </div>
        </div>
        {active ? (
            <span className="absolute right-3 top-3 rounded-full bg-[var(--admin-accent)] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--admin-accent-contrast)]">
                Activo
            </span>
        ) : null}
    </button>
);

export const PalettePreview = ({ title, subtitle, colors }) => (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</p>
            {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(colors).map(([key, value]) => (
                <PaletteChip key={key} label={paletteLabelMap[key] || key} value={value} />
            ))}
        </div>
    </div>
);

export const LinkListEditor = ({ title, links, onAdd, onRemove, onChange }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</p>
            <button
                type="button"
                onClick={onAdd}
                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-zinc-300"
            >
                + Anadir
            </button>
        </div>
        <div className="space-y-2">
            {links.map((link, idx) => (
                <div key={`${title}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                    <input
                        type="text"
                        value={link.label || ''}
                        placeholder="Etiqueta"
                        onChange={(e) => onChange(idx, 'label', e.target.value)}
                        className={fieldClass}
                    />
                    <LinkInput
                        value={link.href || ''}
                        placeholder="/catalog o https://…"
                        onChange={(e) => onChange(idx, 'href', e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(idx)}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300"
                    >
                        X
                    </button>
                </div>
            ))}
            {!links.length ? <p className="text-xs text-zinc-500">Sin enlaces configurados.</p> : null}
        </div>
    </div>
);
