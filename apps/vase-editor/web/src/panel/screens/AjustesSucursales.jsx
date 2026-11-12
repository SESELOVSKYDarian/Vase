import React, { useState } from 'react';
import PlaceSearch from '../envios/PlaceSearch';
import { branchLocated } from '../envios/model';
import { PanelTag } from '@vase/ui/panel/pieces';

const newBranch = () => ({ id: `branch-${Date.now()}`, name: '', address: '', hours: '', phone: '', pickup_fee: 0, enabled: true, latitude: null, longitude: null });

function MiNegocioNote({ editUrl, children }) {
    return (
        <div className="vp-card vp-sec vp-fromvase">
            <span>{children}</span>
            <a className="vp-btn line sm" href={editUrl} target="_blank" rel="noreferrer">Editar en Mi negocio</a>
        </div>
    );
}

// Ajustes › Sucursales y retiro: dónde están, horarios y si se puede retirar.
export default function AjustesSucursales({ editor, toast, goEnvios }) {
    const branches = Array.isArray(editor.settings?.commerce?.branches) ? editor.settings.commerce.branches : [];
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [locating, setLocating] = useState(null);
    // Conectada a Mi negocio: nombre, dirección, teléfono y horarios se cargan allá.
    const fromVase = Boolean(editor.settings?.vase_profile?.connected && branches.some((branch) => branch.vase_id));
    const editUrl = editor.settings?.vase_profile?.edit_url;

    const update = (next) => {
        editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), branches: next } }));
        setDirty(true);
    };
    const set = (index, patch) => update(branches.map((branch, i) => (i === index ? { ...branch, ...patch } : branch)));

    const save = async () => {
        if (branches.some((branch) => !String(branch.name || '').trim())) {
            toast('Cada sucursal necesita un nombre.', 'error');
            return;
        }
        setSaving(true);
        try {
            const result = await editor.saveShippingSettings();
            if (result?.success === false) throw new Error(result.details || result.error);
            setDirty(false);
            toast('Sucursales guardadas', 'success');
        } catch (err) {
            toast(`No se pudieron guardar: ${err.message || 'error'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: 860 }}>
            <div className="vp-scol">
                {fromVase ? <MiNegocioNote editUrl={editUrl}>Nombre, dirección, teléfono y horarios de cada sucursal se cargan en Mi negocio y se usan en todos tus productos. Acá elegís la ubicación en el mapa.</MiNegocioNote> : null}
                {branches.map((branch, index) => (
                    <div key={branch.id || index} className="vp-card vp-sec">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h3 style={{ flex: 1 }}>{branch.name || 'Sucursal nueva'}</h3>
                            {branchLocated(branch) ? <PanelTag tone="g">En el mapa</PanelTag> : <PanelTag tone="y">Sin ubicar</PanelTag>}
                            {fromVase ? null : <button type="button" className="vp-btn red sm" onClick={() => update(branches.filter((_, i) => i !== index))}>Quitar</button>}
                        </div>
                        <div className="vp-big2">
                            <div className="vp-fld"><label htmlFor={`b-name-${index}`}>Nombre</label><input id={`b-name-${index}`} className="vp-inp" readOnly={fromVase} value={branch.name || ''} onChange={(event) => set(index, { name: event.target.value })} placeholder="Ej.: Mar del Plata" /></div>
                            <div className="vp-fld"><label htmlFor={`b-phone-${index}`}>Teléfono</label><input id={`b-phone-${index}`} className="vp-inp" readOnly={fromVase} value={branch.phone || ''} onChange={(event) => set(index, { phone: event.target.value })} /></div>
                        </div>
                        <div className="vp-fld"><label htmlFor={`b-addr-${index}`}>Dirección</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input id={`b-addr-${index}`} className="vp-inp" readOnly={fromVase} value={branch.address || ''} onChange={(event) => set(index, { address: event.target.value })} />
                                <button type="button" className="vp-btn line" onClick={() => setLocating(locating === index ? null : index)}>{locating === index ? 'Cerrar' : 'Ubicar en el mapa'}</button>
                            </div>
                        </div>
                        {locating === index ? (
                            <PlaceSearch placeholder="Buscá la dirección" onPick={(place) => { set(index, { latitude: Number(place.lat), longitude: Number(place.lon), address: branch.address || place.display_name.split(',').slice(0, 3).join(',') }); setLocating(null); }} />
                        ) : null}
                        <div className="vp-fld"><label htmlFor={`b-hours-${index}`}>Horarios</label><input id={`b-hours-${index}`} className="vp-inp" readOnly={fromVase} value={branch.hours || ''} onChange={(event) => set(index, { hours: event.target.value })} placeholder="Lun a vie 8 a 17 h" /></div>
                        <span className="vp-note">Los clientes pueden retirar acá y la distancia de los envíos se mide desde la sucursal más cercana.</span>
                    </div>
                ))}
                {!branches.length ? <div className="vp-empty">Todavía no cargaste sucursales.</div> : null}
                <div style={{ display: 'flex', gap: 10 }}>
                    {fromVase ? null : <button type="button" className="vp-btn soft" onClick={() => update([...branches, newBranch()])}>+ Sucursal</button>}
                    <button type="button" className="vp-link" onClick={goEnvios}>Configurar los envíos ›</button>
                </div>
            </div>
            <div className="vp-savebar">
                <span className="vp-note" style={{ alignSelf: 'center' }}>{dirty ? 'Tenés cambios sin guardar.' : 'Todo guardado.'}</span>
                <button type="button" className="vp-btn acc" onClick={save} disabled={saving || !dirty}>{saving ? 'Guardando…' : 'Guardar sucursales'}</button>
            </div>
        </div>
    );
}
