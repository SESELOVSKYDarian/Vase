import React from 'react';

const isValidHex = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

const RotateIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);

export default function ThemeAwareColorInput({ label, value, themeFallback, onChange }) {
    const hasOverride = isValidHex(value);
    const fallback = isValidHex(themeFallback) ? themeFallback : '#000000';
    const effective = hasOverride ? value : fallback;

    const handlePick = (event) => {
        onChange(event.target.value);
    };

    const handleReset = () => {
        onChange('');
    };

    return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <span className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-zinc-300">{label}</span>
                {!hasOverride ? (
                    <span className="text-[9px] uppercase tracking-widest text-emerald-300/80">Hereda de Paleta base</span>
                ) : null}
            </span>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={effective}
                    onChange={handlePick}
                    className="h-8 w-9 cursor-pointer rounded-lg border-none bg-transparent"
                    aria-label={label}
                />
                <span className="min-w-[70px] text-right font-mono text-[10px] uppercase text-zinc-500">
                    {effective}
                </span>
                {hasOverride ? (
                    <button
                        type="button"
                        onClick={handleReset}
                        title="Volver al color de Paleta base"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                    >
                        <RotateIcon className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </div>
        </label>
    );
}
