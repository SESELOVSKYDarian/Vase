import React, { useState } from 'react';

// Imagenes de Piquim (vertical, con el logo ya incluido abajo: se recorta para que no se vea duplicado).
const PIQUIM_PANEL_IMAGES = {
    login: '/piquim/catalogo/card-heladeria-piquim.jpeg',
    signup: '/piquim/catalogo/card-panaderia-piquim.jpeg',
};

export const authLabelClass = 'mb-2 block text-[13px] font-semibold text-[var(--store-text)]';

export const authInputClass =
    'h-12 w-full rounded-xl border border-[var(--store-border)] bg-[var(--store-input-bg)] px-4 text-[15px] text-[var(--store-text)] outline-none transition-colors placeholder:text-[var(--store-muted-text)]/70 focus:border-[var(--store-primary)] focus-visible:ring-2 focus-visible:ring-[var(--store-primary)]/25 disabled:opacity-60';

export const authHelperClass = 'mt-1.5 text-xs leading-5 text-[var(--store-muted-text)]';

export const authErrorTextClass = 'mt-1.5 text-xs font-medium text-red-600 dark:text-red-400';

const buttonBase =
    'inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[15px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-background)] disabled:cursor-not-allowed disabled:opacity-60';

export const authPrimaryButtonClass = `${buttonBase} bg-[var(--store-primary)] text-white hover:brightness-110 active:brightness-95`;

export const authSecondaryButtonClass = `${buttonBase} border border-[var(--store-border)] text-[var(--store-text)] hover:border-[var(--store-text)]`;

export const authLinkButtonClass =
    'text-sm font-semibold text-[var(--store-muted-text)] underline-offset-4 transition-colors hover:text-[var(--store-text)] hover:underline';

export function AuthAlert({ tone = 'error', children }) {
    const tones = {
        error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        info: 'border-[var(--store-border)] bg-[var(--store-surface-soft)] text-[var(--store-muted-text)]',
    };
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm leading-5 ${tones[tone] || tones.info}`}>
            {children}
        </div>
    );
}

function EyeIcon({ open }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            {open ? (
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            ) : (
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </>
            )}
        </svg>
    );
}

// Campo de contrasena con boton para mostrarla u ocultarla.
export function PasswordInput({ className = authInputClass, ...props }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
            <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={visible}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--store-muted-text)] transition-colors hover:text-[var(--store-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-primary)]"
            >
                <EyeIcon open={!visible} />
            </button>
        </div>
    );
}

// Progreso en pasos: texto claro ("Paso 2 de 4") y una barra segmentada, en vez de circulos numerados.
export function StepProgress({ current, labels }) {
    const total = labels.length;
    return (
        <div className="mb-7" role="group" aria-label={`Paso ${current} de ${total}`}>
            <div className="mb-3 flex items-baseline justify-between text-xs">
                <span className="font-semibold uppercase tracking-[0.16em] text-[var(--store-primary)]">{labels[current - 1]}</span>
                <span className="text-[var(--store-muted-text)]">Paso {current} de {total}</span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
                {labels.map((label, index) => (
                    <span
                        key={label}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${index < current ? 'bg-[var(--store-primary)]' : 'bg-[var(--store-border)]'}`}
                    />
                ))}
            </div>
        </div>
    );
}

// Marco comun de login y registro: foto de marca a la izquierda (solo en pantallas grandes) y el formulario
// sin tarjeta a la derecha. En el celular queda solo el formulario.
export default function AuthShell({ variant = 'login', isPiquim = false, brandName = '', eyebrow, title, subtitle, children, footer }) {
    return (
        <div className="grid min-h-[calc(100vh-122px)] bg-[var(--store-background)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <aside className="relative hidden overflow-hidden bg-[var(--store-primary)] lg:block" aria-hidden="true">
                {/* Fijo al alto de la pantalla: si el formulario es largo la foto no se estira ni muestra el logo que trae incluido. */}
                <div className="sticky top-0 h-screen">
                    {isPiquim ? (
                        <img
                            src={PIQUIM_PANEL_IMAGES[variant] || PIQUIM_PANEL_IMAGES.login}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover"
                            style={{ objectPosition: 'center 32%' }}
                        />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-14">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{brandName}</p>
                        <p className="mt-4 max-w-[14ch] text-[52px] font-black leading-[0.95] tracking-[-0.03em]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                            {isPiquim ? 'Materia prima que inspira cada receta.' : brandName}
                        </p>
                    </div>
                </div>
            </aside>

            <section className="flex items-start justify-center px-5 pb-16 pt-8 sm:px-8 lg:items-center lg:px-14 lg:py-16">
                <div className="w-full max-w-[420px]">
                    {eyebrow ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--store-primary)]">{eyebrow}</p> : null}
                    <h1 className="text-[34px] font-black leading-[1.04] tracking-[-0.02em] text-[var(--store-text)] sm:text-[40px]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                        {title}
                    </h1>
                    {subtitle ? <p className="mt-3 text-[15px] leading-6 text-[var(--store-muted-text)]">{subtitle}</p> : null}
                    <div className="mt-8">{children}</div>
                    {footer ? <div className="mt-8 border-t border-[var(--store-border)] pt-6 text-sm text-[var(--store-muted-text)]">{footer}</div> : null}
                </div>
            </section>
        </div>
    );
}
