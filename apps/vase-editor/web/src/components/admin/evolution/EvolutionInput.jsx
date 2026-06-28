import React from 'react';
import { cn } from '../../../utils/cn';

const EvolutionInput = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    className,
    error,
    disabled,
    multiline = false,
    helperText,
    required = false,
    ...props
}) => {
    const baseFieldClass = cn(
        "admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200",
        disabled && "opacity-50 cursor-not-allowed",
        error && "border-red-400/70 ring-2 ring-red-500/30"
    );

    return (
        <div className={cn("space-y-1.5 group/input", className)}>
            {label && (
                <label className="admin-input-label text-[11px] font-bold tracking-wide pl-0.5 transition-colors group-focus-within/input:text-[var(--admin-accent)]">
                    {label} {required ? <span className="text-rose-300">*</span> : null}
                </label>
            )}

            {multiline ? (
                <textarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(baseFieldClass, "min-h-[96px] resize-y")}
                    {...props}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={baseFieldClass}
                    {...props}
                />
            )}

            {helperText ? <p className="text-[11px] text-zinc-400">{helperText}</p> : null}
            {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
        </div>
    );
};

export default EvolutionInput;
