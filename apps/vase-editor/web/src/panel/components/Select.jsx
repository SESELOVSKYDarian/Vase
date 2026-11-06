import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const SEARCH_FROM = 10;
const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Selector del panel: reemplaza al <select> del navegador con la misma estética del panel.
// options: [{ value, label, depth?, hint? }]. onChange recibe el valor (no el evento).
export default function Select({ value, onChange, options = [], id, ariaLabel, variant = 'inp', disabled = false, placeholder = 'Elegí una opción', className = '', style }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [query, setQuery] = useState('');
    const [place, setPlace] = useState(null);
    const triggerRef = useRef(null);
    const listRef = useRef(null);
    const typed = useRef({ text: '', at: 0 });
    const listId = useId();

    const current = options.find((option) => String(option.value) === String(value ?? ''));
    const searchable = options.length >= SEARCH_FROM;
    const shown = useMemo(() => {
        const q = normalize(query.trim());
        return q ? options.filter((option) => normalize(option.label).includes(q)) : options;
    }, [options, query]);

    const close = (focus = true) => {
        setOpen(false);
        setQuery('');
        if (focus) triggerRef.current?.focus();
    };
    const choose = (option) => {
        if (!option || option.disabled) return;
        if (String(option.value) !== String(value ?? '')) onChange?.(option.value);
        close();
    };
    const openList = () => {
        if (disabled) return;
        const index = Math.max(0, options.findIndex((option) => String(option.value) === String(value ?? '')));
        setActive(index);
        setOpen(true);
    };

    // Ubica la lista debajo del botón (o arriba si no entra) y la sigue si se mueve la pantalla.
    useLayoutEffect(() => {
        if (!open) return undefined;
        const measure = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const below = window.innerHeight - rect.bottom - 12;
            const above = rect.top - 12;
            const wanted = Math.min(320, (shown.length || 1) * 40 + (searchable ? 52 : 0) + 12);
            const up = below < Math.min(wanted, 220) && above > below;
            const width = Math.max(rect.width, variant === 'inp' ? 0 : 180);
            const left = Math.min(rect.left, window.innerWidth - width - 8);
            setPlace({ left: Math.max(8, left), width, up, top: up ? undefined : rect.bottom + 6, bottom: up ? window.innerHeight - rect.top + 6 : undefined, maxHeight: Math.max(160, Math.min(320, up ? above : below)) });
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [open, shown.length, searchable, variant]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => {
            if (triggerRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
            close(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [open, active]);

    const onKeyDown = (event) => {
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
                event.preventDefault();
                openList();
            }
            return;
        }
        const last = shown.length - 1;
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'Tab') close(false);
        else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(last, index + 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
        else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
        else if (event.key === 'End') { event.preventDefault(); setActive(last); }
        else if (event.key === 'Enter' || (event.key === ' ' && !searchable)) { event.preventDefault(); choose(shown[active]); }
        else if (!searchable && event.key.length === 1) {
            // Escribir salta a la opción que empieza con esas letras.
            const now = Date.now();
            typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + normalize(event.key), at: now };
            const index = shown.findIndex((option) => normalize(option.label).trimStart().startsWith(typed.current.text));
            if (index >= 0) setActive(index);
        }
    };

    const theme = triggerRef.current?.closest('[data-theme]')?.getAttribute('data-theme') || 'light';

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`vp-sel ${variant} ${open ? 'open' : ''} ${className}`}
                style={style}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                onClick={() => (open ? close() : openList())}
                onKeyDown={onKeyDown}
            >
                <span className={`v ${current ? '' : 'ph'}`}>{current ? current.label : placeholder}</span>
                <Icon name="chevron" size={15} className="ch" />
            </button>
            {open && place ? createPortal(
                <div className="vp" data-theme={theme} style={{ position: 'static', background: 'none', display: 'contents' }}>
                    <div
                        ref={listRef}
                        className={`vp-selpop ${place.up ? 'up' : ''}`}
                        style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
                    >
                        {searchable ? (
                            <div className="vp-selsearch">
                                <Icon name="search" size={14} />
                                <input autoFocus aria-label="Buscar opción" placeholder="Buscar…" value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} />
                            </div>
                        ) : null}
                        <ul id={listId} role="listbox" aria-label={ariaLabel} tabIndex={-1}>
                            {shown.map((option, index) => {
                                const selected = String(option.value) === String(value ?? '');
                                return (
                                    <li
                                        key={`${option.value}`}
                                        data-index={index}
                                        role="option"
                                        aria-selected={selected}
                                        aria-disabled={option.disabled || undefined}
                                        className={`${index === active ? 'act' : ''} ${selected ? 'sel' : ''} ${option.disabled ? 'dis' : ''}`}
                                        style={option.depth ? { paddingLeft: 12 + option.depth * 16 } : undefined}
                                        onMouseEnter={() => setActive(index)}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => choose(option)}
                                    >
                                        <span className="l">{option.label}{option.hint ? <em>{option.hint}</em> : null}</span>
                                        {selected ? <svg className="ck" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg> : null}
                                    </li>
                                );
                            })}
                            {!shown.length ? <li className="none" role="presentation">No hay coincidencias</li> : null}
                        </ul>
                    </div>
                </div>,
                document.body
            ) : null}
        </>
    );
}
