import React, { useEffect, useMemo, useState } from 'react';
import ShippingMap, { RING_COLORS } from './ShippingMap';
import PlaceSearch from './PlaceSearch';
import { formatMoney } from '../format';
import {
    branchLocated,
    isSpecialZone,
    mergeShippingZones,
    polygonFromBoundingBox,
    quoteForDistance,
    tiersError,
    zonesToTiers,
} from './model';
import { PanelTag } from '@vase/ui/panel/pieces';

// Envíos: desde dónde salís, cuánto cobrás por distancia y qué pasa si queda lejos.
export default function Envios({ editor, toast, theme, goSettings }) {
    const commerce = editor.settings?.commerce || {};
    const zones = Array.isArray(commerce.shipping_zones) ? commerce.shipping_zones : [];
    const branches = Array.isArray(commerce.branches) ? commerce.branches : [];

    const [tiers, setTiers] = useState(() => zonesToTiers(zones));
    const [specials, setSpecials] = useState(() => zones.filter(isSpecialZone));
    const [editingBranch, setEditingBranch] = useState(null);
    const [simKm, setSimKm] = useState('');
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const error = tiersError(tiers);
    const located = branches.filter(branchLocated);
    const sim = simKm !== '' ? quoteForDistance(tiers, Number(simKm)) : null;
    const otherZones = zones.filter((zone) => String(zone.type || '').toLowerCase() !== 'distance' && !isSpecialZone(zone) && zone.enabled !== false);

    const touch = (fn) => { fn(); setDirty(true); };
    const setTier = (index, patch) => touch(() => setTiers((list) => list.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))));
    const addTier = () => touch(() => setTiers((list) => {
        const last = Math.max(0, ...list.map((tier) => tier.max_km || 0));
        return [...list.filter((tier) => tier.max_km !== null), { id: `ring-${Date.now()}`, max_km: last + 3, price: 0, per_km: 0 }, ...list.filter((tier) => tier.max_km === null)];
    }));
    const removeTier = (index) => touch(() => setTiers((list) => list.filter((_, i) => i !== index)));
    const setSpecial = (index, patch) => touch(() => setSpecials((list) => list.map((zone, i) => (i === index ? { ...zone, ...patch } : zone))));

    const updateBranches = (next) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), branches: next } }));
    const setBranch = (index, patch) => { updateBranches(branches.map((branch, i) => (i === index ? { ...branch, ...patch } : branch))); setDirty(true); };

    const [pendingSave, setPendingSave] = useState(false);
    const save = () => {
        if (error) return;
        setSaving(true);
        editor.setSettings((prev) => ({
            ...prev,
            commerce: { ...(prev?.commerce || {}), shipping_zones: mergeShippingZones(prev?.commerce?.shipping_zones || [], tiers, specials) },
        }));
        setPendingSave(true);
    };
    // Se guarda cuando la configuración nueva ya está en el estado del editor.
    useEffect(() => {
        if (!pendingSave) return;
        setPendingSave(false);
        (async () => {
            try {
                const result = await editor.saveShippingSettings();
                if (result?.success === false) throw new Error(result.details || result.error);
                setDirty(false);
                toast('Envíos guardados', 'success');
            } catch (err) {
                toast(`No se pudieron guardar los envíos: ${err.message || 'error'}`, 'error');
            } finally {
                setSaving(false);
            }
        })();
    }, [pendingSave, editor.settings]); // eslint-disable-line react-hooks/exhaustive-deps

    const tierRows = useMemo(() => tiers.map((tier, index) => ({ tier, index, from: index === 0 ? 0 : tiers[index - 1].max_km })), [tiers]);

    return (
        <div className="vp-page">
            <div className="vp-body">
                <div className="vp-envgrid">
                    <div className="vp-scol">
                        <div className="vp-stepc">
                            <span className="vp-stepn">1</span>
                            <div className="g">
                                <b>¿Desde dónde enviás?</b>
                                <span className="vp-note">La distancia se mide desde la sucursal más cercana al cliente.</span>
                                {branches.map((branch, index) => (
                                    <div key={branch.id || index}>
                                        <div className="vp-row">
                                            <div className="g"><b>{branch.name || `Sucursal ${index + 1}`}</b><span>{branch.address || 'Sin dirección'}</span></div>
                                            {branchLocated(branch) ? <PanelTag tone="g">En el mapa</PanelTag> : <PanelTag tone="y">Sin ubicar</PanelTag>}
                                            <button type="button" className="vp-btn line sm" onClick={() => setEditingBranch(editingBranch === index ? null : index)}>{editingBranch === index ? 'Listo' : 'Ubicar'}</button>
                                        </div>
                                        {editingBranch === index ? (
                                            <PlaceSearch
                                                placeholder="Buscá la dirección de la sucursal"
                                                onPick={(place) => setBranch(index, { address: branch.address || place.display_name.split(',').slice(0, 3).join(','), latitude: Number(place.lat), longitude: Number(place.lon) })}
                                            />
                                        ) : null}
                                    </div>
                                ))}
                                {!branches.length ? <span className="vp-note">Todavía no cargaste sucursales.</span> : null}
                                <button type="button" className="vp-link" style={{ alignSelf: 'flex-start' }} onClick={() => goSettings('sucursales')}>Agregar o editar sucursales en Ajustes ›</button>
                            </div>
                        </div>

                        <div className="vp-stepc">
                            <span className="vp-stepn">2</span>
                            <div className="g">
                                <b>¿Cuánto cobrás según la distancia?</b>
                                {tierRows.map(({ tier, index, from }) => (
                                    <div key={tier.id || index} className="vp-ringrow">
                                        <i style={{ background: RING_COLORS[index % RING_COLORS.length] }} />
                                        <span>{tier.max_km === null ? `Más de ${from || 0} km` : `De ${from || 0} a`}</span>
                                        {tier.max_km === null ? <span /> : (
                                            <label className="vp-search"><input inputMode="decimal" aria-label="Hasta cuántos km" value={tier.max_km} onChange={(event) => setTier(index, { max_km: event.target.value === '' ? '' : Number(event.target.value) })} />km</label>
                                        )}
                                        <label className="vp-search">$<input inputMode="decimal" aria-label="Precio del envío" value={tier.price} onChange={(event) => setTier(index, { price: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
                                        <button type="button" className="vp-x" aria-label="Quitar tramo" onClick={() => removeTier(index)}>×</button>
                                        {tier.per_km ? <span className="vp-note" style={{ gridColumn: '2 / -1' }}>Además suma {formatMoney(tier.per_km)} por km.</span> : null}
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="vp-btn soft sm" onClick={addTier}>+ Tramo</button>
                                </div>
                                {error ? <span className="vp-note" style={{ color: 'var(--red)' }}>{error}</span> : null}
                                <span className="vp-note">Poné $0 para que el envío sea gratis en ese tramo.</span>
                            </div>
                        </div>

                        <div className="vp-stepc">
                            <span className="vp-stepn">3</span>
                            <div className="g">
                                <b>Si queda más lejos</b>
                                <span className="vp-note">No se hace el envío. El cliente puede elegir <b>retirar en una sucursal</b>{located.length ? ` (${located.map((branch) => branch.name).filter(Boolean).join(', ')})` : ''}.</span>
                            </div>
                        </div>

                        <div className="vp-card vp-sec">
                            <h3>Zonas especiales <span className="vp-note">opcional</span></h3>
                            <p>Un barrio o una localidad con su propio precio. Si el cliente está adentro, se cobra el precio de la zona especial.</p>
                            {specials.map((zone, index) => (
                                <div key={zone.id || index} className="vp-row">
                                    <div className="g"><input className="vp-inp" aria-label="Nombre de la zona" value={zone.name} onChange={(event) => setSpecial(index, { name: event.target.value })} /></div>
                                    <label className="vp-search" style={{ width: 130 }}>$<input inputMode="decimal" aria-label={`Precio de ${zone.name}`} value={zone.price} onChange={(event) => setSpecial(index, { price: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
                                    <button type="button" className="vp-x" aria-label={`Quitar ${zone.name}`} onClick={() => touch(() => setSpecials((list) => list.filter((_, i) => i !== index)))}>×</button>
                                </div>
                            ))}
                            <PlaceSearch
                                placeholder="+ Agregar zona: buscá un barrio o localidad"
                                onPick={(place) => {
                                    const polygon = polygonFromBoundingBox(place.boundingbox);
                                    if (polygon.length < 3) { toast('Ese lugar no tiene un área para usar como zona.', 'error'); return; }
                                    touch(() => setSpecials((list) => [...list, { id: `special-${Date.now()}`, name: place.name || place.display_name.split(',')[0], description: place.display_name, type: 'flat', enabled: true, price: 0, polygon }]));
                                }}
                            />
                        </div>

                        {otherZones.length ? (
                            <span className="vp-note">También tenés {otherZones.length} zona(s) de precio fijo sin mapa ({otherZones.map((zone) => zone.name).join(', ')}). Se mantienen como están.</span>
                        ) : null}
                    </div>

                    <div className="vp-scol vp-envmap">
                        <ShippingMap branches={branches} tiers={tiers.filter((tier) => tier.max_km !== '')} specials={specials} theme={theme} />
                        <div className="vp-card vp-sec">
                            <h3>Probá un envío</h3>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span>Un cliente a</span>
                                <label className="vp-search" style={{ width: 110 }}><input inputMode="decimal" aria-label="Distancia de prueba" value={simKm} onChange={(event) => setSimKm(event.target.value)} />km</label>
                                <b>{sim ? (sim.ok ? (sim.price > 0 ? `paga ${formatMoney(sim.price)}` : 'tiene envío gratis') : 'no tiene envío: retira en sucursal') : ''}</b>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="vp-savebar">
                    <span className="vp-note" style={{ alignSelf: 'center' }}>{dirty ? 'Tenés cambios sin guardar.' : 'Todo guardado.'}</span>
                    <button type="button" className="vp-btn acc" onClick={save} disabled={saving || Boolean(error) || !dirty}>{saving ? 'Guardando…' : 'Guardar envíos'}</button>
                </div>
            </div>
        </div>
    );
}
