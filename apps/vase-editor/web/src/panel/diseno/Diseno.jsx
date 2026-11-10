import HistoryButton from '../components/HistoryButton';
import CloudStatus from '../components/CloudStatus';
import React, { useEffect, useMemo, useState } from 'react';
import ResponsivePreviewFrame from '../../components/admin/evolution/ResponsivePreviewFrame';
import CatalogPageEditor from '../../components/admin/evolution/CatalogPageEditor';
import AppearanceEditor from '../../components/admin/evolution/AppearanceEditor';
import { DEFAULT_ABOUT_SECTIONS, DEFAULT_HOME_SECTIONS, PIQUIM_ABOUT_SECTIONS, PIQUIM_HOME_SECTIONS } from '../../data/defaultSections';
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../utils/productImage';
import Icon from '../components/Icon';
import { Modal } from '../components/Overlays';
import { productThumb } from '../catalog/model';
import { BLOCK_TYPES, blockLabel, blockSummary, createBlock, editorPageKey, moveBlock, removeBlock, replaceBlock, toggleBlock } from './model';
import { FOOTER_ID, HEADER_ID, linksSummary, navLinksFromSettings } from './chrome';
import StorePreview from './StorePreview';
import { FooterEditor, HeaderEditor } from './ChromeEditors';
import CatalogTextsEditor from './CatalogTextsEditor';
import LegalEditor from './LegalEditor';
import BlockInspector from './BlockInspector';
import './diseno.css';

const PAGES = [
    ['home', 'Inicio'],
    ['about', 'Nosotros'],
    ['catalogo', 'Catálogo'],
    ['apariencia', 'Colores, logo y pie'],
    ['legales', 'Términos y políticas'],
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

// Diseño de la tienda: bloques a la izquierda, la tienda en el medio (se toca para elegir) y el editor a la derecha.
export default function Diseno({ editor, isPiquim, theme, toast, status, onPublish, publishing, badges, onNotifications, onHelp, onMenu, phone = false }) {
    const [page, setPage] = useState('home');
    const [selectedId, setSelectedId] = useState(null);
    const [viewport, setViewport] = useState('desktop');
    const [showBlocks, setShowBlocks] = useState(true);
    const [showInspector, setShowInspector] = useState(true);
    const [adding, setAdding] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [dragIndex, setDragIndex] = useState(null);
    const [inspTab, setInspTab] = useState('contenido');
    // En celular se ve una cosa a la vez: la lista de bloques, la tienda o el editor.
    const [phoneView, setPhoneView] = useState('preview');

    const isBlocksPage = page === 'home' || page === 'about';
    const pageKey = editorPageKey(page, isPiquim);
    const blocks = isBlocksPage && Array.isArray(editor.pageSections?.[page]) ? editor.pageSections[page] : [];
    const selected = blocks.find((block) => block.id === selectedId) || null;
    const selectedChrome = selectedId === HEADER_ID || selectedId === FOOTER_ID ? selectedId : null;
    const settings = editor.settings || {};
    const pickers = { categories: editor.categories || [], products: editor.products || [], whatsapp: settings.commerce?.whatsapp_number || '' };

    useEffect(() => {
        if (selectedId && !selected && !selectedChrome) setSelectedId(null);
    }, [selectedId, selected, selectedChrome]);

    const setBlocks = (updater) => editor.setPageSections((prev) => {
        const current = Array.isArray(prev?.[page]) ? prev[page] : [];
        return { ...prev, [page]: typeof updater === 'function' ? updater(current) : updater };
    });

    const featured = useMemo(() => (editor.products || []).filter((product) => product.is_featured).slice(0, 8).map(previewProduct), [editor.products]);
    const previewSections = useMemo(() => blocks.map((block) => ({
        ...block,
        props: {
            ...(block.props || {}),
            ...(block.type === 'FeaturedProducts' || block.type === 'PiquimFeaturedProducts' ? { products: featured } : {}),
        },
    })), [blocks, featured]);

    const select = (id) => { setSelectedId(id); setShowInspector(true); setAdding(false); if (phone) setPhoneView('editor'); };
    const add = (type) => {
        const block = createBlock(type, TEMPLATES[pageKey] || []);
        setBlocks((list) => [...list, block]);
        select(block.id);
    };

    const big = !showBlocks && !showInspector;
    const switchPage = (id) => { setPage(id); setSelectedId(null); setAdding(false); };
    const labelFor = (block) => blockLabel(pageKey, block.type);
    const inspectorTitle = selectedId === HEADER_ID ? 'Menú de arriba' : selectedId === FOOTER_ID ? 'Pie de página' : selected ? labelFor(selected) : null;

    const chromeRow = (id, icon, label, summary) => (
        <button type="button" className={`vp-dzb chrome ${selectedId === id ? 'on' : ''}`} onClick={() => select(id)}>
            <span className="bic" aria-hidden="true"><Icon name={icon} size={15} /></span>
            <span className="g"><b>{label}</b><span>{summary}</span></span>
        </button>
    );

    return (
        <div className="vp-page vp-dz">
            <div className="vp-dzbar">
                {onMenu ? <button type="button" className="vp-ibtn vp-menu" onClick={onMenu} aria-label="Abrir el menú"><Icon name="list" size={18} /></button> : null}
                <div className="vp-tabs2" role="tablist" aria-label="Página que estás editando">
                    {PAGES.map(([id, label]) => (
                        <button key={id} type="button" role="tab" aria-selected={page === id} className={`vp-t2 ${page === id ? 'on' : ''}`} onClick={() => switchPage(id)}>{label}</button>
                    ))}
                </div>
                <div className="vp-sp" />
                {isBlocksPage ? (
                    <div className="vp-dztools">
                        <button type="button" className={`vp-ibtn sq ${showBlocks ? 'on' : ''}`} onClick={() => setShowBlocks((value) => !value)} aria-pressed={showBlocks} aria-label="Mostrar u ocultar los bloques" title="Bloques"><Icon name="list" size={17} /></button>
                        <button type="button" className={`vp-ibtn sq ${showInspector ? 'on' : ''}`} onClick={() => setShowInspector((value) => !value)} aria-pressed={showInspector} aria-label="Mostrar u ocultar el editor del bloque" title="Editor del bloque"><Icon name="sliders" size={17} /></button>
                        <button type="button" className="vp-btn line sm" onClick={() => { setShowBlocks(big); setShowInspector(big); }}><Icon name="expand" size={14} />{big ? 'Ver paneles' : 'Pantalla grande'}</button>
                        <div className="vp-seg vp-dev" role="group" aria-label="Vista previa">
                            <button type="button" className={viewport === 'desktop' ? 'on' : ''} onClick={() => setViewport('desktop')} aria-label="Computadora" title="Computadora"><Icon name="monitor" size={16} /></button>
                            <button type="button" className={viewport === 'mobile' ? 'on' : ''} onClick={() => setViewport('mobile')} aria-label="Celular" title="Celular"><Icon name="phone" size={16} /></button>
                        </div>
                    </div>
                ) : null}
                {status.history ? <HistoryButton history={status.history} theme={status.theme} toast={status.toast} /> : null}
            <CloudStatus cloud={status.cloud} unpublished={status.dirty} />
                <button type="button" className="vp-btn acc" onClick={onPublish} disabled={publishing}>{publishing ? 'Publicando…' : 'Publicar'}</button>
                <button type="button" className="vp-ibtn" onClick={onNotifications} aria-label={`Avisos: ${badges.total || 0}`}>
                    <Icon name="bell" size={17} />
                    {badges.total ? <span className="n">{badges.total}</span> : null}
                </button>
                <button type="button" className="vp-ibtn" onClick={onHelp} aria-label="Ayuda de esta sección" title="Ayuda de esta sección">?</button>
            </div>

            {isBlocksPage ? (
                <div className={phone ? `vp-dzgrid phone v-${phoneView}` : `vp-dzgrid ${showBlocks ? '' : 'no-l'} ${showInspector ? '' : 'no-r'}`}>
                    {showBlocks || phone ? (
                        <aside className="vp-dzl" aria-label="Bloques de la página">
                            <div className="vp-dzh"><b>Bloques</b><button type="button" className="vp-x" aria-label="Cerrar los bloques" onClick={() => (phone ? setPhoneView('preview') : setShowBlocks(false))}>×</button></div>
                            <div className="vp-dzsep">En todas las páginas</div>
                            {chromeRow(HEADER_ID, 'layout', 'Menú de arriba', isPiquim ? linksSummary(navLinksFromSettings(settings)) : 'Menú, buscador y botones')}
                            <div className="vp-dzsep">Esta página · arrastrá para ordenar</div>
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
                                        <button type="button" className="g" onClick={() => select(block.id)}>
                                            <b>{labelFor(block)}</b>
                                            <span>{block.enabled === false ? 'Oculto en la tienda' : blockSummary(block) || 'Visible'}</span>
                                        </button>
                                        <div className="acts">
                                            <button type="button" aria-label="Subir" title="Subir" disabled={index === 0} onClick={() => setBlocks((list) => moveBlock(list, index, index - 1))}>↑</button>
                                            <button type="button" aria-label="Bajar" title="Bajar" disabled={index === blocks.length - 1} onClick={() => setBlocks((list) => moveBlock(list, index, index + 1))}>↓</button>
                                            <button type="button" aria-label="Eliminar" title="Eliminar" className="del" onClick={() => setConfirmDelete(block)}><Icon name="trash" size={14} /></button>
                                        </div>
                                        <button type="button" className="eye" aria-label={block.enabled === false ? 'Mostrar en la tienda' : 'Ocultar en la tienda'} title={block.enabled === false ? 'Mostrar' : 'Ocultar'} onClick={() => setBlocks((list) => toggleBlock(list, block.id))}>
                                            <Icon name={block.enabled === false ? 'eyeoff' : 'eye'} size={15} />
                                        </button>
                                    </div>
                                ))}
                                {!blocks.length ? <div className="vp-note" style={{ padding: 12 }}>Esta página todavía no tiene bloques.</div> : null}
                            </div>
                            <button type="button" className="vp-btn soft sm vp-dzaddb" onClick={() => setAdding((value) => !value)} aria-expanded={adding}><Icon name="plus" size={14} />Agregar bloque</button>
                            {adding ? (
                                <div className="vp-dzadd">
                                    {(BLOCK_TYPES[pageKey] || []).map(([type, label]) => (
                                        <button key={type} type="button" className="vp-mi" onClick={() => add(type)}>{label}</button>
                                    ))}
                                </div>
                            ) : null}
                            <div className="vp-dzsep">En todas las páginas</div>
                            {chromeRow(FOOTER_ID, 'layout', 'Pie de página', 'Links, contacto y texto legal')}
                            <div className="vp-dzsep">Estilo general</div>
                            <button type="button" className="vp-dzb chrome" onClick={() => switchPage('apariencia')}>
                                <span className="bic" aria-hidden="true"><Icon name="palette" size={15} /></span>
                                <span className="g"><b>Colores, letras y logo</b><span>Para toda la tienda</span></span>
                            </button>
                        </aside>
                    ) : null}

                    <section className="vp-dzc" aria-label="Vista previa de la tienda">
                        <div className={`vp-dzframe ${phone ? 'fill' : viewport}`}>
                            <ResponsivePreviewFrame viewport={phone ? 'desktop' : viewport}>
                                <StorePreview settings={settings} sections={previewSections} labelFor={labelFor} selectedId={selectedId} onSelect={select} isPiquim={isPiquim} viewport={phone ? 'mobile' : viewport} />
                            </ResponsivePreviewFrame>
                        </div>
                        <span className="vp-dzhint">Tocá cualquier parte de la tienda para editarla.</span>
                    </section>

                    {showInspector || phone ? (
                        <aside className="vp-dzr" aria-label="Editor del bloque">
                            <div className="vp-dzih">
                                <div style={{ minWidth: 0 }}>
                                    <small>{inspectorTitle ? 'Editando' : 'Editor'}</small>
                                    <b>{inspectorTitle || 'Elegí un bloque'}</b>
                                </div>
                                {selected ? (
                                    <button type="button" role="switch" aria-checked={selected.enabled !== false} aria-label="Visible en la tienda" title={selected.enabled === false ? 'Oculto en la tienda' : 'Visible en la tienda'} className={`vp-tog ${selected.enabled === false ? 'off' : ''}`} onClick={() => setBlocks((list) => toggleBlock(list, selected.id))} />
                                ) : null}
                                <button type="button" className="vp-x" aria-label="Cerrar el editor" onClick={() => (phone ? setPhoneView('preview') : setShowInspector(false))}>×</button>
                            </div>
                            <div className="vp-dzib">
                                {selectedId === HEADER_ID ? <HeaderEditor settings={settings} setSettings={editor.setSettings} pickers={pickers} isPiquim={isPiquim} /> : null}
                                {selectedId === FOOTER_ID ? <FooterEditor settings={settings} setSettings={editor.setSettings} pickers={pickers} isPiquim={isPiquim} /> : null}
                                {selected ? (
                                    <BlockInspector
                                        block={selected}
                                        onChange={(next) => setBlocks((list) => replaceBlock(list, { ...next, id: selected.id }))}
                                        tab={inspTab}
                                        onTab={setInspTab}
                                        onViewport={setViewport}
                                    />
                                ) : null}
                                {!inspectorTitle ? (
                                    <div className="vp-dzempty">
                                        <span className="ic"><Icon name="layout" size={22} /></span>
                                        <span>Tocá un bloque en la tienda o en la lista para cambiar sus textos, fotos, botones y links.</span>
                                    </div>
                                ) : null}
                            </div>
                            {inspectorTitle ? <div className="vp-dzif">Se guarda como borrador. <b>Publicar</b> sube los cambios a la tienda.</div> : null}
                        </aside>
                    ) : null}
                </div>
            ) : (
                <div className="vp-body">
                    <div className="vp-legacy vp-dzform">
                        {page === 'catalogo' && isPiquim ? <CatalogPageEditor settings={editor.settings} setSettings={editor.setSettings} onSave={onPublish} isSaving={editor.saving} /> : null}
                        {/* En las demás tiendas la página Catálogo no tiene tarjetas de rubro: solo sus textos. */}
                        {page === 'catalogo' && !isPiquim ? <CatalogTextsEditor settings={editor.settings} setSettings={editor.setSettings} /> : null}
                        {page === 'legales' ? <LegalEditor settings={editor.settings} setSettings={editor.setSettings} theme={theme} /> : null}
                        {page === 'apariencia' ? <AppearanceEditor settings={editor.settings} setSettings={editor.setSettings} onSave={onPublish} isSaving={editor.saving} /> : null}
                    </div>
                </div>
            )}

            {phone && isBlocksPage ? (
                <nav className="vp-dzmnav" aria-label="Qué ver">
                    {[['blocks', 'list', 'Bloques'], ['preview', 'monitor', 'Vista'], ['editor', 'sliders', 'Editar']].map(([id, icon, label]) => (
                        <button key={id} type="button" className={phoneView === id ? 'on' : ''} aria-pressed={phoneView === id} onClick={() => setPhoneView(id)}>
                            <Icon name={icon} size={17} /><span>{label}</span>
                        </button>
                    ))}
                </nav>
            ) : null}

            <Modal
                open={Boolean(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
                theme={theme}
                title="¿Eliminar este bloque?"
                description="Si solo querés que no se vea un tiempo, ocultalo con el ojito. Hasta que publiques podés deshacerlo."
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                    <button type="button" className="vp-btn red" onClick={() => { setBlocks((list) => removeBlock(list, confirmDelete.id)); if (selectedId === confirmDelete.id) setSelectedId(null); setConfirmDelete(null); toast('Bloque eliminado. Publicá para que se vea en la tienda.', 'success'); }}>Eliminar</button>
                </>}
            />
        </div>
    );
}
