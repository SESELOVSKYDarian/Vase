import React, { useRef, useState } from 'react';
import { ImageSquare, FilmSlate, LinkSimple, UploadSimple, Trash, ArrowsClockwise, Warning } from '@phosphor-icons/react';
import { fileMatches, isInlineData, mediaName } from '../../../utils/mediaField';
import './mediaField.css';

// Campo de foto o video: muestra cómo queda, se puede arrastrar el archivo o tocar para elegirlo,
// cambiarlo, quitarlo o pegar un link. onFile recibe el archivo; onChange recibe el link.
export default function MediaField({ label, value, onChange, onFile, busy = false, kind = 'image', accept, hint, large = false, placeholder = 'https://…' }) {
    const inputRef = useRef(null);
    const [over, setOver] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [rejected, setRejected] = useState('');
    const isVideo = kind === 'video';
    const types = accept || (isVideo ? 'video/*' : 'image/*');
    const current = String(value || '').trim();
    const Icon = isVideo ? FilmSlate : ImageSquare;
    const noun = isVideo ? 'un video' : 'una imagen';

    const take = (file) => {
        if (!file) return;
        if (!fileMatches(file, types)) {
            setRejected(isVideo ? 'Ese archivo no es un video.' : types === 'image/png' ? 'Tiene que ser una imagen PNG.' : 'Ese archivo no es una imagen.');
            return;
        }
        setRejected('');
        onFile?.(file);
    };

    const pick = () => { if (!busy) inputRef.current?.click(); };

    return (
        <div className="mf">
            {label ? <span className="mf-label">{label}</span> : null}
            <div
                className={`mf-zone ${current ? 'has' : ''} ${over ? 'over' : ''} ${busy ? 'busy' : ''} ${large ? 'large' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={current ? `Cambiar ${noun}` : `Subir ${noun}`}
                onClick={() => { if (!current) pick(); }}
                onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !current) { event.preventDefault(); pick(); } }}
                onDragOver={(event) => { event.preventDefault(); if (!busy) setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(event) => { event.preventDefault(); setOver(false); if (!busy) take(event.dataTransfer.files?.[0]); }}
            >
                {current ? (
                    <>
                        <div className="mf-prev">
                            {isVideo
                                ? <video src={current} muted loop playsInline autoPlay preload="metadata" />
                                : <img src={current} alt="" />}
                        </div>
                        <div className="mf-bar">
                            <span className="mf-name" title={isInlineData(current) ? '' : current}>{mediaName(current)}</span>
                            <button type="button" className="mf-btn" onClick={(event) => { event.stopPropagation(); pick(); }} disabled={busy}><ArrowsClockwise size={13} weight="bold" />Cambiar</button>
                            <button type="button" className="mf-btn del" onClick={(event) => { event.stopPropagation(); onChange(''); }} disabled={busy} aria-label={`Quitar ${noun}`}><Trash size={13} weight="bold" /></button>
                        </div>
                    </>
                ) : (
                    <div className="mf-empty">
                        <span className="mf-ic"><Icon size={22} weight="duotone" /></span>
                        <b>Arrastrá {noun} acá</b>
                        <span>o <u>{isVideo ? 'tocá para elegirlo' : 'tocá para elegirla'}</u>{isVideo ? ' · MP4 o WebM' : ' · JPG, PNG o WebP'}</span>
                    </div>
                )}
                {over ? <div className="mf-drop"><UploadSimple size={20} weight="bold" />Soltalo para subir</div> : null}
                {busy ? <div className="mf-drop"><span className="mf-spin" />Subiendo…</div> : null}
            </div>
            <input ref={inputRef} type="file" accept={types} hidden onChange={(event) => { take(event.target.files?.[0]); event.target.value = ''; }} />

            {rejected ? <p className="mf-warn">{rejected}</p> : null}
            {isInlineData(current) ? (
                <p className="mf-warn"><Warning size={13} weight="bold" />Este archivo quedó guardado dentro de la página y la hace más pesada. Tocá Cambiar y volvé a subirlo para que la tienda cargue más rápido.</p>
            ) : null}
            {hint ? <p className="mf-hint">{hint}</p> : null}

            <button type="button" className="mf-linkt" onClick={() => setLinkOpen((open) => !open)} aria-expanded={linkOpen}>
                <LinkSimple size={13} weight="bold" />{linkOpen ? 'Ocultar el link' : 'Pegar un link'}
            </button>
            {linkOpen ? (
                <input
                    className="mf-link"
                    value={isInlineData(current) ? '' : current}
                    placeholder={isInlineData(current) ? 'El archivo está dentro de la página: pegá un link para reemplazarlo' : placeholder}
                    onChange={(event) => onChange(event.target.value)}
                    aria-label={`Link de ${noun}`}
                />
            ) : null}
        </div>
    );
}
