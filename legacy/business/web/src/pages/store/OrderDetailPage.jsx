import React, { useEffect, useMemo, useState } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { navigate } from '../../utils/navigation';
import { formatCurrency } from '../../utils/format';
import { getBillingDocumentLabel, getBillingVatLabel, hasBillingInfo, normalizeBillingInfo } from '../../utils/billing';
import StoreSkeleton from '../../components/StoreSkeleton';

const STATUS_LABELS = {
    submitted: 'En gestión',
    pending_payment: 'Pendiente de pago',
    paid: 'Pagado',
    processing: 'En proceso',
    unpaid: 'Impaga',
    cancelled: 'Cancelado',
    draft: 'Borrador',
};

const DELIVERY_LABELS = {
    home: 'Entrega a domicilio',
    mdp: 'Retiro: Mar del Plata',
    necochea: 'Retiro: Necochea',
};

const formatOrderDate = (value, locale) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale || 'es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getOrderIdFromUrl = () => {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    } catch (err) {
        return null;
    }
};

const normalizePaymentLabel = (order) => {
    const customer = order?.customer || {};
    const method = String(customer.payment_method || customer.payment || '').toLowerCase();
    if (method === 'stripe' || order.checkout_mode === 'stripe') return 'Pago online';
    if (method === 'cash_on_pickup' || method === 'cash' || method === 'local' || order.checkout_mode === 'cash_on_pickup') return 'Pago en local';
    if (order.checkout_mode === 'transfer') {
        return method.includes('efectivo') ? 'Transferencia / Efectivo' : 'Transferencia';
    }
    if (order.checkout_mode === 'whatsapp') {
        return method || 'WhatsApp (efectivo o transferencia)';
    }
    return method || order.checkout_mode || '-';
};

const formatAddress = (customer = {}) => {
    if (customer.fullAddress) return customer.fullAddress;
    if (customer.address) return customer.address;
    const shipping = customer.shipping || customer.shipping_address || {};
    const parts = [
        customer.line1 || shipping.line1 || customer.address_line1,
        customer.line2 || shipping.line2 || customer.address_line2,
        customer.city || shipping.city,
        customer.state || shipping.state,
        customer.zip || shipping.zip || customer.postal_code,
        customer.country || shipping.country,
    ].filter(Boolean);
    return parts.join(', ');
};

const getProofUrl = (customer = {}) =>
    customer.payment_proof_url ||
    customer.paymentProofUrl ||
    customer.receipt_url ||
    customer.receiptUrl ||
    customer.proof_url ||
    customer.proofUrl ||
    '';

export default function OrderDetailPage() {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const orderId = useMemo(() => getOrderIdFromUrl(), []);

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('teflon_token');
                const headers = {
                    ...getTenantHeaders(),
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };
                const res = await fetch(`${getApiBase()}/api/orders/mine`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    const items = Array.isArray(data.items) ? data.items : [];
                    const found = items.find((o) => o.id === orderId);
                    if (found) {
                        setOrder(found);
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.warn('No se pudieron cargar pedidos', err);
            }

            try {
                const raw = localStorage.getItem('teflon_selected_order');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (!orderId || parsed?.id === orderId) {
                        setOrder(parsed);
                    }
                }
            } catch (err) {
                console.warn('No se pudo cargar pedido local', err);
            }

            setLoading(false);
        };
        load();
    }, [orderId]);

    const locale = order?.locale || 'es-AR';
    const currency = order?.currency || 'ARS';
    const statusLabel = STATUS_LABELS[order?.status] || order?.status || 'Pendiente';
    const deliveryMethod = order?.customer?.delivery_method || '';
    const deliveryLabelRaw = order?.customer?.delivery_label || '';
    const deliveryLabel = deliveryLabelRaw || (deliveryMethod.startsWith('zone:')
        ? `Envio (${deliveryMethod.replace('zone:', '')})`
        : deliveryMethod.startsWith('branch:')
            ? `Retiro (${deliveryMethod.replace('branch:', '')})`
            : DELIVERY_LABELS[deliveryMethod] || order?.deliveryLabel || '-');
    const billingInfo = normalizeBillingInfo(order?.customer || {});
    const showBillingInfo = hasBillingInfo(billingInfo);

    if (loading) {
        return (
            <StoreLayout>
                <main className="max-w-[1100px] mx-auto w-full px-4 md:px-10 py-8">
                    <StoreSkeleton variant="order" />
                </main>
            </StoreLayout>
        );
    }

    if (!order) {
        return (
            <StoreLayout>
                <div className="min-h-[60vh] flex items-center justify-center text-sm text-[#8a7560]">
                    No se encontró el pedido.
                </div>
            </StoreLayout>
        );
    }

    return (
        <StoreLayout>
            <main className="max-w-[1100px] mx-auto w-full px-4 md:px-10 py-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                        <p className="text-sm text-[#8a7560] uppercase tracking-widest">Detalles</p>
                        <h1 className="text-2xl md:text-3xl font-black text-[#181411] dark:text-white">
                            Pedido #{order.id}
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="px-4 h-10 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-sm font-bold text-[#181411] dark:text-white"
                    >
                        Volver al perfil
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Fecha</p>
                                    <p className="text-sm font-bold text-[#181411] dark:text-white">
                                        {formatOrderDate(order.created_at || order.createdAt, locale)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Estado</p>
                                    <p className="text-sm font-bold text-[#181411] dark:text-white">{statusLabel}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Total</p>
                                    <p className="text-lg font-black text-[#181411] dark:text-white">
                                        {formatCurrency(order.total || 0, currency, locale)}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-6 space-y-4">
                            <div>
                                <p className="text-sm font-bold text-[#181411] dark:text-white">Artículos</p>
                                <p className="text-xs text-[#8a7560]">Detalle de productos del pedido.</p>
                            </div>
                            <div className="space-y-3">
                                {(order.items || []).map((item) => (
                                    <div key={item.product_id || item.id} className="flex items-center justify-between gap-4 border-b border-[#f0ebe7] dark:border-[#3d2f21] pb-3">
                                        <div>
                                            <p className="text-sm font-bold text-[#181411] dark:text-white">{item.name}</p>
                                            <p className="text-xs text-[#8a7560]">SKU {item.sku || item.product_id}</p>
                                        </div>
                                        <div className="text-sm font-bold text-[#181411] dark:text-white">x{item.qty}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-6">
                        <section className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-6 space-y-3">
                            <p className="text-sm font-bold text-[#181411] dark:text-white">Pago</p>
                            <div>
                                <p className="text-xs uppercase text-[#8a7560]">Método</p>
                                <p className="text-sm font-bold text-[#181411] dark:text-white">{normalizePaymentLabel(order)}</p>
                            </div>
                            {getProofUrl(order.customer) ? (
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Comprobante</p>
                                    <a
                                        href={getProofUrl(order.customer)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-primary"
                                    >
                                        Ver comprobante
                                    </a>
                                </div>
                            ) : null}
                        </section>

                        <section className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-6 space-y-3">
                            <p className="text-sm font-bold text-[#181411] dark:text-white">Entrega</p>
                            <div>
                                <p className="text-xs uppercase text-[#8a7560]">Método</p>
                                <p className="text-sm font-bold text-[#181411] dark:text-white">{deliveryLabel}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-[#8a7560]">Dirección</p>
                                <p className="text-sm text-[#181411] dark:text-white">{formatAddress(order.customer) || '-'}</p>
                            </div>
                        </section>
                        {showBillingInfo ? (
                            <section className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-6 space-y-3">
                                <p className="text-sm font-bold text-[#181411] dark:text-white">Facturacion</p>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Razon social</p>
                                    <p className="text-sm font-bold text-[#181411] dark:text-white">{billingInfo.businessName || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Direccion</p>
                                    <p className="text-sm text-[#181411] dark:text-white">{billingInfo.address || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Localidad</p>
                                    <p className="text-sm text-[#181411] dark:text-white">{billingInfo.city || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">Tipo de IVA</p>
                                    <p className="text-sm text-[#181411] dark:text-white">{getBillingVatLabel(billingInfo.vatType)}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#8a7560]">{getBillingDocumentLabel(billingInfo.documentType)}</p>
                                    <p className="text-sm text-[#181411] dark:text-white">{billingInfo.documentNumber || '-'}</p>
                                </div>
                            </section>
                        ) : null}
                    </aside>
                </div>
            </main>
        </StoreLayout>
    );
}
