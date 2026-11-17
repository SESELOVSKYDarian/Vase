// Panel, Catálogo: la lista de productos con filtros y acciones en grupo.
import DataTable from '../../components/DataTable';
import Icon from '../../components/Icon';
import ProductInspector from '../ProductInspector';
import ProductSearch from '../ProductSearch';
import Select from '../../components/Select';
import { PanelTag } from '@vase/ui/panel/pieces';
import { SidePanel } from '../../components/Overlays';
import { categoryPath } from '../model';
import { descendantIds } from '../model';
import { formatMoney } from '../../format';
import { mainCategory } from '../model';
import { productThumb } from '../model';

export default function CatalogoProductos({ active, activeBrand, activeCat, activeProduct, brandCounts, brandName, brands, bulk, catDraft, catProducts, categories, changeStock, counts, createBrand, currentCat, filter, filters, goSettings, products, query, rows, saveCategory, saveProduct, saving, selected, setActive, setActiveBrand, setActiveCat, setBrandName, setCatDraft, setConfirm, setFilter, setMoveOpen, setPricesOf, setProductCategory, setQuery, setSelected, storeHost, tab, theme, toast, tree, updateFields, user }) {
    return (
        <div className="vp-page" style={tab === 'ofertas' || tab === 'precios' ? { display: 'none' } : undefined}>
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
                    toast={toast}
                    user={user}
                    goPriceLists={goSettings ? () => goSettings('precios') : undefined}
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
                        <div className="vp-row"><div className="g"><b>En tu sistema se llama</b><span>{currentCat.source_name}</span></div><PanelTag tone="g">Del sistema</PanelTag></div>
                    ) : null}
                    <div className="vp-fld"><label htmlFor="cat-name">Nombre en la tienda</label><input id="cat-name" className="vp-inp" value={catDraft.name} onChange={(event) => setCatDraft((draft) => ({ ...draft, name: event.target.value }))} />
                        {currentCat?.from_sync ? <span className="vp-note">Aunque la renombres, la sincronización la sigue reconociendo y no crea otra.</span> : null}
                    </div>
                    {activeCat === 'new' || currentCat?.parent_id ? (
                        <div className="vp-fld"><label htmlFor="cat-parent">Está dentro de</label>
                            <Select
                                id="cat-parent"
                                value={catDraft.parent_id}
                                onChange={(next) => setCatDraft((draft) => ({ ...draft, parent_id: next }))}
                                options={tree
                                    .filter((category) => !currentCat || !descendantIds(categories, currentCat.id).has(category.id))
                                    .map((category) => ({ value: category.id, label: category.name, depth: category.depth }))}
                            />
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
    );
}
