import React, { useState } from 'react';
import CheckoutEditor from '../../components/admin/evolution/CheckoutEditor';
import { channelChoice } from '../ajustes';

const CHANNELS = [
    ['both', 'WhatsApp o correo', 'El cliente elige cómo te manda el pedido.', ['whatsapp', 'email']],
    ['whatsapp', 'Solo WhatsApp', 'El pedido se arma en la tienda y se envía por WhatsApp. Queda guardado en Pedidos.', ['whatsapp']],
    ['email', 'Solo correo', 'El pedido llega por correo y queda guardado en Pedidos.', ['email']],
];

// Ajustes › Pagos: cómo llega el pedido y el resto de la configuración de compra de siempre.
export default function AjustesPagos({ editor, toast }) {
    const commerce = editor.settings?.commerce || {};
    const choice = channelChoice(commerce.order_channels);
    const [saving, setSaving] = useState(false);

    const setChannels = (channels) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), order_channels: channels } }));

    const save = async () => {
        setSaving(true);
        try {
            const result = await editor.saveCheckoutSettings();
            if (result?.success === false) throw new Error(result.details || result.error);
            toast('Pagos guardados', 'success');
        } catch (err) {
            toast(`No se pudo guardar: ${err.message || 'error'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="vp-scol" style={{ maxWidth: 1120 }}>
            <div className="vp-card vp-sec">
                <h3>¿Cómo te llega el pedido?</h3>
                <div className="vp-three">
                    {CHANNELS.map(([id, label, help, channels]) => (
                        <button key={id} type="button" className={`vp-choice ${choice === id ? 'on' : ''}`} onClick={() => setChannels(channels)}>
                            <b>{label}</b><span>{help}</span>
                            {choice === id ? <span className="ck">Elegido</span> : null}
                        </button>
                    ))}
                </div>
                {choice !== 'email' && !String(commerce.whatsapp_number || '').trim() ? (
                    <div className="vp-lock">Cargá el número de WhatsApp más abajo: sin número, el pedido por WhatsApp no aparece.</div>
                ) : null}
            </div>
            <div className="vp-card vp-legacy" style={{ padding: 18 }}>
                <CheckoutEditor settings={editor.settings} setSettings={editor.setSettings} onSave={save} isSaving={saving} />
            </div>
            <div className="vp-savebar">
                <button type="button" className="vp-btn acc" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar pagos'}</button>
            </div>
        </div>
    );
}
