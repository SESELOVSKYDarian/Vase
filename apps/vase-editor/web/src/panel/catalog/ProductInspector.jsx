import React, { useEffect, useMemo, useState } from 'react';
import { SidePanel } from '../components/Overlays';
import { ImagePickerModal } from '../components/Pickers';
import Select from '../components/Select';
import { categoryPath, productToDraft, variantMembers } from './model';

const TABS = [['datos', 'Datos'], ['fotos', 'Fotos y descripción'], ['mas', 'Más']];

function CategoryAdder({ categories, selected, onAdd }) {
    const [query, setQuery] = useState('');
    const options = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return categories
            .filter((category) => !selected.includes(category.id) && category.name.toLowerCase().includes(q))
            .slice(0, 8);
    }, [categories, query, selected]);
    return (
        <div className="vp-fld">
            <input className="vp-inp" placeholder="+ Sumar a una categoría: buscá por nombre…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Sumar a una categoría" />
            {options.length ? (
                <div className="vp-lmenu">
                    {options.map((category) => (
                        <button key={category.id} type="button" className="vp-mi" onClick={() => { onAdd(category.id); setQuery(''); }}>
                            {categoryPath(categories, category.id)}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function ProductAdder({ products, exclude, onAdd, placeholder }) {
    const [query, setQuery] = useState('');
    const options = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        return products.filter((product) => !exclude.has(product.id) && `${product.name} ${product.sku || ''}`.toLowerCase().includes(q)).slice(0, 8);
    }, [products, query, exclude]);
    return (
        <div className="vp-fld">
            <input className="vp-inp" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={placeholder} />
            {options.length ? (
                <div className="vp-lmenu">
                    {options.map((product) => (
                        <button key={product.id} type="button" className="vp-mi" onClick={() => { onAdd(product); setQuery(''); }}>
                            {product.name}<em>{product.sku}</em>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function ProductInspector({ product, isNew, products, categories, brands, theme, saving, onClose, onSave, onDelete, onVariantChange }) {
    const [tab, setTab] = useState('datos');
    const [draft, setDraft] = useState(() => productToDraft(product));
    const [picker, setPicker] = useState(false);

    useEffect(() => {
        setDraft(productToDraft(product));
    }, [product]);

    const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
    const members = variantMembers(products, draft.variant_group).filter((member) => member.id !== product?.id);
    const library = useMemo(() => [...new Set(products.slice(0, 40).flatMap((item) => (item.data?.images || []).map((image) => (typeof image === 'string' ? image : image?.url)).filter(Boolean)))], [products]);
    const fromSystem = product?.sync_status && product.sync_status !== 'manual';
    const tiers = Array.isArray(product?.price_tiers) ? product.price_tiers.filter((tier) => Number(tier?.value) > 0) : [];

    return (
        <SidePanel
            open
            onClose={onClose}
            label="Producto"
            kicker={isNew ? 'Producto nuevo' : `SKU ${product?.sku || '—'} · ${fromSystem ? 'viene de tu sistema' : 'cargado a mano'}`}
            title={draft.name || 'Producto nuevo'}
            media={draft.images[0] ? <img src={draft.images[0]} alt="" className="vp-pimg" style={{ width: 48, height: 48 }} /> : null}
            footer={<>
                {!isNew ? <button type="button" className="vp-btn red" onClick={onDelete} disabled={saving}>Eliminar</button> : null}
                <div className="vp-sp" />
                <button type="button" className="vp-btn soft" onClick={onClose}>Cerrar</button>
                <button type="button" className="vp-btn acc" onClick={() => onSave(draft)} disabled={saving || !draft.name.trim()}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </>}
        >
            <div className="vp-itabs" role="tablist">
                {TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={`vp-it ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>
                ))}
            </div>

            {tab === 'datos' ? (
                <>
                    <div className="vp-fld"><label htmlFor="pi-name">Nombre</label><input id="pi-name" className="vp-inp" value={draft.name} onChange={(event) => set({ name: event.target.value })} /></div>
                    <div className="vp-two">
                        <div className="vp-fld"><label htmlFor="pi-price">Precio</label><input id="pi-price" className="vp-inp" inputMode="decimal" value={draft.price} onChange={(event) => set({ price: event.target.value })} /></div>
                        <div className="vp-fld"><span className="vp-fl">Stock</span>
                            <span className="vp-stk big">
                                <button type="button" onClick={() => set({ stock: Math.max(0, Number(draft.stock || 0) - 1) })} aria-label="Restar uno">−</button>
                                <input aria-label="Stock" value={draft.stock} inputMode="numeric" onChange={(event) => set({ stock: event.target.value.replace(/\D/g, '') })} />
                                <button type="button" onClick={() => set({ stock: Number(draft.stock || 0) + 1 })} aria-label="Sumar uno">+</button>
                            </span>
                        </div>
                    </div>
                    {fromSystem ? <span className="vp-note">Precio y stock llegan de tu sistema: si cambiás el precio acá, la próxima sincronización pone el del sistema, salvo que actives “No pisar mis cambios” (en Más).</span> : null}
                    {tiers.length > 1 ? (
                        <div className="vp-fld"><span className="vp-fl">Precios por lista</span>
                            {tiers.map((tier) => (
                                <div key={tier.key || tier.slot} className="vp-row"><div className="g"><b>{tier.label || `Precio ${tier.slot}`}</b></div><b>${Math.round(Number(tier.value)).toLocaleString('es-AR')}</b></div>
                            ))}
                        </div>
                    ) : null}
                    <div className="vp-fld"><span className="vp-fl">Categorías</span>
                        <div className="vp-chips">
                            {draft.category_ids.map((id) => (
                                <span key={id} className="vp-chip">{categoryPath(categories, id) || 'Categoría'}<button type="button" aria-label="Quitar" onClick={() => set({ category_ids: draft.category_ids.filter((item) => item !== id) })}>×</button></span>
                            ))}
                            {!draft.category_ids.length ? <span className="vp-note">Sin categoría: no aparece en los filtros del catálogo.</span> : null}
                        </div>
                        <CategoryAdder categories={categories} selected={draft.category_ids} onAdd={(id) => set({ category_ids: [...draft.category_ids, id] })} />
                    </div>
                    <div className="vp-fld"><label htmlFor="pi-brand">Marca</label>
                        <Select id="pi-brand" value={draft.brand} onChange={(next) => set({ brand: next })} options={[{ value: '', label: 'Sin marca' }, ...[...new Set([draft.brand, ...brands].filter(Boolean))].map((brand) => ({ value: brand, label: brand }))]} />
                    </div>
                    <div className="vp-row"><div className="g"><b>Visible en la tienda</b><span>Apagalo para ocultarlo sin borrarlo</span></div><button type="button" className={`vp-tog ${draft.is_visible_web ? '' : 'off'}`} role="switch" aria-checked={draft.is_visible_web} aria-label="Visible en la tienda" onClick={() => set({ is_visible_web: !draft.is_visible_web })} /></div>
                    <div className="vp-row"><div className="g"><b>Destacado en Inicio</b><span>Sale en los productos destacados</span></div><button type="button" className={`vp-tog ${draft.is_featured ? '' : 'off'}`} role="switch" aria-checked={draft.is_featured} aria-label="Destacado" onClick={() => set({ is_featured: !draft.is_featured })} /></div>
                    <div className="vp-fld"><label htmlFor="pi-sku">SKU</label><input id="pi-sku" className="vp-inp" value={draft.sku} onChange={(event) => set({ sku: event.target.value })} /></div>
                </>
            ) : null}

            {tab === 'fotos' ? (
                <>
                    <div className="vp-photos">
                        {draft.images.map((src, index) => (
                            <div key={`${src}-${index}`} className={`vp-ph ${index === 0 ? 'main' : ''}`}>
                                <img src={src} alt={`Foto ${index + 1}`} />
                                <div className="vp-ph-acts">
                                    {index > 0 ? <button type="button" onClick={() => set({ images: [src, ...draft.images.filter((_, i) => i !== index)] })} title="Usar como principal">★</button> : null}
                                    <button type="button" onClick={() => set({ images: draft.images.filter((_, i) => i !== index) })} title="Quitar foto" aria-label="Quitar foto">×</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" className="vp-phadd" onClick={() => setPicker(true)}>+ Foto<span>subir o elegir</span></button>
                    </div>
                    <span className="vp-note">La primera es la principal. Tocá ★ para cambiarla.</span>
                    <div className="vp-fld"><label htmlFor="pi-short">Descripción corta</label><input id="pi-short" className="vp-inp" value={draft.short_description} onChange={(event) => set({ short_description: event.target.value })} /><span className="vp-note">Se ve en la tarjeta del producto.</span></div>
                    <div className="vp-fld"><label htmlFor="pi-long">Descripción larga</label><textarea id="pi-long" className="vp-inp vp-ta" value={draft.long_description} onChange={(event) => set({ long_description: event.target.value })} /><span className="vp-note">Se ve adentro del producto.</span></div>
                </>
            ) : null}

            {tab === 'mas' ? (
                <>
                    <div className="vp-fld"><span className="vp-fl">Variantes</span>
                        <span className="vp-note">Productos iguales con distinto sabor o tamaño. En la tienda se ven como una sola tarjeta con un selector.</span>
                        <div className="vp-two">
                            <div className="vp-fld"><label htmlFor="pi-vg">Grupo</label><input id="pi-vg" className="vp-inp" placeholder="Ej: Sabor y color x 10" value={draft.variant_group} onChange={(event) => set({ variant_group: event.target.value })} /></div>
                            <div className="vp-fld"><label htmlFor="pi-vl">Este se llama</label><input id="pi-vl" className="vp-inp" placeholder="Ej: Almendrado" value={draft.variant_label} onChange={(event) => set({ variant_label: event.target.value })} /></div>
                        </div>
                        {draft.variant_group ? (
                            <>
                                <div className="vp-vchips">
                                    {members.map((member) => (
                                        <span key={member.id} className="vp-vchip">
                                            {member.data?.variant_label || member.name}
                                            <button type="button" aria-label={`Sacar ${member.name} del grupo`} onClick={() => onVariantChange(member, null)}>×</button>
                                        </span>
                                    ))}
                                    {!members.length ? <span className="vp-note">Todavía no hay otros productos en este grupo.</span> : null}
                                </div>
                                {!isNew ? <ProductAdder products={products} exclude={new Set([product?.id, ...members.map((member) => member.id)])} placeholder="+ Sumar otro producto al grupo: buscá por nombre…" onAdd={(other) => onVariantChange(other, draft.variant_group)} /> : null}
                            </>
                        ) : null}
                    </div>
                    <div className="vp-fld"><span className="vp-fl">Especificaciones</span>
                        {draft.specifications.map((spec, index) => (
                            <div key={index} className="vp-kv">
                                <input className="vp-inp" aria-label="Dato" placeholder="Ej: Presentación" value={spec.key} onChange={(event) => set({ specifications: draft.specifications.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)) })} />
                                <input className="vp-inp" aria-label="Valor" placeholder="Ej: Bolsa x 10 kg" value={spec.value} onChange={(event) => set({ specifications: draft.specifications.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)) })} />
                                <button type="button" className="vp-x" aria-label="Quitar dato" onClick={() => set({ specifications: draft.specifications.filter((_, i) => i !== index) })}>×</button>
                            </div>
                        ))}
                        <button type="button" className="vp-addc" onClick={() => set({ specifications: [...draft.specifications, { key: '', value: '' }] })}>+ Agregar dato</button>
                    </div>
                    {fromSystem ? (
                        <>
                            <div className="vp-row"><div className="g"><b>No pisar mis cambios</b><span>La sincronización no cambia nombre, SKU, descripción, marca ni precio. El stock se sigue actualizando.</span></div><button type="button" className={`vp-tog ${draft.admin_locked ? '' : 'off'}`} role="switch" aria-checked={draft.admin_locked} aria-label="No pisar mis cambios" onClick={() => set({ admin_locked: !draft.admin_locked })} /></div>
                            <div className="vp-row"><div className="g"><b>Sincronización</b><span>{product?.last_sync_at ? `Última: ${new Date(product.last_sync_at).toLocaleString('es-AR')}` : 'Sin datos de la última vez'}{product?.external_id ? ` · ID ${product.external_id}` : ''}</span></div><span className={`vp-tag ${product?.sync_status === 'synced' ? 'g' : 'y'}`}><i />{product?.sync_status === 'synced' ? 'Al día' : 'Revisar'}</span></div>
                        </>
                    ) : null}
                </>
            ) : null}

            <ImagePickerModal open={picker} onClose={() => setPicker(false)} theme={theme} library={library} onPick={(src) => set({ images: [...draft.images, src] })} />
        </SidePanel>
    );
}
