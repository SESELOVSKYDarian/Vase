import React, { useState } from 'react';
import { channelChoice, paymentMethodsToggle, taxPercent, taxRateFromPercent, whatsappPreview } from '../ajustes';

const CHANNELS = [
    ['both', 'WhatsApp o correo', 'El cliente elige cómo te manda el pedido.', ['whatsapp', 'email']],
    ['whatsapp', 'Solo WhatsApp', 'El carrito arma el mensaje y abre WhatsApp. El pedido queda guardado en Pedidos.', ['whatsapp']],
    ['email', 'Solo correo', 'El pedido llega por correo y queda guardado en Pedidos.', ['email']],
];

const METHODS = [
    ['transfer', 'Transferencia bancaria', 'El cliente ve tus datos y sube el comprobante. Te llega a Pedidos.'],
    ['cash_on_pickup', 'Pago en el local', 'Paga cuando retira en la sucursal.'],
];

const TEXTS = [
    ['customer_order_processing_label', 'Estado que ve el cliente', 'En preparacion', false],
    ['admin_order_confirmation_label', 'Estado que ves vos en Pedidos', 'Pago por revisar', false],
    ['customer_order_processing_text', 'Mensaje de gracias al cliente', 'Recibimos tu pedido y ya estamos preparando tu compra. Te avisaremos cuando quede lista para entrega o retiro.', true],
    ['customer_payment_approved_subject', 'Cuando el pago se aprueba · asunto', 'Pago aprobado de tu pedido', false],
    ['customer_payment_cancelled_subject', 'Cuando el pago se cancela · asunto', 'Actualizacion de tu pedido', false],
    ['customer_payment_approved_text', 'Cuando el pago se aprueba · texto', 'Confirmamos tu pago. Tu pedido ya paso a preparacion y te avisaremos el siguiente paso.', true],
    ['customer_payment_cancelled_text', 'Cuando el pago se cancela · texto', 'No pudimos validar tu pago. Si quieres, vuelve a enviar el comprobante o contactanos por WhatsApp.', true],
    ['admin_order_confirmation_text', 'Aviso que te llega por pedido nuevo', 'Llego un pedido nuevo con comprobante pendiente. Revisa el panel, valida el pago y cambia el estado.', true],
];

// Ajustes › Pagos: cómo llega el pedido, cómo te pagan y los textos que ve el cliente.
export default function AjustesPagos({ editor, toast, onSave, storeName }) {
    const commerce = editor.settings?.commerce || {};
    const bank = commerce.bank_transfer || {};
    const choice = channelChoice(commerce.order_channels);
    const methods = Array.isArray(commerce.payment_methods) && commerce.payment_methods.length ? commerce.payment_methods : ['transfer', 'cash_on_pickup'];
    const [saving, setSaving] = useState(false);
    const [taxDraft, setTaxDraft] = useState(null);

    const set = (patch) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), ...patch } }));
    const setBank = (patch) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), bank_transfer: { ...((prev?.commerce || {}).bank_transfer || {}), ...patch } } }));
    const toggleMethod = (method) => {
        const next = paymentMethodsToggle(methods, method);
        if (next === methods) { toast('Dejá al menos una forma de pago.', 'error'); return; }
        set({ payment_methods: next });
    };

    const save = async () => {
        setSaving(true);
        try {
            const result = await editor.saveCheckoutSettings();
            if (result?.success === false) throw new Error(result.details || result.error);
            // El resto de los datos de compra (razón social, formas de pago) viaja con los ajustes de la tienda.
            await onSave?.();
        } catch (err) {
            toast(`No se pudo guardar: ${err.message || 'error'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const highlight = ['alias', 'cbu'].includes(bank.highlight) ? bank.highlight : '';
    const shown = highlight ? String(bank[highlight] || '').trim() : '';
    const rest = [
        highlight !== 'cbu' && bank.cbu ? `CBU ${bank.cbu}` : '',
        highlight !== 'alias' && bank.alias ? `Alias ${bank.alias}` : '',
        bank.bank,
        bank.holder,
    ].filter(Boolean).join(' · ');

    return (
        <div className="vp-scol vp-pagos">
            <div className="vp-card vp-sec">
                <h3>¿Cómo te llega el pedido?</h3>
                <div className="vp-three">
                    {CHANNELS.map(([id, label, help, channels]) => (
                        <button key={id} type="button" className={`vp-choice ${choice === id ? 'on' : ''}`} onClick={() => set({ order_channels: channels })}>
                            <b>{label}</b><span>{help}</span>
                            {choice === id ? <span className="ck">Elegido</span> : null}
                        </button>
                    ))}
                </div>
            </div>

            <div className="vp-pgrid">
                <div className="vp-card vp-sec">
                    <h3>WhatsApp que recibe los pedidos</h3>
                    <div className="vp-fld">
                        <label htmlFor="pg-wa">Número con código de área</label>
                        <input id="pg-wa" className="vp-inp" inputMode="tel" placeholder="+54 223 555 1234" value={commerce.whatsapp_number || ''} onChange={(event) => set({ whatsapp_number: event.target.value })} />
                    </div>
                    {choice !== 'email' && !String(commerce.whatsapp_number || '').trim() ? <div className="vp-lock">Sin número, el pedido por WhatsApp no aparece en la tienda.</div> : null}
                    <div className="vp-wabub">
                        <span className="vp-fl">Así le llega el mensaje</span>
                        <p>{whatsappPreview(storeName)}</p>
                    </div>
                </div>

                <div className="vp-card vp-sec">
                    <h3>IVA y datos legales</h3>
                    <div className="vp-fld">
                        <label htmlFor="pg-iva">IVA que se suma al total</label>
                        <span className="vp-pct">
                            <input id="pg-iva" inputMode="decimal" value={taxDraft ?? taxPercent(commerce.tax_rate)} onChange={(event) => setTaxDraft(event.target.value)} onBlur={() => { if (taxDraft !== null) { set({ tax_rate: taxRateFromPercent(taxDraft) }); setTaxDraft(null); } }} />
                            <span>%</span>
                        </span>
                        <span className="vp-note">Poné 0 si tus precios ya incluyen IVA.</span>
                    </div>
                    <div className="vp-fld">
                        <label htmlFor="pg-legal">Razón social (para términos y condiciones)</label>
                        <input id="pg-legal" className="vp-inp" placeholder="Tu empresa S.R.L." value={commerce.legal_company_name || ''} onChange={(event) => set({ legal_company_name: event.target.value })} />
                    </div>
                </div>
            </div>

            <div className="vp-card vp-sec">
                <h3>Formas de pago</h3>
                {METHODS.map(([id, label, help]) => (
                    <div key={id} className="vp-row">
                        <div className="g"><b>{label}</b><span>{help}</span></div>
                        <button type="button" role="switch" aria-checked={methods.includes(id)} aria-label={label} className={`vp-tog ${methods.includes(id) ? '' : 'off'}`} onClick={() => toggleMethod(id)} />
                    </div>
                ))}
            </div>

            {methods.includes('transfer') ? (
                <div className="vp-card vp-sec">
                    <h3>Transferencia bancaria</h3>
                    <p>Los datos que ve el cliente al terminar la compra.</p>
                    <div className="vp-two2">
                        <div className="vp-fld"><label htmlFor="pg-bank">Banco</label><input id="pg-bank" className="vp-inp" placeholder="Banco Galicia" value={bank.bank || ''} onChange={(event) => setBank({ bank: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="pg-holder">Titular</label><input id="pg-holder" className="vp-inp" placeholder="Mi Negocio SRL" value={bank.holder || ''} onChange={(event) => setBank({ holder: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="pg-cbu">CBU / CVU</label><input id="pg-cbu" className="vp-inp" inputMode="numeric" placeholder="0000003100000000000001" value={bank.cbu || ''} onChange={(event) => setBank({ cbu: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="pg-alias">Alias</label><input id="pg-alias" className="vp-inp" placeholder="mi-negocio.ventas" value={bank.alias || ''} onChange={(event) => setBank({ alias: event.target.value })} /></div>
                    </div>
                    <div className="vp-fld">
                        <span className="vp-fl">Qué se muestra grande</span>
                        <div className="vp-seg" style={{ maxWidth: 360 }}>
                            <button type="button" className={highlight === 'alias' ? 'on' : ''} onClick={() => setBank({ highlight: 'alias' })}>Alias</button>
                            <button type="button" className={highlight === 'cbu' ? 'on' : ''} onClick={() => setBank({ highlight: 'cbu' })}>CBU</button>
                            <button type="button" className={!highlight ? 'on' : ''} onClick={() => setBank({ highlight: '' })}>Todo igual</button>
                        </div>
                    </div>
                    <div className="vp-tprev" aria-label="Así lo ve el cliente">
                        {highlight ? (
                            <>
                                <small>{highlight === 'cbu' ? 'CBU' : 'Alias'} para transferir</small>
                                <b>{shown || `Cargá el ${highlight === 'cbu' ? 'CBU' : 'alias'} arriba`}</b>
                            </>
                        ) : <small>El cliente ve los cuatro datos del mismo tamaño.</small>}
                        <span>{rest || 'Completá los datos de arriba.'}</span>
                    </div>
                </div>
            ) : null}

            <div className="vp-card vp-sec">
                <h3>Textos de la compra</h3>
                <p>Si dejás un texto vacío se usa el de siempre (el que se ve en gris).</p>
                <div className="vp-two2">
                    {TEXTS.map(([key, label, placeholder, long]) => (
                        <div key={key} className="vp-fld">
                            <label htmlFor={`pg-${key}`}>{label}</label>
                            {long
                                ? <textarea id={`pg-${key}`} className="vp-inp ta" rows={3} placeholder={placeholder} value={commerce[key] || ''} onChange={(event) => set({ [key]: event.target.value })} />
                                : <input id={`pg-${key}`} className="vp-inp" placeholder={placeholder} value={commerce[key] || ''} onChange={(event) => set({ [key]: event.target.value })} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="vp-floatsave">
                <span>{editor.canUndo ? 'Tenés cambios sin guardar.' : 'Todo guardado.'}</span>
                <button type="button" className="vp-btn acc" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar pagos'}</button>
            </div>
        </div>
    );
}
