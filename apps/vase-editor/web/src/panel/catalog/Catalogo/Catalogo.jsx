// Parte de Catalogo.jsx: Catalogo.
// partes: ./CatalogoProductos.jsx
import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/DataTable';
import { Modal, SidePanel } from '../../components/Overlays';
import Icon from '../../components/Icon';
import Select from '../../components/Select';
import ProductInspector from '../ProductInspector';
import ProductSearch from '../ProductSearch';
import Ofertas from '../Ofertas';
import Precios from '../Precios';
import { errorText, panelFetch } from '../../api';
import { formatMoney } from '../../format';
import { buildCategoryTree, buildFilters, categoryPath, countByCategory, descendantIds, draftToPayload, mainCategory, productThumb, searchProducts } from '../model';
import { PanelTag } from '@vase/ui/panel/pieces';
import { TABS, lastSyncLabel } from './last-sync-label.js';

import CatalogoProductos from './CatalogoProductos.jsx';
export default function Catalogo({ editor, user, theme, toast, goSettings, storeHost }) {
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
            {tab === 'ofertas' ? <Ofertas user={user} products={products} categories={categories} toast={toast} theme={theme} /> : null}
            {tab === 'precios' ? (
                <Precios
                    user={user}
                    products={products}
                    categories={categories}
                    brands={brands}
                    toast={toast}
                    onApplied={(items) => setProducts(items)}
                   
                />
            ) : null}
            <CatalogoProductos active={active} activeBrand={activeBrand} activeCat={activeCat} activeProduct={activeProduct} brandCounts={brandCounts} brandName={brandName} brands={brands} bulk={bulk} catDraft={catDraft} catProducts={catProducts} categories={categories} changeStock={changeStock} counts={counts} createBrand={createBrand} currentCat={currentCat} filter={filter} filters={filters} goSettings={goSettings} products={products} query={query} rows={rows} saveCategory={saveCategory} saveProduct={saveProduct} saving={saving} selected={selected} setActive={setActive} setActiveBrand={setActiveBrand} setActiveCat={setActiveCat} setBrandName={setBrandName} setCatDraft={setCatDraft} setConfirm={setConfirm} setFilter={setFilter} setMoveOpen={setMoveOpen} setPricesOf={setPricesOf} setProductCategory={setProductCategory} setQuery={setQuery} setSelected={setSelected} storeHost={storeHost} tab={tab} theme={theme} toast={toast} tree={tree} updateFields={updateFields} user={user} />

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
