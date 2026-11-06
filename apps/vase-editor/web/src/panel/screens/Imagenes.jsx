import React, { useMemo, useRef, useState } from 'react';
import { uploadPublicFile } from '../../utils/uploadsClient';
import { collectStoreImages, fileName } from '../media';

// Las fotos de producto se llaman por el producto, no por el archivo.
const imageTitle = (image) => (/\/public\/products\//.test(image.src) && image.where[0] ? image.where[0] : fileName(image.src));

const GROUPS = [
    ['todas', 'Todas'],
    ['productos', 'Productos'],
    ['paginas', 'Páginas'],
    ['marca', 'Logo, colores y catálogo'],
    ['subidas', 'Subidas ahora'],
];

// Imágenes: todas las fotos que usa la tienda en un lugar y subida de fotos nuevas.
export default function Imagenes({ editor, toast }) {
    const [group, setGroup] = useState('todas');
    const [query, setQuery] = useState('');
    const [uploaded, setUploaded] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const images = useMemo(() => [
        ...uploaded.map((src) => ({ src, groups: ['subidas'], where: ['Recién subida'] })),
        ...collectStoreImages({ settings: editor.settings, pageSections: editor.pageSections, products: editor.products, categories: editor.categories }),
    ], [editor.settings, editor.pageSections, editor.products, editor.categories, uploaded]);

    const counts = useMemo(() => Object.fromEntries(GROUPS.map(([id]) => [id, id === 'todas' ? images.length : images.filter((image) => image.groups.includes(id)).length])), [images]);
    const q = query.trim().toLowerCase();
    const rows = images
        .filter((image) => group === 'todas' || image.groups.includes(group))
        .filter((image) => !q || `${fileName(image.src)} ${image.where.join(' ')}`.toLowerCase().includes(q));

    const upload = async (files) => {
        const list = [...(files || [])].filter((file) => file.type.startsWith('image/'));
        if (!list.length) return;
        setUploading(true);
        try {
            for (const file of list) {
                const result = await uploadPublicFile(file);
                const url = result?.url || result?.public_url || result;
                if (typeof url === 'string') setUploaded((all) => [url, ...all]);
            }
            setGroup('subidas');
            toast(list.length > 1 ? `${list.length} imágenes subidas` : 'Imagen subida. Copiá el link para usarla.', 'success');
        } catch (err) {
            toast(`No se pudo subir: ${err.message || 'error'}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    const copy = (src) => {
        const absolute = src.startsWith('/') ? `${window.location.origin}${src}` : src;
        navigator.clipboard?.writeText(absolute);
        toast('Link copiado', 'success');
    };

    return (
        <div className="vp-scol">
            <div
                className={`vp-drop ${dragOver ? 'over' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => { event.preventDefault(); setDragOver(false); upload(event.dataTransfer.files); }}
            >
                <b>{uploading ? 'Subiendo…' : 'Arrastrá fotos acá o subilas desde tu compu o celular'}</b>
                <span className="vp-note">JPG, PNG o WebP. Para que carguen rápido, mejor de hasta 2000 px.</span>
                <button type="button" className="vp-btn acc sm" disabled={uploading} onClick={() => inputRef.current?.click()}>Subir imágenes</button>
                <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { upload(event.target.files); event.target.value = ''; }} />
            </div>
            <div className="vp-fbar">
                <label className="vp-search"><input placeholder="Buscar por nombre o dónde se usa" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar imágenes" /></label>
                {GROUPS.filter(([id]) => id !== 'subidas' || uploaded.length).map(([id, label]) => (
                    <button key={id} type="button" className={`vp-fp ${group === id ? 'on' : ''}`} onClick={() => setGroup(id)}>{label} <em>{counts[id] || 0}</em></button>
                ))}
            </div>
            {!rows.length ? <div className="vp-empty">No hay imágenes en este filtro.</div> : null}
            <div className="vp-libgrid">
                {rows.slice(0, 240).map((image) => (
                    <div key={image.src} className="vp-lcard">
                        <img src={image.src} alt="" loading="lazy" />
                        <div>
                            <b title={imageTitle(image)}>{imageTitle(image)}</b>
                            <span title={image.where.join(', ')}>{image.where.slice(0, 2).join(', ')}{image.where.length > 2 ? ` y ${image.where.length - 2} más` : ''}</span>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button type="button" className="vp-btn soft sm" onClick={() => copy(image.src)}>Copiar link</button>
                                <a className="vp-btn line sm" href={image.src} target="_blank" rel="noreferrer">Ver</a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {rows.length > 240 ? <span className="vp-note">Se muestran 240 de {rows.length}. Usá el buscador para encontrar una.</span> : null}
        </div>
    );
}
