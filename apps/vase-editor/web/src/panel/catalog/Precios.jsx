import React, { useEffect, useMemo, useState } from 'react';
import { errorText, panelFetch } from '../api';
import { formatMoney } from '../format';
import Select from '../components/Select';
import { buildCategoryTree } from './model';
import { bulkPriceError, bulkPricePayload } from './pricing';

const FIELD_LABEL = { price: 'precio minorista', price_wholesale: 'precio mayorista', both: 'precio minorista y mayorista' };

// Pestaña Cambiar precios del Catálogo: una frase que se arma tocando cada parte.
export default function Precios({ user, products, categories, brands, toast, onApplied, goSettings }) {
    const [form, setForm] = useState({ mode: 'raise', amount: '', unit: 'percent', field: 'price', scope: 'all', scopeId: '' });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const set = (patch) => { setForm((value) => ({ ...value, ...patch })); setConfirm(false); };
    const tree = useMemo(() => buildCategoryTree(categories), [categories]);
    const error = bulkPriceError(form);

    // Vista previa: se pide sola cada vez que cambia la frase.
    useEffect(() => {
        if (error) { setPreview(null); return undefined; }
        let alive = true;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const result = await panelFetch('/tenant/products/bulk-price', { method: 'POST', body: bulkPricePayload(form, false), user });
                if (alive) setPreview(result);
            } catch (err) {
                if (alive) { setPreview(null); toast(errorText(err), 'error'); }
            } finally {
                if (alive) setLoading(false);
            }
        }, 350);
        return () => { alive = false; clearTimeout(timer); };
    }, [form, error, user]); // eslint-disable-line react-hooks/exhaustive-deps

    const apply = async () => {
        setApplying(true);
        try {
            const result = await panelFetch('/tenant/products/bulk-price', { method: 'POST', body: bulkPricePayload(form, true), user });
            const fresh = await panelFetch('/tenant/products', { user });
            onApplied?.(fresh.items || products);
            toast(`Listo: cambiaste el precio de ${result.changed} productos`, 'success');
            setConfirm(false);
            setForm((value) => ({ ...value, amount: '' }));
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            setApplying(false);
        }
    };

    const showWholesale = form.field !== 'price';
    const showRetail = form.field !== 'price_wholesale';

    return (
        <div className="vp-page">
            <div className="vp-body">
                <div className="vp-card vp-sec" style={{ maxWidth: 1120 }}>
                    <h3>Cambiar precios de muchos productos a la vez</h3>
                    <p>Armá la frase. Abajo ves cómo quedan antes de aplicar.</p>
                    <div className="vp-sentence">
                        <Select variant="slot" ariaLabel="Qué hacer" value={form.mode} onChange={(next) => set({ mode: next })} options={[{ value: 'raise', label: 'Subir' }, { value: 'lower', label: 'Bajar' }, { value: 'set', label: 'Cambiar a' }]} />
                        <span>el</span>
                        <Select variant="slot" ariaLabel="Qué precio" value={form.field} onChange={(next) => set({ field: next })} options={Object.entries(FIELD_LABEL).map(([id, label]) => ({ value: id, label }))} />
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
                    </div>
                    <span className="vp-note">
                        ¿Precios distintos solo para algunos clientes? Usá una oferta o una lista en{' '}
                        <button type="button" className="vp-link" onClick={() => goSettings('precios')}>Ajustes › Precios y listas</button>.
                    </span>
                </div>

                <div className="vp-card vp-sec" style={{ maxWidth: 1120, marginTop: 18 }}>
                    <h3>Cómo quedan</h3>
                    {error ? <p>{error}</p> : null}
                    {!error && loading && !preview ? <p>Calculando…</p> : null}
                    {!error && preview ? (
                        <>
                            <p>
                                Cambia el precio de <b>{preview.changed}</b> de {preview.matched} productos
                                {preview.matched > preview.changed ? ' (los demás ya tienen ese precio o están en $0)' : ''}.
                            </p>
                            {preview.synced_unlocked ? (
                                <div className="vp-lock">
                                    <b>{preview.synced_unlocked}</b> de estos productos vienen de tu sistema de gestión. En la próxima sincronización
                                    vuelven al precio del sistema, salvo los que tengan activado “No pisar mis cambios”.
                                </div>
                            ) : null}
                            {preview.sample.length ? (
                                <table className="vp-tbl">
                                    <thead><tr><th>Producto</th>{showRetail ? <th className="r">Minorista</th> : null}{showWholesale ? <th className="r">Mayorista</th> : null}</tr></thead>
                                    <tbody>
                                        {preview.sample.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.name}</td>
                                                {showRetail ? <td className="r">{formatMoney(row.before.price)} → <b>{formatMoney(row.after.price)}</b></td> : null}
                                                {showWholesale ? <td className="r">{formatMoney(row.before.price_wholesale)} → <b>{formatMoney(row.after.price_wholesale)}</b></td> : null}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : null}
                            {preview.changed > preview.sample.length ? <span className="vp-note">y {preview.changed - preview.sample.length} productos más.</span> : null}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                {confirm ? (
                                    <>
                                        <span className="vp-note" style={{ alignSelf: 'center' }}>Se aplica enseguida en la tienda.</span>
                                        <button type="button" className="vp-btn soft" onClick={() => setConfirm(false)}>Cancelar</button>
                                        <button type="button" className="vp-btn acc" onClick={apply} disabled={applying}>{applying ? 'Aplicando…' : `Sí, cambiar ${preview.changed} precios`}</button>
                                    </>
                                ) : (
                                    <button type="button" className="vp-btn acc" onClick={() => setConfirm(true)} disabled={!preview.changed}>Aplicar</button>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
