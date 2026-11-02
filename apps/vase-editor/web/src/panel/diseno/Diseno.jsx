import React, { useMemo, useState } from 'react';
import PageBuilder from '../../components/PageBuilder';
import ResponsivePreviewFrame from '../../components/admin/evolution/ResponsivePreviewFrame';
import BlockPropertiesEditor from '../../components/admin/evolution/BlockPropertiesEditor';
import CatalogPageEditor from '../../components/admin/evolution/CatalogPageEditor';
import AppearanceEditor from '../../components/admin/evolution/AppearanceEditor';
import { DEFAULT_ABOUT_SECTIONS, DEFAULT_HOME_SECTIONS, PIQUIM_ABOUT_SECTIONS, PIQUIM_HOME_SECTIONS } from '../../data/defaultSections';
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../utils/productImage';
import { Modal } from '../components/Overlays';
import { productThumb } from '../catalog/model';
import { BLOCK_TYPES, blockLabel, blockSummary, createBlock, editorPageKey, moveBlock, removeBlock, replaceBlock, toggleBlock } from './model';
import './diseno.css';

const PAGES = [
    ['home', 'Inicio'],
    ['about', 'Nosotros'],
    ['catalogo', 'Catálogo'],
    ['apariencia', 'Colores, logo y pie'],
];

const TEMPLATES = {
    home: DEFAULT_HOME_SECTIONS,
    about: DEFAULT_ABOUT_SECTIONS,
    'piquim-home': PIQUIM_HOME_SECTIONS,
    'piquim-about': PIQUIM_ABOUT_SECTIONS,
};

const previewProduct = (product) => ({
    id: product.id,
    sku: product.sku || '',
    name: product.name || 'Producto',
    price: Number(product.price || 0),
    image: productThumb(product) || PRODUCT_PLACEHOLDER_IMAGE,
    alt: product.name || 'Producto',
    stock: Number(product.stock ?? 0),
    is_featured: Boolean(product.is_featured),
});

// Diseño de la tienda: bloques a la izquierda, la página en el medio y lo que se edita a la derecha.
export default function Diseno({ editor, isPiquim, theme, toast, onPublish }) {
    const [page, setPage] = useState('home');
    const [selectedId, setSelectedId] = useState(null);
    const [viewport, setViewport] = useState('desktop');
    const [showBlocks, setShowBlocks] = useState(true);
    const [showInspector, setShowInspector] = useState(true);
    const [adding, setAdding] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [dragIndex, setDragIndex] = useState(null);

    const isBlocksPage = page === 'home' || page === 'about';
    const pageKey = editorPageKey(page, isPiquim);
    const blocks = isBlocksPage && Array.isArray(editor.pageSections?.[page]) ? editor.pageSections[page] : [];
    const selected = blocks.find((block) => block.id === selectedId) || null;

    const setBlocks = (updater) => editor.setPageSections((prev) => {
        const current = Array.isArray(prev?.[page]) ? prev[page] : [];
        return { ...prev, [page]: typeof updater === 'function' ? updater(current) : updater };
    });

    const featured = useMemo(() => (editor.products || []).filter((product) => product.is_featured).slice(0, 8).map(previewProduct), [editor.products]);
    const previewSections = useMemo(() => blocks
        .filter((block) => block.enabled !== false)
        .map((block) => ({
            ...block,
            props: {
                ...(block.props || {}),
                ...(block.type === 'FeaturedProducts' || block.type === 'PiquimFeaturedProducts' ? { products: featured } : {}),
            },
        })), [blocks, featured]);

    const add = (type) => {
        const block = createBlock(type, TEMPLATES[pageKey] || []);
        setBlocks((list) => [...list, block]);
        setSelectedId(block.id);
        setShowInspector(true);
        setAdding(false);
    };

    const big = !showBlocks && !showInspector;
    const switchPage = (id) => { setPage(id); setSelectedId(null); setAdding(false); };

    return (
        <div className="vp-page vp-dz">
            <div className="vp-dzbar">
                <div className="vp-tabs2" role="tablist" aria-label="Páginas de la tienda">
                    {PAGES.map(([id, label]) => (
                        <button key={id} type="button" role="tab" aria-selected={page === id} className={`vp-t2 ${page === id ? 'on' : ''}`} onClick={() => switchPage(id)}>{label}</button>
                    ))}
                </div>
                <div className="vp-sp" />
                {isPiquim ? <span className="vp-tag g" title="Tu tienda usa un diseño hecho a medida"><i />Plantilla personalizada</span> : null}
                {isBlocksPage ? (
                    <>
                        <div className="vp-seg" style={{ width: 180 }}>
                            <button type="button" className={viewport === 'desktop' ? 'on' : ''} onClick={() => setViewport('desktop')}>Compu</button>
                            <button type="button" className={viewport === 'mobile' ? 'on' : ''} onClick={() => setViewport('mobile')}>Celular</button>
                        </div>
                        <button type="button" className={`vp-btn ${showBlocks ? 'soft' : 'line'} sm`} onClick={() => setShowBlocks((value) => !value)}>Bloques</button>
                        <button type="button" className={`vp-btn ${showInspector ? 'soft' : 'line'} sm`} onClick={() => setShowInspector((value) => !value)}>Editar</button>
                        <button type="button" className="vp-btn line sm" onClick={() => { setShowBlocks(big); setShowInspector(big); }}>{big ? 'Ver paneles' : 'Pantalla grande'}</button>
                    </>
                ) : null}
            </div>

            {isBlocksPage ? (
                <div className={`vp-dzgrid ${showBlocks ? '' : 'no-l'} ${showInspector ? '' : 'no-r'}`}>
                    {showBlocks ? (
                        <aside className="vp-dzl" aria-label="Bloques de la página">
                            <div className="vp-dzh"><b>Bloques</b><button type="button" className="vp-btn acc sm" onClick={() => setAdding((value) => !value)}>+ Agregar</button></div>
                            {adding ? (
                                <div className="vp-dzadd">
                                    {(BLOCK_TYPES[pageKey] || []).map(([type, label]) => (
                                        <button key={type} type="button" className="vp-mi" onClick={() => add(type)}>{label}</button>
                                    ))}
                                </div>
                            ) : null}
                            <div className="vp-dzlist">
                                {blocks.map((block, index) => (
                                    <div
                                        key={block.id || index}
                                        className={`vp-dzb ${selectedId === block.id ? 'on' : ''} ${block.enabled === false ? 'off' : ''} ${dragIndex === index ? 'drag' : ''}`}
                                        draggable
                                        onDragStart={() => setDragIndex(index)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => { if (dragIndex !== null) setBlocks((list) => moveBlock(list, dragIndex, index)); setDragIndex(null); }}
                                        onDragEnd={() => setDragIndex(null)}
                                    >
                                        <span className="grip" aria-hidden="true">⋮⋮</span>
                                        <button type="button" className="g" onClick={() => { setSelectedId(block.id); setShowInspector(true); }}>
                                            <b>{blockLabel(pageKey, block.type)}</b>
                                            <span>{block.enabled === false ? 'Oculto' : blockSummary(block) || 'Visible'}</span>
                                        </button>
                                        <div className="acts">
                                            <button type="button" aria-label="Subir" disabled={index === 0} onClick={() => setBlocks((list) => moveBlock(list, index, index - 1))}>↑</button>
                                            <button type="button" aria-label="Bajar" disabled={index === blocks.length - 1} onClick={() => setBlocks((list) => moveBlock(list, index, index + 1))}>↓</button>
                                            <button type="button" aria-label={block.enabled === false ? 'Mostrar' : 'Ocultar'} onClick={() => setBlocks((list) => toggleBlock(list, block.id))}>{block.enabled === false ? '◌' : '●'}</button>
                                            <button type="button" aria-label="Eliminar" className="del" onClick={() => setConfirmDelete(block)}>×</button>
                                        </div>
                                    </div>
                                ))}
                                {!blocks.length ? <div className="vp-note" style={{ padding: 12 }}>Esta página todavía no tiene bloques.</div> : null}
                            </div>
                            <span className="vp-note" style={{ padding: '8px 4px' }}>Arrastrá para ordenar. Los ocultos no se ven en la tienda.</span>
                        </aside>
                    ) : null}

                    <section className="vp-dzc" aria-label="Vista previa">
                        <div className={`vp-dzframe ${viewport}`}>
                            <ResponsivePreviewFrame viewport={viewport}>
                                <PageBuilder sections={previewSections} />
                            </ResponsivePreviewFrame>
                        </div>
                    </section>

                    {showInspector ? (
                        <aside className="vp-dzr" aria-label="Editar bloque">
                            {selected ? (
                                <>
                                    <div className="vp-dzh"><b>{blockLabel(pageKey, selected.type)}</b><button type="button" className="vp-x" aria-label="Cerrar" onClick={() => setSelectedId(null)}>×</button></div>
                                    <div className="vp-legacy">
                                        <BlockPropertiesEditor key={selected.id} block={selected} onChange={(next) => setBlocks((list) => replaceBlock(list, { ...selected, ...next, id: selected.id }))} />
                                    </div>
                                </>
                            ) : (
                                <div className="vp-dzempty">
                                    <b>Elegí un bloque</b>
                                    <span>Tocá un bloque de la lista para cambiar sus textos, fotos, botones y links.</span>
                                </div>
                            )}
                        </aside>
                    ) : null}
                </div>
            ) : (
                <div className="vp-body">
                    <div className="vp-legacy vp-dzform">
                        {page === 'catalogo' ? <CatalogPageEditor settings={editor.settings} setSettings={editor.setSettings} onSave={onPublish} isSaving={editor.saving} /> : null}
                        {page === 'apariencia' ? <AppearanceEditor settings={editor.settings} setSettings={editor.setSettings} onSave={onPublish} isSaving={editor.saving} /> : null}
                    </div>
                </div>
            )}

            <Modal
                open={Boolean(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
                theme={theme}
                title="¿Eliminar este bloque?"
                description="Si solo querés que no se vea un tiempo, ocultalo. Hasta que publiques podés deshacerlo."
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                    <button type="button" className="vp-btn red" onClick={() => { setBlocks((list) => removeBlock(list, confirmDelete.id)); if (selectedId === confirmDelete.id) setSelectedId(null); setConfirmDelete(null); toast('Bloque eliminado. Publicá para que se vea en la tienda.', 'success'); }}>Eliminar</button>
                </>}
            />
        </div>
    );
}
