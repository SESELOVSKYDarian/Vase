import React, { useMemo, useRef, useState } from 'react';
import EvolutionInput from './EvolutionInput';
import { LINK_SUGGESTIONS, describeHref } from '../../../utils/mediaField';
import './mediaField.css';

// Campo de link: mismo uso que EvolutionInput (onChange recibe el evento) y además sugiere las páginas
// de la tienda y avisa a dónde lleva lo que escribiste.
export default function LinkInput({ label, value, onChange, placeholder = '/catalog o https://…', ...props }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const blurTimer = useRef(null);
    const text = String(value || '');
    const info = describeHref(text);
    const options = useMemo(() => {
        const q = text.trim().toLowerCase();
        if (!q) return LINK_SUGGESTIONS;
        const word = q.replace(/^\//, '');
        return LINK_SUGGESTIONS.filter((item) => item.href.startsWith(q) || (word && item.label.toLowerCase().includes(word)));
    }, [text]);

    const choose = (href) => {
        onChange({ target: { value: href } });
        setOpen(false);
        setActive(-1);
    };

    return (
        <div className="lf">
            <div className="lf-row">
                <EvolutionInput
                    {...props}
                    label={label}
                    value={text}
                    placeholder={placeholder}
                    onChange={(event) => { onChange(event); setOpen(true); }}
                    onFocus={() => { clearTimeout(blurTimer.current); setOpen(true); }}
                    onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
                    onKeyDown={(event) => {
                        if (!open) return;
                        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(options.length - 1, index + 1)); }
                        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
                        else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(options[active].href); }
                        else if (event.key === 'Escape') setOpen(false);
                    }}
                    autoComplete="off"
                />
                {open && options.length ? (
                    <div className="lf-menu" role="listbox" aria-label="Páginas de la tienda" onMouseDown={(event) => event.preventDefault()}>
                        {options.map((item, index) => (
                            <button key={item.href} type="button" role="option" aria-selected={text === item.href} className={index === active ? 'act' : ''} onClick={() => choose(item.href)}>
                                {item.label}<em>{item.href}</em>
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
            {text.trim() ? <span className={`lf-info ${info.kind}`}><i />{info.text}</span> : null}
        </div>
    );
}
