import React, { useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { Modal } from './Overlays';
import { uploadPublicFile } from '../../utils/uploadsClient';

const STORE_PAGES = [
    { label: 'Inicio', href: '/', hint: 'página' },
    { label: 'Catálogo', href: '/catalog', hint: 'página' },
    { label: 'Nosotros', href: '/about', hint: 'página' },
    { label: 'Registrarse', href: '/register', hint: 'página' },
    { label: 'Términos y condiciones', href: '/terms', hint: 'página' },
];

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Devuelve las opciones agrupadas para el selector de enlaces, filtradas por lo que se busca.
export function buildLinkOptions({ categories = [], products = [], whatsapp = '', query = '' }) {
    const q = normalize(query);
    const match = (text) => !q || normalize(text).includes(q);
    const groups = [
        { label: 'Páginas', items: STORE_PAGES.filter((page) => match(page.label)) },
        {
            label: 'Catálogo',
            items: categories
                .filter((category) => match(category.name))
                .slice(0, q ? 12 : 6)
                .map((category) => ({ label: category.name, href: `/catalog?category=${encodeURIComponent(category.slug || category.id)}`, hint: 'categoría' })),
        },
        {
            label: 'Productos',
            items: q
                ? products.filter((product) => match(product.name)).slice(0, 8).map((product) => ({ label: product.name, href: `/product/${product.id}`, hint: 'producto' }))
                : [],
        },
        {
            label: 'Otros',
            items: [
                ...(whatsapp ? [{ label: 'WhatsApp de ventas', href: `https://wa.me/${String(whatsapp).replace(/\D/g, '')}`, hint: 'whatsapp' }] : []),
            ],
        },
    ];
    return groups.filter((group) => group.items.length);
}

export function describeLink(href, options = []) {
    const value = String(href || '').trim();
    if (!value) return { title: 'Sin enlace', detail: '' };
    const all = options.flatMap((group) => group.items);
    const known = all.find((item) => item.href === value);
    if (known) return { title: known.label, detail: known.hint };
    if (/^https?:/i.test(value)) return { title: 'Dirección externa', detail: value.replace(/^https?:\/\//i, '') };
    return { title: value, detail: 'enlace' };
}

// Campo "Lleva a": muestra a dónde lleva y abre un buscador con páginas, categorías, productos o una URL.
export function LinkPicker({ value, onChange, categories, products, whatsapp, label = 'Lleva a' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const groups = useMemo(() => buildLinkOptions({ categories, products, whatsapp, query }), [categories, products, whatsapp, query]);
    const current = describeLink(value, buildLinkOptions({ categories, products, whatsapp }));
    const looksLikeUrl = /^https?:\/\/\S+\.\S+/i.test(query.trim());

    return (
        <div className="vp-fld">
            <span className="vp-fl">{label}</span>
            <button type="button" className={`vp-linkf ${open ? 'open' : ''}`} onClick={() => setOpen((state) => !state)} aria-expanded={open}>
                <Icon name="link" size={15} />
                {current.title} {current.detail ? <span>· {current.detail}</span> : null}
                <span className={`vp-chev ${open ? 'open' : ''}`} aria-hidden="true"><Icon name="chevron" size={14} /></span>
            </button>
            {open ? (
                <div className="vp-lmenu">
                    <input className="vp-inp" autoFocus aria-label="Buscar destino" placeholder="Buscá una página, categoría o producto, o pegá una URL" value={query} onChange={(event) => setQuery(event.target.value)} />
                    {looksLikeUrl ? (
                        <button type="button" className="vp-mi" onClick={() => { onChange(query.trim()); setOpen(false); setQuery(''); }}>Usar esta dirección<em>{query.trim()}</em></button>
                    ) : null}
                    {groups.map((group) => (
                        <div key={group.label}>
                            <div className="vp-ml">{group.label}</div>
                            {group.items.map((item) => (
                                <button key={item.href} type="button" className={`vp-mi ${item.href === value ? 'on' : ''}`} onClick={() => { onChange(item.href); setOpen(false); setQuery(''); }}>
                                    {item.label}<em>{item.hint}</em>
                                </button>
                            ))}
                        </div>
                    ))}
                    {!groups.length && !looksLikeUrl ? <div className="vp-empty">No encontramos nada con “{query}”.</div> : null}
                </div>
            ) : null}
        </div>
    );
}

// Ventana para elegir imagen: subir desde el equipo (o arrastrar), elegir de la biblioteca o pegar una URL.
export function ImagePickerModal({ open, onClose, onPick, library = [], theme }) {
    const [selected, setSelected] = useState('');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [over, setOver] = useState(false);
    const inputRef = useRef(null);

    const upload = async (file) => {
        if (!file) return;
        setBusy(true);
        setError('');
        try {
            const publicUrl = await uploadPublicFile(file);
            onPick(publicUrl);
            onClose();
        } catch (err) {
            setError('No se pudo subir la imagen. Probá de nuevo o pegá una dirección.');
        } finally {
            setBusy(false);
        }
    };

    const choice = url.trim() || selected;
    return (
        <Modal
            open={open}
            onClose={onClose}
            theme={theme}
            wide
            title="Elegir imagen"
            description="Subila desde tu equipo, elegí una que ya usaste o pegá una dirección."
            footer={<>
                <button type="button" className="vp-btn soft" onClick={onClose}>Cancelar</button>
                <button type="button" className="vp-btn acc" disabled={!choice} onClick={() => { onPick(choice); onClose(); }}>Usar esta imagen</button>
            </>}
        >
            <div
                className={`vp-drop ${over ? 'over' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(event) => { event.preventDefault(); setOver(false); upload(event.dataTransfer.files?.[0]); }}
            >
                <b>Arrastrá una foto acá</b>o
                <button type="button" className="vp-btn ink sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                    <Icon name="upload" size={14} />{busy ? 'Subiendo…' : 'Subir desde el equipo'}
                </button>
                <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => upload(event.target.files?.[0])} />
                <span style={{ fontSize: 12 }}>JPG, PNG o WebP</span>
            </div>
            {error ? <div className="vp-note" style={{ color: 'var(--red)' }}>{error}</div> : null}
            {library.length ? (
                <>
                    <span className="vp-fl">Usadas en tu tienda</span>
                    <div className="vp-lib">
                        {library.slice(0, 12).map((src) => (
                            <button key={src} type="button" className={selected === src ? 'on' : ''} onClick={() => { setSelected(src); setUrl(''); }} aria-label="Elegir esta imagen">
                                <img src={src} alt="" loading="lazy" />
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
            <div className="vp-fld">
                <label htmlFor="vp-img-url">O pegá una dirección (URL)</label>
                <input id="vp-img-url" className="vp-inp" placeholder="https://…" value={url} onChange={(event) => setUrl(event.target.value)} />
            </div>
        </Modal>
    );
}
