import React, { useEffect, useMemo, useState } from 'react';
import { errorText, panelFetch } from '../api';
import { formatMoney } from '../format';
import Select from '../components/Select';
import { isClient } from '../clients';
import { buildCategoryTree } from './model';
import { bulkPriceError, bulkPricePayload } from './pricing';

const FIELD_LABEL = { price: 'precio minorista', price_wholesale: 'precio mayorista', both: 'precio minorista y mayorista' };
const TARGETS = [
    { value: 'all', label: 'todos los clientes' },
    { value: 'lists', label: 'los clientes de una lista' },
    { value: 'users', label: 'ciertos clientes' },
];
const EMPTY = { mode: 'raise', amount: '', unit: 'percent', field: 'price', scope: 'all', scopeId: '', target: 'all', listIds: [], userIds: [] };

// Pestaña Cambiar precios del Catálogo: una frase que se arma tocando cada parte, la vista previa abajo
// y recién al tocar Aplicar se cambia algo. Cancelar deja todo como estaba.
export default function Precios({ user, products, categories, brands, toast, onApplied, goOffers }) {
    const [form, setForm] = useState(EMPTY);
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState('');
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [priceLists, setPriceLists] = useState(null);
    const [clients, setClients] = useState(null);

    const set = (patch) => { setForm((value) => ({ ...value, ...patch })); setConfirm(false); };
    const tree = useMemo(() => buildCategoryTree(categories), [categories]);
    const error = bulkPriceError(form);
    const everyone = form.target === 'all';

    // Listas y clientes se piden solo si se eligen.
    useEffect(() => {
        if (form.target === 'lists' && !priceLists) {
            panelFetch('/tenant/price-lists', { user }).then((payload) => setPriceLists(payload.items || [])).catch(() => setPriceLists([]));
        }
        if (form.target === 'users' && !clients) {
            (async () => {
                const all = [];
                for (let page = 1; page <= 20; page += 1) {
                    const payload = await panelFetch(`/tenant/users?page=${page}&limit=50`, { user });
                    all.push(...(payload.items || []));
                    if (all.length >= Number(payload.total || 0) || !(payload.items || []).length) break;
                }
                setClients(all.filter(isClient));
            })().catch(() => setClients([]));
        }
    }, [form.target]); // eslint-disable-line react-hooks/exhaustive-deps

    // Vista previa: se pide sola cada vez que cambia la frase. No cambia nada todavía.
    useEffect(() => {
        if (error) { setPreview(null); setPreviewError(''); return undefined; }
        let alive = true;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const result = await panelFetch('/tenant/products/bulk-price', { method: 'POST', body: bulkPricePayload(form, false), user });
                if (alive) { setPreview(result); setPreviewError(''); }
            } catch (err) {
                if (alive) { setPreview(null); setPreviewError(errorText(err)); }
            } finally {
                if (alive) setLoading(false);
            }
        }, 350);
        return () => { alive = false; clearTimeout(timer); };
    }, [form, error, user]); // eslint-disable-line react-hooks/exhaustive-deps

    const cancel = () => { setForm(EMPTY); setPreview(null); setConfirm(false); };

    const apply = async () => {
        setApplying(true);
        try {
            const result = await panelFetch('/tenant/products/bulk-price', { method: 'POST', body: bulkPricePayload(form, true), user });
            if (everyone) {
                const fresh = await panelFetch('/tenant/products', { user });
                onApplied?.(fresh.items || products);
                toast(`Listo: cambiaste el precio de ${result.changed} productos`, 'success');
            } else {
                toast(`Listo: precio especial para ${result.changed} productos. Lo ves en Catálogo › Ofertas.`, 'success');
            }
            cancel();
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            setApplying(false);
        }
    };

    const listOptions = (priceLists || []).map((list) => ({ value: list.id, label: list.name }));
    const chosenClients = (clients || []).filter((client) => form.userIds.includes(client.id));
    const clientOptions = (clients || []).filter((client) => !form.userIds.includes(client.id)).map((client) => ({ value: client.id, label: client.name || client.full_name || client.email, hint: client.email }));
    const showWholesale = !everyone || form.field !== 'price';
    const showRetail = !everyone || form.field !== 'price_wholesale';
    const modeOptions = [
        { value: 'raise', label: 'Subir', disabled: !everyone },
        { value: 'lower', label: 'Bajar' },
        { value: 'set', label: 'Cambiar a' },
    ];

    return (
        <div className="vp-page">
            <div className="vp-body">
                <div className="vp-card vp-sec" style={{ maxWidth: 1120 }}>
                    <h3>Cambiar precios de muchos productos a la vez</h3>
                    <p>Armá la frase. Abajo ves cómo quedan; no se cambia nada hasta que toques Aplicar.</p>
                    <div className="vp-sentence">
                        <Select variant="slot" ariaLabel="Qué hacer" value={form.mode} onChange={(next) => set({ mode: next })} options={modeOptions} />
                        <span>el</span>
                        {everyone
                            ? <Select variant="slot" ariaLabel="Qué precio" value={form.field} onChange={(next) => set({ field: next })} options={Object.entries(FIELD_LABEL).map(([id, label]) => ({ value: id, label }))} />
                            : <span className="vp-slotfix">precio</span>}
                        <span>{form.mode === 'set' ? 'a' : 'un'}</span>
                        <input className="vp-slot" aria-label="Cuánto" inputMode="decimal" placeholder={form.unit === 'percent' && form.mode !== 'set' ? '8' : '1.500'} value={form.amount} onChange={(event) => set({ amount: event.target.value })} />
                        {form.mode === 'set' ? <span>pesos</span> : (
                            <Select variant="slot" ariaLabel="En porcentaje o pesos" value={form.unit} onChange={(next) => set({ unit: next })} options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'pesos' }]} />
                        )}
                        <span>de</span>
                        <Select variant="slot" ariaLabel="A qué productos" value={form.scope} onChange={(next) => set({ scope: next, scopeId: '' })} options={[{ value: 'all', label: 'todo el catálogo' }, { value: 'category', label: 'un rubro o categoría' }, { value: 'brand', label: 'una marca' }]} />
                        {form.scope === 'category' ? (
                            <Select variant="slot" ariaLabel="Categoría" placeholder="elegí…" value={form.scopeId} onChange={(next) => set({ scopeId: next })} options={tree.map((category) => ({ value: category.id, label: category.name, depth: category.depth }))} />
                        ) : null}
                        {form.scope === 'brand' ? (
                            <Select variant="slot" ariaLabel="Marca" placeholder="elegí…" value={form.scopeId} onChange={(next) => set({ scopeId: next })} options={brands.map((brand) => ({ value: brand, label: brand }))} />
                        ) : null}
                        <span>para</span>
                        <Select variant="slot" ariaLabel="Para quién" value={form.target} onChange={(next) => set({ target: next, mode: next !== 'all' && form.mode === 'raise' ? 'lower' : form.mode })} options={TARGETS} />
                        {form.target === 'lists' ? (
                            <Select variant="slot" ariaLabel="Lista de precios" placeholder={priceLists ? 'elegí la lista…' : 'cargando…'} value={form.listIds[0] || ''} onChange={(next) => set({ listIds: [next] })} options={listOptions} />
                        ) : null}
                        {form.target === 'users' ? (
                            <Select variant="slot" ariaLabel="Sumar un cliente" placeholder={clients ? (form.userIds.length ? '+ otro cliente' : 'elegí clientes…') : 'cargando…'} value="" onChange={(next) => set({ userIds: [...form.userIds, next] })} options={clientOptions} />
                        ) : null}
                    </div>
                    {form.target === 'users' && chosenClients.length ? (
                        <div className="vp-chips">
                            {chosenClients.map((client) => (
                                <span key={client.id} className="vp-chip">{client.name || client.full_name || client.email}<button type="button" aria-label={`Quitar ${client.email}`} onClick={() => set({ userIds: form.userIds.filter((id) => id !== client.id) })}>×</button></span>
                            ))}
                        </div>
                    ) : null}
                    <span className="vp-note">
                        {everyone
                            ? 'Cambia el precio del producto: lo ven todos los clientes.'
                            : <>Para ellos se crea un precio especial y el resto sigue viendo el precio de siempre. Después lo encontrás en {goOffers ? <button type="button" className="vp-link" onClick={goOffers}>Catálogo › Ofertas</button> : 'Catálogo › Ofertas'}.</>}
                    </span>
                </div>

                <div className="vp-card vp-sec" style={{ maxWidth: 1120, marginTop: 18 }}>
                    <h3>Cómo quedan</h3>
                    {error ? <div className="vp-note">{error}</div> : null}
                    {!error && loading && !preview ? <div className="vp-note">Calculando…</div> : null}
                    {!error && previewError ? <div className="vp-lock">No se pudo calcular: {previewError}</div> : null}
                    {!error && preview ? (
                        <>
                            <p>
                                {preview.changed
                                    ? <>{everyone ? 'Cambia el precio de' : 'Precio especial en'} <b>{preview.changed}</b> de {preview.matched} productos{preview.matched > preview.changed ? (everyone ? ' (los demás ya tienen ese precio o están en $0)' : ' (en los demás el precio ya es igual o menor)') : ''}.</>
                                    : `Ningún producto cambia con esta frase (${preview.matched} productos revisados). Puede ser que tengan ese precio en /usr/bin/bash o que ya valgan eso.`}
                            </p>
                            {everyone && preview.synced_unlocked ? (
                                <div className="vp-lock">
                                    <b>{preview.synced_unlocked}</b> de estos productos vienen de tu sistema de gestión. En la próxima sincronización
                                    vuelven al precio del sistema, salvo los que tengan activado “No pisar mis cambios”.
                                </div>
                            ) : null}
                            {preview.sample.length ? (
                                <div className="vp-tblw">
                                    <table className="vp-ltbl vp-prevtbl">
                                        <thead><tr><th>Producto</th>{showRetail ? <th>Minorista</th> : null}{showWholesale ? <th>Mayorista</th> : null}</tr></thead>
                                        <tbody>
                                            {preview.sample.map((row) => (
                                                <tr key={row.id}>
                                                    <td data-label="Producto"><b>{row.name}</b></td>
                                                    {showRetail ? <td data-label="Minorista">{formatMoney(row.before.price)} → <b className={row.after.price < row.before.price ? 'dn' : row.after.price > row.before.price ? 'up' : ''}>{formatMoney(row.after.price)}</b></td> : null}
                                                    {showWholesale ? <td data-label="Mayorista">{formatMoney(row.before.price_wholesale)} → <b className={row.after.price_wholesale < row.before.price_wholesale ? 'dn' : row.after.price_wholesale > row.before.price_wholesale ? 'up' : ''}>{formatMoney(row.after.price_wholesale)}</b></td> : null}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                            {preview.changed > preview.sample.length ? <span className="vp-note">y {preview.changed - preview.sample.length} productos más.</span> : null}
                        </>
                    ) : null}
                    <div className="vp-prevact">
                        {confirm && preview?.changed ? <span className="vp-note">{everyone ? 'Se cambia enseguida en la tienda.' : 'Se crea el precio especial y se ve enseguida en la tienda.'}</span> : null}
                        <button type="button" className="vp-btn soft" onClick={cancel} disabled={applying}>Cancelar</button>
                        {confirm ? (
                            <button type="button" className="vp-btn acc" onClick={apply} disabled={applying || !preview?.changed}>{applying ? 'Aplicando…' : `Sí, aplicar a ${preview?.changed || 0} productos`}</button>
                        ) : (
                            <button type="button" className="vp-btn acc" onClick={() => setConfirm(true)} disabled={Boolean(error) || !preview?.changed || loading}>Aplicar</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
