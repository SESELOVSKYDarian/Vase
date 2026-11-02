import React, { useEffect, useMemo, useState } from 'react';
import './catalog.css';
import DataTable from '../components/DataTable';
import { Modal, SidePanel } from '../components/Overlays';
import { ComingSoon } from '../components/Shell';
import Icon from '../components/Icon';
import ProductInspector from './ProductInspector';
import { errorText, panelFetch } from '../api';
import { formatMoney } from '../format';
import {
    buildCategoryTree,
    buildFilters,
    categoryPath,
    countByCategory,
    descendantIds,
    draftToPayload,
    mainCategory,
    productThumb,
    searchProducts,
} from './model';

const TABS = [
    ['productos', 'Productos'],
    ['categorias', 'Rubros y categorías'],
    ['marcas', 'Marcas'],
    ['ofertas', 'Ofertas'],
    ['precios', 'Cambiar precios'],
];

const lastSyncLabel = (products) => {
    const last = products.reduce((max, product) => {
        const time = product.last_sync_at ? new Date(product.last_sync_at).getTime() : 0;
        return time > max ? time : max;
    }, 0);
    if (!last) return null;
    const minutes = Math.round((Date.now() - last) / 60000);
    if (minutes < 1) return 'recién';
    if (minutes < 60) return `hace ${minutes} min`;
    if (minutes < 60 * 24) return `hace ${Math.round(minutes / 60)} h`;
    return new Date(last).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

export default function Catalogo({ editor, user, theme, toast, openLegacy, goSettings, storeHost }) {
    const [tab, setTab] = useState('productos');
    const products = editor.products || [];
    const setProducts = editor.setProducts;
    // Categorías y marcas se guardan al instante en el servidor: se manejan acá sin marcar "cambios sin publicar".
    const [categories, setCategories] = useState(editor.categories || []);
    const [brands, setBrands] = useState(editor.brands || []);
    useEffect(() => setCategories(editor.categories || []), [editor.categories]);
    useEffect(() => setBrands(editor.brands || []), [editor.brands]);

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('todos');
    const [selected, setSelected] = useState([]);
    const [active, setActive] = useState(null); // id de producto, 'new' o null
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [pricesOf, setPricesOf] = useState(null);
    const [moveOpen, setMoveOpen] = useState(false);
    const [activeCat, setActiveCat] = useState(null); // id, 'new' o null
    const [activeBrand, setActiveBrand] = useState(null); // nombre, 'new' o null

    const filters = useMemo(() => buildFilters(products, categories), [products, categories]);
    const currentFilter = filters.find((item) => item.id === filter) || filters[0];
    const rows = useMemo(() => searchProducts(products, query).filter(currentFilter.test), [products, query, currentFilter]);
    const sync = lastSyncLabel(products);

    const replaceProduct = (item) => {
        if (!item?.id) return;
        setProducts((list) => (list.some((product) => product.id === item.id) ? list.map((product) => (product.id === item.id ? { ...product, ...item } : product)) : [item, ...list]));
    };

    const run = async (task, okMessage) => {
        setSaving(true);
        try {
            const result = await task();
            if (okMessage) toast(okMessage, 'success');
            return result;
        } catch (error) {
            toast(errorText(error), 'error');
            return null;
        } finally {
            setSaving(false);
        }
    };

    // ---------- productos
    const saveProduct = (draft) => run(async () => {
        const payload = draftToPayload(draft);
        const response = draft.id
            ? await panelFetch(`/tenant/products/${draft.id}`, { method: 'PUT', body: payload, user })
            : await panelFetch('/tenant/products', { method: 'POST', body: payload, user });
        const item = response.item || response;
        replaceProduct(item);
        setActive(item.id);
        return item;
    }, draft.id ? 'Producto guardado' : 'Producto creado');

    const updateFields = (product, patch, message) => run(async () => {
        const response = await panelFetch(`/tenant/products/${product.id}`, { method: 'PUT', body: patch, user });
        replaceProduct(response.item || { ...product, ...patch });
    }, message);

    const changeStock = async (product, delta) => {
        const next = Math.max(0, Number(product.stock || 0) + delta);
        replaceProduct({ ...product, stock: next });
        try {
            const response = await panelFetch(`/tenant/products/${product.id}/stock`, { method: 'PUT', body: { delta }, user });
            replaceProduct({ ...product, stock: response.stock });
        } catch (error) {
            replaceProduct(product);
            toast(errorText(error), 'error');
        }
    };

    const deleteProduct = (product) => run(async () => {
        await panelFetch(`/tenant/products/${product.id}`, { method: 'DELETE', user });
        setProducts((list) => list.filter((item) => item.id !== product.id));
        setActive(null);
        setConfirm(null);
    }, 'Producto eliminado');

    const bulk = (label, patchFor) => run(async () => {
        const targets = products.filter((product) => selected.includes(product.id));
        for (const product of targets) {
            const response = await panelFetch(`/tenant/products/${product.id}`, { method: 'PUT', body: patchFor(product), user });
            replaceProduct(response.item || product);
        }
        setSelected([]);
    }, `${label}: ${selected.length} ${selected.length === 1 ? 'producto' : 'productos'}`);

    // ---------- categorías
    const tree = useMemo(() => buildCategoryTree(categories), [categories]);
    const { counts } = useMemo(() => countByCategory(products, categories), [products, categories]);
    const currentCat = activeCat && activeCat !== 'new' ? categories.find((category) => category.id === activeCat) : null;
    const [catDraft, setCatDraft] = useState({ name: '', parent_id: '' });
    useEffect(() => {
        if (activeCat === 'new') setCatDraft({ name: '', parent_id: categories.find((category) => !category.parent_id)?.id || '' });
        else if (currentCat) setCatDraft({ name: currentCat.name, parent_id: currentCat.parent_id || '' });
    }, [activeCat, currentCat, categories]);

    const saveCategory = () => run(async () => {
        if (activeCat === 'new') {
            const created = await panelFetch('/tenant/categories', { method: 'POST', body: { name: catDraft.name, parent_id: catDraft.parent_id || undefined }, user });
            setCategories((list) => [...list, { ...created, parent_id: created.parent_id || null }]);
            setActiveCat(created.id);
        } else {
            const isRoot = !currentCat.parent_id;
            const updated = await panelFetch(`/tenant/categories/${currentCat.id}`, {
                method: 'PUT',
                body: isRoot ? { name: catDraft.name } : { name: catDraft.name, parent_id: catDraft.parent_id || null },
                user,
            });
            setCategories((list) => list.map((category) => (category.id === updated.id ? { ...category, ...updated } : category)));
        }
    }, activeCat === 'new' ? 'Categoría creada' : 'Categoría guardada');

    const deleteCategory = (category) => run(async () => {
        await panelFetch(`/tenant/categories/${category.id}`, { method: 'DELETE', user });
        setCategories((list) => list.filter((item) => item.id !== category.id));
        setActiveCat(null);
        setConfirm(null);
    }, 'Categoría eliminada');

    const catProducts = currentCat ? products.filter((product) => (product.category_ids || []).includes(currentCat.id)) : [];
    const setProductCategory = (product, add) => updateFields(product, {
        category_ids: add ? [...new Set([...(product.category_ids || []), currentCat.id])] : (product.category_ids || []).filter((id) => id !== currentCat.id),
    }, add ? 'Producto sumado a la categoría' : 'Producto quitado de la categoría');

    // ---------- marcas
    const brandCounts = useMemo(() => {
        const map = new Map();
        products.forEach((product) => {
            const key = String(product.brand || '').trim();
            if (key) map.set(key.toLowerCase(), (map.get(key.toLowerCase()) || 0) + 1);
        });
        return map;
    }, [products]);
    const [brandName, setBrandName] = useState('');
    const createBrand = () => run(async () => {
        const response = await panelFetch('/tenant/brands', { method: 'POST', body: { name: brandName }, user });
        setBrands(response.items || [...brands, brandName.trim()]);
        setActiveBrand(brandName.trim());
        setBrandName('');
    }, 'Marca creada');
    const deleteBrand = (name) => run(async () => {
        const response = await panelFetch(`/tenant/brands/${encodeURIComponent(name)}`, { method: 'DELETE', user });
        setBrands(response.items || brands.filter((item) => item !== name));
        setActiveBrand(null);
        setConfirm(null);
    }, 'Marca eliminada');

    const activeProduct = active && active !== 'new' ? products.find((product) => product.id === active) : null;
    const rootCats = categories.filter((category) => !category.parent_id);

    return (
        <>
            <div className="vp-tabs2 vp-catbar" role="tablist" aria-label="Partes del catálogo">
                {TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={`vp-t2 ${tab === id ? 'on' : ''}`} onClick={() => { setTab(id); setActive(null); setActiveCat(null); setActiveBrand(null); }}>
                        {label}
                        {id === 'productos' ? <em>{products.length}</em> : null}
                        {id === 'categorias' ? <em>{categories.length}</em> : null}
                        {id === 'marcas' ? <em>{brands.length}</em> : null}
                    </button>
                ))}
                <div className="vp-sp" />
                {sync ? <button type="button" className="vp-sync" onClick={() => goSettings('gestion')}><i />Sincronizado · {sync}</button> : null}
            </div>
            <div className="vp-page">
                <div className="vp-body">
                    {tab === 'productos' ? (
                        <>
                            <div className="vp-fbar">
                                <label className="vp-search"><Icon name="search" size={15} /><input placeholder="Nombre, SKU o marca" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar productos" /></label>
                                {filters.map((item) => (
                                    <button key={item.id} type="button" className={`vp-fp ${filter === item.id ? 'on' : ''}`} onClick={() => setFilter(item.id)}>{item.label} <em>{item.count}</em></button>
                                ))}
                                <div className="vp-sp" />
                                <button type="button" className="vp-btn ink" onClick={() => setActive('new')}>+ Producto</button>
                            </div>
                            <DataTable
                                rows={rows}
                                activeKey={active}
                                onRowClick={(product) => setActive(product.id)}
                                selectable
                                selected={selected}
                                onSelectedChange={setSelected}
                                empty={query ? `No hay productos con “${query}”.` : 'No hay productos en este filtro.'}
                                bulkActions={<>
                                    <button type="button" className="vp-btn sm" onClick={() => bulk('Visibles', () => ({ is_visible_web: true }))}>Mostrar</button>
                                    <button type="button" className="vp-btn sm" onClick={() => bulk('Ocultos', () => ({ is_visible_web: false }))}>Ocultar</button>
                                    <button type="button" className="vp-btn sm" onClick={() => bulk('Destacados', () => ({ is_featured: true }))}>Destacar</button>
                                    <button type="button" className="vp-btn sm" onClick={() => setMoveOpen(true)}>Sumar a categoría</button>
                                </>}
                                columns={[
                                    {
                                        key: 'name',
                                        label: 'Producto',
                                        render: (product) => (
                                            <span className="vp-cell">
                                                {productThumb(product) ? <img className="vp-pimg" src={productThumb(product)} alt="" loading="lazy" /> : <span className="vp-pimg empty" />}
                                                <span><span className="vp-nm">{product.name}</span><span className="vp-mt">SKU {product.sku || '—'}{product.sync_status === 'manual' ? ' · manual' : ''}</span></span>
                                            </span>
                                        ),
                                    },
                                    { key: 'cat', label: 'Categoría', render: (product) => { const main = mainCategory(product, categories); return main ? <span className="vp-tag" title={categoryPath(categories, main.id)}>{main.name}</span> : <span className="vp-note">Sin categoría</span>; } },
                                    {
                                        key: 'price',
                                        label: 'Precio',
                                        align: 'right',
                                        render: (product) => {
                                            const tiers = (product.price_tiers || []).filter((tier) => Number(tier?.value) > 0);
                                            return tiers.length > 1 ? (
                                                <button type="button" className="vp-pricebtn" onClick={(event) => { event.stopPropagation(); setPricesOf(product); }}>
                                                    {formatMoney(product.price)}<span>{tiers.length} precios ▾</span>
                                                </button>
                                            ) : <b>{formatMoney(product.price)}</b>;
                                        },
                                    },
                                    {
                                        key: 'stock',
                                        label: 'Stock',
                                        render: (product) => (
                                            <span className={`vp-stk ${Number(product.stock || 0) <= 0 ? 'zero' : ''}`} onClick={(event) => event.stopPropagation()}>
                                                <button type="button" onClick={() => changeStock(product, -1)} disabled={Number(product.stock || 0) <= 0} aria-label={`Restar uno a ${product.name}`}>−</button>
                                                <span>{product.stock ?? 0}</span>
                                                <button type="button" onClick={() => changeStock(product, 1)} aria-label={`Sumar uno a ${product.name}`}>+</button>
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'visible',
                                        label: 'Visible',
                                        render: (product) => (
                                            <button
                                                type="button"
                                                className={`vp-tog ${product.is_visible_web === false ? 'off' : ''}`}
                                                role="switch"
                                                aria-checked={product.is_visible_web !== false}
                                                aria-label={`Visible: ${product.name}`}
                                                onClick={(event) => { event.stopPropagation(); updateFields(product, { is_visible_web: product.is_visible_web === false }); }}
                                            />
                                        ),
                                    },
                                ]}
                            />
                        </>
                    ) : null}

                    {tab === 'categorias' ? (
                        <>
                            <div className="vp-fbar">
                                <span className="vp-note" style={{ fontSize: 12.5 }}>Tus rubros son fijos. Adentro creás, renombrás y movés las categorías.</span>
                                <div className="vp-sp" />
                                <button type="button" className="vp-btn ink" onClick={() => setActiveCat('new')}>+ Categoría</button>
                            </div>
                            <div className="vp-card vp-tree">
                                {tree.map((category) => (
                                    <button key={category.id} type="button" className={`vp-tn ${activeCat === category.id ? 'on' : ''}`} style={{ paddingLeft: 10 + category.depth * 24 }} onClick={() => setActiveCat(category.id)}>
                                        <span className={category.depth ? 'vp-tn-dot' : 'vp-tn-root'} aria-hidden="true" />
                                        <span className={category.depth ? '' : 'vp-nm'}>{category.name}</span>
                                        {category.from_sync ? <span className="vp-tag" style={{ height: 20 }}>sistema</span> : null}
                                        <span className="vp-tn-ct">{counts.get(category.id) || 0} productos</span>
                                    </button>
                                ))}
                                {!tree.length ? <div className="vp-empty">Todavía no hay categorías.</div> : null}
                            </div>
                        </>
                    ) : null}

                    {tab === 'marcas' ? (
                        <div className="vp-brands">
                            {brands.map((brand) => (
                                <button key={brand} type="button" className={`vp-brand ${activeBrand === brand ? 'on' : ''}`} onClick={() => setActiveBrand(brand)}>
                                    <i>{brand.slice(0, 2).toUpperCase()}</i><b>{brand}</b><span>{brandCounts.get(brand.toLowerCase()) || 0} productos</span>
                                </button>
                            ))}
                            <button type="button" className="vp-brand new" onClick={() => setActiveBrand('new')}>+ Nueva marca</button>
                        </div>
                    ) : null}

                    {tab === 'ofertas' ? <ComingSoon title="Ofertas" phase={4} onOpenLegacy={() => openLegacy('pricing')} /> : null}
                    {tab === 'precios' ? <ComingSoon title="Cambiar precios" phase={4} onOpenLegacy={() => openLegacy('pricing')} /> : null}
                </div>

                {tab === 'productos' && active ? (
                    <ProductInspector
                        key={active}
                        product={activeProduct || { is_visible_web: true }}
                        isNew={active === 'new'}
                        products={products}
                        categories={categories}
                        brands={brands}
                        theme={theme}
                        saving={saving}
                        onClose={() => setActive(null)}
                        onSave={saveProduct}
                        onDelete={() => setConfirm({ kind: 'product', item: activeProduct })}
                        onVariantChange={(other, group) => updateFields(other, { variant_group: group }, group ? 'Producto sumado al grupo' : 'Producto sacado del grupo')}
                    />
                ) : null}

                {tab === 'categorias' && activeCat ? (
                    <SidePanel
                        open
                        onClose={() => setActiveCat(null)}
                        label="Categoría"
                        kicker={activeCat === 'new' ? 'Categoría nueva' : currentCat?.parent_id ? 'Categoría' : 'Rubro'}
                        title={catDraft.name || 'Categoría nueva'}
                        footer={<>
                            {currentCat && currentCat.parent_id ? <button type="button" className="vp-btn red" onClick={() => setConfirm({ kind: 'category', item: currentCat })}>Eliminar</button> : null}
                            <div className="vp-sp" />
                            <button type="button" className="vp-btn acc" onClick={saveCategory} disabled={saving || !catDraft.name.trim()}>{saving ? 'Guardando…' : 'Guardar'}</button>
                        </>}
                    >
                        {currentCat && !currentCat.parent_id ? (
                            <div className="vp-lock ok">Es uno de tus rubros. Su foto, título y etiquetas se cambian en Diseño de la tienda › Catálogo.</div>
                        ) : null}
                        {currentCat?.source_name && currentCat.source_name !== catDraft.name ? (
                            <div className="vp-row"><div className="g"><b>En tu sistema se llama</b><span>{currentCat.source_name}</span></div><span className="vp-tag g"><i />Del sistema</span></div>
                        ) : null}
                        <div className="vp-fld"><label htmlFor="cat-name">Nombre en la tienda</label><input id="cat-name" className="vp-inp" value={catDraft.name} onChange={(event) => setCatDraft((draft) => ({ ...draft, name: event.target.value }))} />
                            {currentCat?.from_sync ? <span className="vp-note">Aunque la renombres, la sincronización la sigue reconociendo y no crea otra.</span> : null}
                        </div>
                        {activeCat === 'new' || currentCat?.parent_id ? (
                            <div className="vp-fld"><label htmlFor="cat-parent">Está dentro de</label>
                                <select id="cat-parent" className="vp-inp" value={catDraft.parent_id} onChange={(event) => setCatDraft((draft) => ({ ...draft, parent_id: event.target.value }))}>
                                    {tree
                                        .filter((category) => !currentCat || !descendantIds(categories, currentCat.id).has(category.id))
                                        .map((category) => <option key={category.id} value={category.id}>{'— '.repeat(category.depth)}{category.name}</option>)}
                                </select>
                            </div>
                        ) : null}
                        {currentCat ? (
                            <>
                                <div className="vp-fld"><span className="vp-fl">Dirección en la tienda</span>
                                    <div className="vp-url"><span className="pre">{storeHost}/catalog?category=</span><span className="slug">{currentCat.slug}</span>
                                        <button type="button" onClick={() => { navigator.clipboard?.writeText(`https://${storeHost}/catalog?category=${currentCat.slug}`); toast('Dirección copiada', 'success'); }}>Copiar</button>
                                    </div>
                                </div>
                                <div className="vp-fld"><span className="vp-fl">Productos · {catProducts.length}</span>
                                    {catProducts.slice(0, 30).map((product) => (
                                        <div key={product.id} className="vp-row">
                                            {productThumb(product) ? <img className="vp-pimg sm" src={productThumb(product)} alt="" loading="lazy" /> : null}
                                            <div className="g"><b style={{ fontSize: 12.5 }}>{product.name}</b></div>
                                            <button type="button" className="vp-x" aria-label={`Quitar ${product.name}`} onClick={() => setProductCategory(product, false)}>×</button>
                                        </div>
                                    ))}
                                    {catProducts.length > 30 ? <span className="vp-note">y {catProducts.length - 30} más. Filtralos desde Productos.</span> : null}
                                    <ProductSearch products={products} exclude={new Set(catProducts.map((product) => product.id))} onPick={(product) => setProductCategory(product, true)} />
                                </div>
                            </>
                        ) : null}
                    </SidePanel>
                ) : null}

                {tab === 'marcas' && activeBrand ? (
                    <SidePanel
                        open
                        onClose={() => setActiveBrand(null)}
                        label="Marca"
                        kicker={activeBrand === 'new' ? 'Marca nueva' : 'Marca'}
                        title={activeBrand === 'new' ? (brandName || 'Marca nueva') : activeBrand}
                        footer={activeBrand === 'new'
                            ? <><div className="vp-sp" /><button type="button" className="vp-btn acc" onClick={createBrand} disabled={saving || !brandName.trim()}>Crear marca</button></>
                            : <><button type="button" className="vp-btn red" onClick={() => setConfirm({ kind: 'brand', item: activeBrand })}>Eliminar</button><div className="vp-sp" /></>}
                    >
                        {activeBrand === 'new' ? (
                            <div className="vp-fld"><label htmlFor="brand-name">Nombre</label><input id="brand-name" className="vp-inp" value={brandName} onChange={(event) => setBrandName(event.target.value)} autoFocus /><span className="vp-note">Después la elegís en cada producto, en Datos › Marca.</span></div>
                        ) : (
                            <>
                                <div className="vp-fld"><span className="vp-fl">Productos · {brandCounts.get(activeBrand.toLowerCase()) || 0}</span>
                                    {products.filter((product) => String(product.brand || '').toLowerCase() === activeBrand.toLowerCase()).slice(0, 30).map((product) => (
                                        <div key={product.id} className="vp-row">
                                            {productThumb(product) ? <img className="vp-pimg sm" src={productThumb(product)} alt="" loading="lazy" /> : null}
                                            <div className="g"><b style={{ fontSize: 12.5 }}>{product.name}</b></div>
                                        </div>
                                    ))}
                                </div>
                                <span className="vp-note">Para cambiar la marca de un producto, abrilo y elegí otra en Datos › Marca.</span>
                            </>
                        )}
                    </SidePanel>
                ) : null}
            </div>

            <Modal
                open={Boolean(pricesOf)}
                onClose={() => setPricesOf(null)}
                theme={theme}
                title={`Precios de ${pricesOf?.name || ''}`}
                description="Llegan de tu sistema de gestión. Cada lista de clientes usa uno de estos precios."
                footer={<><button type="button" className="vp-btn soft" onClick={() => { setPricesOf(null); goSettings('precios'); }}>Ir a Precios y listas</button><button type="button" className="vp-btn acc" onClick={() => setPricesOf(null)}>Listo</button></>}
            >
                <table className="vp-tbl">
                    <thead><tr><th>Precio</th><th className="r">Valor</th></tr></thead>
                    <tbody>
                        {(pricesOf?.price_tiers || []).filter((tier) => Number(tier?.value) > 0).map((tier) => (
                            <tr key={tier.key || tier.slot}><td><b>{tier.label || `Precio ${tier.slot}`}</b><span className="vp-mt">{tier.key}</span></td><td className="r"><b>{formatMoney(tier.value)}</b></td></tr>
                        ))}
                    </tbody>
                </table>
            </Modal>

            <Modal
                open={moveOpen}
                onClose={() => setMoveOpen(false)}
                theme={theme}
                title="Sumar a una categoría"
                description={`Los ${selected.length} productos elegidos se suman a la categoría, sin sacarlos de las que ya tienen.`}
            >
                <div className="vp-lmenu" style={{ boxShadow: 'none' }}>
                    {tree.map((category) => (
                        <button key={category.id} type="button" className="vp-mi" style={{ paddingLeft: 12 + category.depth * 18 }} onClick={() => { setMoveOpen(false); bulk('Sumados a la categoría', (product) => ({ category_ids: [...new Set([...(product.category_ids || []), category.id])] })); }}>
                            {category.name}<em>{counts.get(category.id) || 0}</em>
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                theme={theme}
                title={confirm?.kind === 'product' ? '¿Eliminar este producto?' : confirm?.kind === 'category' ? '¿Eliminar esta categoría?' : '¿Eliminar esta marca?'}
                description={
                    confirm?.kind === 'product'
                        ? `${confirm.item?.name} deja de verse en la tienda. Si viene de tu sistema y sigue existiendo allá, puede volver en la próxima sincronización.`
                        : confirm?.kind === 'category'
                            ? `${confirm.item?.name}: sus productos no se borran, solo dejan de estar en esta categoría.`
                            : `${confirm?.item}: los productos no se borran.`
                }
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setConfirm(null)}>Cancelar</button>
                    <button
                        type="button"
                        className="vp-btn red"
                        disabled={saving}
                        onClick={() => {
                            if (confirm.kind === 'product') deleteProduct(confirm.item);
                            else if (confirm.kind === 'category') deleteCategory(confirm.item);
                            else deleteBrand(confirm.item);
                        }}
                    >Eliminar</button>
                </>}
            >
                {null}
            </Modal>
        </>
    );
}

function ProductSearch({ products, exclude, onPick }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const options = q.length < 2 ? [] : products.filter((product) => !exclude.has(product.id) && `${product.name} ${product.sku || ''}`.toLowerCase().includes(q)).slice(0, 8);
    return (
        <div className="vp-fld">
            <input className="vp-inp" placeholder="+ Sumar productos: buscá por nombre o SKU…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Sumar productos a la categoría" />
            {options.length ? (
                <div className="vp-lmenu">
                    {options.map((product) => <button key={product.id} type="button" className="vp-mi" onClick={() => { onPick(product); setQuery(''); }}>{product.name}<em>{product.sku}</em></button>)}
                </div>
            ) : null}
        </div>
    );
}
