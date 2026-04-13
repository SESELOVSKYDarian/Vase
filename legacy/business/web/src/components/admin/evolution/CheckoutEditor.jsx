import React from 'react';

const CHECKOUT_METHOD_OPTIONS = [
    { key: 'transfer', label: 'Transferencia' },
    { key: 'cash_on_pickup', label: 'Pago en local' },
];

const CUSTOMER_STATUS_OPTIONS = [
    'Pendiente de pago',
    'Pago aprobado',
    'En preparacion',
    'Listo para retiro',
    'En camino',
    'Entregado',
];

const fieldClass =
    'w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30';

const GuideBox = ({ label, example }) => (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        <p className="mt-1 text-xs text-zinc-300">{example}</p>
    </div>
);

const SummaryCard = ({ label, value, description }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
);

const CheckoutEditor = ({ settings, setSettings, onSave, isSaving }) => {
    const checkoutMethods = Array.isArray(settings?.commerce?.payment_methods)
        ? settings.commerce.payment_methods
        : ['transfer', 'cash_on_pickup'];

    const bankTransferSettings = settings?.commerce?.bank_transfer || {};
    const adminEmail = settings?.commerce?.order_notification_email || settings?.commerce?.email || 'Sin definir';
    const taxRate = Number(settings?.commerce?.tax_rate ?? 0);
    const bankTransferAlias = String(bankTransferSettings.alias || '').trim();
    const bankTransferCbu = String(bankTransferSettings.cbu || '').trim();
    const transferPrimaryValue = bankTransferAlias || bankTransferCbu || 'Pendiente';
    const transferPrimaryDescription = bankTransferAlias
        ? 'Se muestra el alias cargado abajo en tiempo real.'
        : bankTransferCbu
            ? 'No hay alias. Se muestra el CBU cargado abajo.'
            : 'Completa alias o CBU abajo para verlo aqui.';
    const customerStatusValue = String(settings?.commerce?.customer_order_processing_label || '').trim();
    const customerStatusOptions = customerStatusValue && !CUSTOMER_STATUS_OPTIONS.includes(customerStatusValue)
        ? [customerStatusValue, ...CUSTOMER_STATUS_OPTIONS]
        : CUSTOMER_STATUS_OPTIONS;

    const toggleCheckoutMethod = (method) => {
        if (!CHECKOUT_METHOD_OPTIONS.some((opt) => opt.key === method)) return;
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.payment_methods)
                ? prev.commerce.payment_methods
                : [];
            const exists = current.includes(method);
            if (exists && current.length <= 1) {
                return prev;
            }
            const next = exists ? current.filter((item) => item !== method) : [...current, method];
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    payment_methods: next,
                },
            };
        });
    };

    const updateCommerceField = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                [field]: value,
            },
        }));
    };

    const updateBankTransferField = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                bank_transfer: {
                    ...(prev.commerce?.bank_transfer || {}),
                    [field]: value,
                },
            },
        }));
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-evolution-indigo/30 bg-evolution-indigo/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-100">
                        Checkout y cobro
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Checkout</h2>
                        <p className="max-w-3xl text-sm text-zinc-400">
                            Ajusta el flujo comercial que ve el cliente al confirmar la compra: medios de pago,
                            mensajes, canal de confirmacion, IVA y datos bancarios.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="rounded-xl bg-evolution-indigo px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_0_30px_rgba(99,102,241,0.22)] disabled:opacity-50"
                >
                    {isSaving ? 'Guardando...' : 'Guardar checkout'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Cobros activos"
                    value={String(checkoutMethods.length)}
                    description="Metodos visibles para el cliente."
                />
                <SummaryCard
                    label="Email admin"
                    value={adminEmail}
                    description="Recibe avisos y aprobaciones de pedido."
                />
                <SummaryCard
                    label="IVA"
                    value={`${Math.round(taxRate * 100)}%`}
                    description="Se suma al resumen del checkout."
                />
                <SummaryCard
                    label="Transferencia"
                    value={transferPrimaryValue}
                    description={transferPrimaryDescription}
                />
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Metodos de pago</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <GuideBox
                        label="Transferencia"
                        example="Actívala si el cliente te manda comprobante y luego validas el pago desde admin."
                    />
                    <GuideBox
                        label="Pago en local"
                        example="Actívalo si permites retiro o cobro presencial en showroom o sucursal."
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {CHECKOUT_METHOD_OPTIONS.map((method) => {
                        const selected = checkoutMethods.includes(method.key);
                        return (
                            <button
                                key={method.key}
                                type="button"
                                onClick={() => toggleCheckoutMethod(method.key)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${
                                    selected
                                        ? 'border-evolution-indigo/70 bg-evolution-indigo/20 text-indigo-100'
                                        : 'border-white/15 bg-black/20 text-zinc-300'
                                }`}
                            >
                                {method.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Notificaciones y estados</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <GuideBox label="WhatsApp" example="+54 223 555 1234" />
                    <GuideBox label="Estado cliente" example="En preparacion" />
                    <GuideBox label="Estado admin" example="Pago por revisar" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">WhatsApp del pedido</label>
                        <input
                            type="text"
                            value={settings?.commerce?.whatsapp_number || ''}
                            placeholder="+54 223 555 1234"
                            onChange={(e) => updateCommerceField('whatsapp_number', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Gmail del admin</label>
                        <input
                            type="email"
                            value={settings?.commerce?.order_notification_email || settings?.commerce?.email || ''}
                            placeholder="pedidos@alessitech.space"
                            onChange={(e) => updateCommerceField('order_notification_email', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Email visible de la tienda</label>
                        <input
                            type="email"
                            value={settings?.commerce?.email || ''}
                            placeholder="ventas@alessitech.space"
                            onChange={(e) => updateCommerceField('email', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Estado cliente</label>
                        <select
                            value={settings?.commerce?.customer_order_processing_label || ''}
                            onChange={(e) => updateCommerceField('customer_order_processing_label', e.target.value)}
                            className={fieldClass}
                        >
                            <option value="" className="bg-zinc-900">Selecciona un estado</option>
                            {customerStatusOptions.map((status) => (
                                <option key={status} value={status} className="bg-zinc-900">
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Texto para el cliente</label>
                        <textarea
                            rows={4}
                            value={settings?.commerce?.customer_order_processing_text || ''}
                            placeholder="Recibimos tu pedido y ya estamos preparando tu compra. Te avisaremos cuando quede lista para entrega o retiro."
                            onChange={(e) => updateCommerceField('customer_order_processing_text', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Asunto pago aprobado</label>
                        <input
                            type="text"
                            value={settings?.commerce?.customer_payment_approved_subject || ''}
                            placeholder="Pago aprobado de tu pedido"
                            onChange={(e) => updateCommerceField('customer_payment_approved_subject', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Texto pago aprobado</label>
                        <textarea
                            rows={4}
                            value={settings?.commerce?.customer_payment_approved_text || ''}
                            placeholder="Confirmamos tu pago. Tu pedido ya paso a preparacion y te avisaremos el siguiente paso."
                            onChange={(e) => updateCommerceField('customer_payment_approved_text', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Asunto pago cancelado</label>
                        <input
                            type="text"
                            value={settings?.commerce?.customer_payment_cancelled_subject || ''}
                            placeholder="Actualizacion de tu pedido"
                            onChange={(e) => updateCommerceField('customer_payment_cancelled_subject', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Texto pago cancelado</label>
                        <textarea
                            rows={4}
                            value={settings?.commerce?.customer_payment_cancelled_text || ''}
                            placeholder="No pudimos validar tu pago. Si quieres, vuelve a enviar el comprobante o contactanos por WhatsApp."
                            onChange={(e) => updateCommerceField('customer_payment_cancelled_text', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Estado admin</label>
                        <input
                            type="text"
                            value={settings?.commerce?.admin_order_confirmation_label || ''}
                            placeholder="Pago por revisar"
                            onChange={(e) => updateCommerceField('admin_order_confirmation_label', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Texto para el admin</label>
                        <textarea
                            rows={4}
                            value={settings?.commerce?.admin_order_confirmation_text || ''}
                            placeholder="Llego un pedido nuevo con comprobante pendiente. Revisa el panel, valida el pago y cambia el estado."
                            onChange={(e) => updateCommerceField('admin_order_confirmation_text', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Impuestos y resumen</p>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Tasa de impuesto</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settings?.commerce?.tax_rate ?? 0}
                            placeholder="0.21"
                            onChange={(e) => updateCommerceField('tax_rate', Number(e.target.value || 0))}
                            className={fieldClass}
                        />
                    </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Datos de transferencia</p>
                    <div className="rounded-xl border border-evolution-indigo/20 bg-evolution-indigo/10 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">Dato principal visible</p>
                        <p className="mt-1 text-sm font-semibold text-white">{transferPrimaryValue}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <input
                            type="text"
                            value={bankTransferSettings.alias || ''}
                            placeholder="teflon.ventas.mp"
                            onChange={(e) => updateBankTransferField('alias', e.target.value)}
                            className={fieldClass}
                        />
                        <input
                            type="text"
                            value={bankTransferSettings.cbu || ''}
                            placeholder="0000003100000000000001"
                            onChange={(e) => updateBankTransferField('cbu', e.target.value)}
                            className={fieldClass}
                        />
                        <input
                            type="text"
                            value={bankTransferSettings.bank || ''}
                            placeholder="Banco Galicia"
                            onChange={(e) => updateBankTransferField('bank', e.target.value)}
                            className={fieldClass}
                        />
                        <input
                            type="text"
                            value={bankTransferSettings.holder || ''}
                            placeholder="Sanitarios El Teflon SRL"
                            onChange={(e) => updateBankTransferField('holder', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutEditor;
