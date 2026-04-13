import React, { useEffect, useMemo, useState } from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import { navigate } from "../../utils/navigation";
import { getApiBase, getTenantHeaders } from "../../utils/api";
import {
    getBillingDocumentLabel,
    getBillingVatLabel,
    hasBillingInfo,
    normalizeBillingInfo,
} from "../../utils/billing";

export default function OrderSuccessPage() {
    const [order, setOrder] = useState(null);
    const [checkoutConfig, setCheckoutConfig] = useState({
        mode: "both",
        whatsapp_number: "",
        bank_transfer: {},
        customer_order_processing_label: "En proceso",
        customer_order_processing_text: "Tu pedido fue recibido y se encuentra en proceso.",
        admin_order_confirmation_label: "En confirmacion",
    });
    const [proofFile, setProofFile] = useState(null);
    const [proofUploading, setProofUploading] = useState(false);
    const [proofError, setProofError] = useState("");
    const [proofUrl, setProofUrl] = useState("");
    const [copiedField, setCopiedField] = useState("");

    useEffect(() => {
        try {
            const raw = localStorage.getItem("teflon_last_order");
            if (raw) {
                setOrder(JSON.parse(raw));
            }
        } catch (err) {
            console.warn("No se pudo cargar el pedido", err);
        }
    }, []);

    useEffect(() => {
        let active = true;
        const loadCheckoutConfig = async () => {
            try {
                const response = await fetch(`${getApiBase()}/api/settings/checkout`, {
                    headers: getTenantHeaders(),
                });
                if (!response.ok) {
                    throw new Error(`checkout_settings_${response.status}`);
                }
                const data = await response.json();
                if (!active) return;
                setCheckoutConfig({
                    mode: data.mode || "both",
                    whatsapp_number: data.whatsapp_number || "",
                    bank_transfer: data.bank_transfer || {},
                    customer_order_processing_label: data.customer_order_processing_label || "En proceso",
                    customer_order_processing_text: data.customer_order_processing_text || "Tu pedido fue recibido y se encuentra en proceso.",
                    admin_order_confirmation_label: data.admin_order_confirmation_label || "En confirmacion",
                });
            } catch (err) {
                if (!active) return;
                setCheckoutConfig((prev) => ({
                    ...prev,
                    bank_transfer: prev.bank_transfer || {},
                }));
            }
        };
        loadCheckoutConfig();
        return () => {
            active = false;
        };
    }, []);
    const contactChannelLabel = useMemo(
        () => (order?.contactChannel === "email" ? "Gmail" : "WhatsApp"),
        [order]
    );
    const emailTarget = order?.emailDelivery?.email || order?.customerEmail || "";
    const emailSent = order?.emailDelivery?.sent === true;
    const emailFailed = Boolean(emailTarget) && order?.emailDelivery?.sent === false;
    const title = useMemo(() => {
        if (order?.method === "transfer") return "Pedido pendiente de pago";
        if (order?.contactChannel === "email") return "Pedido enviado por email";
        return "Pedido confirmado";
    }, [order]);
    const subtitle = useMemo(() => {
        const customCustomerText =
            String(checkoutConfig.customer_order_processing_text || "").trim() ||
            "Tu pedido fue recibido y se encuentra en proceso.";
        if (order?.method === "transfer") {
            if (emailSent && emailTarget) {
                return `${customCustomerText} Tambien enviamos el detalle a ${emailTarget}. Realiza la transferencia y sube tu comprobante para acelerar la validacion.`;
            }
            return `${customCustomerText} Realiza la transferencia y sube tu comprobante para acelerar la validacion.`;
        }
        if (order?.contactChannel === "email") {
            return emailSent && emailTarget
                ? `${customCustomerText} Te enviamos la confirmacion del pedido a ${emailTarget}.`
                : `${customCustomerText} Tu pedido quedo registrado y se intentara notificar por email.`;
        }
        if (emailSent && emailTarget) {
            return `${customCustomerText} Puedes continuar por WhatsApp. Tambien enviamos una copia del pedido a ${emailTarget}.`;
        }
        return customCustomerText;
    }, [checkoutConfig.customer_order_processing_text, emailSent, emailTarget, order]);

    const items = Array.isArray(order?.items) ? order.items : [];
    const billingInfo = useMemo(
        () => normalizeBillingInfo(order?.customer || order?.billing || {}),
        [order]
    );
    const showBillingInfo = useMemo(() => hasBillingInfo(billingInfo), [billingInfo]);

    const shouldShowProof = order?.method === "transfer";
    const showTransferData = order?.method === "transfer";
    const showWhatsappAction = Boolean(order?.whatsappUrl) && (order?.contactChannel === "whatsapp" || emailFailed || shouldShowProof);

    const transferData = order?.bankTransfer || checkoutConfig.bank_transfer || {};
    const alias = transferData.alias || "";
    const cbu = transferData.cbu || "";
    const bank = transferData.bank || "";
    const holder = transferData.holder || "";

    const formatOrderTotal = () => {
        const amount = Number(order?.total || 0);
        const currency = order?.currency || "ARS";
        const locale = order?.locale || "es-AR";
        try {
            return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
        } catch (err) {
            return `$${amount.toFixed(2)}`;
        }
    };

    const copyText = async (value, field) => {
        if (!value) return;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const input = document.createElement("input");
                input.value = value;
                document.body.appendChild(input);
                input.select();
                document.execCommand("copy");
                document.body.removeChild(input);
            }
            setCopiedField(field);
            setTimeout(() => setCopiedField(""), 2000);
        } catch (err) {
            console.error("No se pudo copiar", err);
        }
    };

    const handleUploadProof = async () => {
        if (!order?.id) return;
        if (!proofFile) {
            setProofError("Seleccioná un comprobante.");
            return;
        }
        setProofUploading(true);
        setProofError("");
        try {
            const formData = new FormData();
            formData.append("proof", proofFile);
            const token = localStorage.getItem('teflon_token');
            const res = await fetch(`${getApiBase()}/api/orders/${order.id}/proof`, {
                method: "POST",
                headers: {
                    ...getTenantHeaders(),
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || "No se pudo subir el comprobante");
            }
            const data = await res.json();
            const nextUrl = data.proof_url || "";
            setProofUrl(nextUrl);
            const nextOrder = { ...order, payment_proof_url: nextUrl };
            setOrder(nextOrder);
            localStorage.setItem("teflon_last_order", JSON.stringify(nextOrder));
            setProofFile(null);
        } catch (err) {
            console.error("Error al subir comprobante", err);
            setProofError("No se pudo subir el comprobante.");
        } finally {
            setProofUploading(false);
        }
    };

    return (
        <StoreLayout>
            <main className="max-w-[960px] mx-auto w-full px-4 md:px-10 py-16">
                <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-8 text-center space-y-4">
                    <div className="mx-auto size-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-[#181411] dark:text-white">
                        {title}
                    </h1>
                    <p className="text-[#8a7560]">
                        {subtitle}
                    </p>

                    {order?.id ? (
                        <div className="text-sm text-[#181411] dark:text-white font-semibold">
                            ID de pedido: {order.id}
                        </div>
                    ) : null}

                    {order?.deliveryLabel ? (
                        <div className="text-sm text-[#8a7560]">
                            Entrega: {order.deliveryLabel}
                        </div>
                    ) : null}

                    <div className="text-sm text-[#8a7560]">
                        Canal del pedido: {contactChannelLabel}
                    </div>

                    {emailTarget ? (
                        <div
                            className={`rounded-lg border px-4 py-3 text-sm ${
                                emailSent
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                        >
                            {emailSent
                                ? `Confirmacion enviada a ${emailTarget}.`
                                : `No pudimos confirmar el email a ${emailTarget} en este intento.`}
                        </div>
                    ) : null}

                    {showTransferData ? (
                        <div className="mt-4 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 text-left space-y-3">
                            <p className="text-sm font-bold text-[#181411] dark:text-white">
                                Datos para transferencia
                            </p>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase font-black text-[#8a7560]">Alias</p>
                                    <p className="text-sm font-bold text-[#181411] dark:text-white">{alias || "-"}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyText(alias, "alias")}
                                    disabled={!alias}
                                    className="px-3 h-9 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-widest"
                                >
                                    Copiar
                                </button>
                            </div>
                            {copiedField === "alias" ? (
                                <div className="text-xs text-green-600 font-bold">Texto copiado</div>
                            ) : null}
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase font-black text-[#8a7560]">CBU</p>
                                    <p className="text-sm font-bold text-[#181411] dark:text-white">{cbu || "-"}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyText(cbu, "cbu")}
                                    disabled={!cbu}
                                    className="px-3 h-9 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-widest"
                                >
                                    Copiar
                                </button>
                            </div>
                            {copiedField === "cbu" ? (
                                <div className="text-xs text-green-600 font-bold">Texto copiado</div>
                            ) : null}
                            <div className="space-y-1">
                                <p className="text-[11px] uppercase font-black text-[#8a7560]">Banco</p>
                                <p className="text-sm font-bold text-[#181411] dark:text-white">{bank || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] uppercase font-black text-[#8a7560]">Titular</p>
                                <p className="text-sm font-bold text-[#181411] dark:text-white">{holder || "-"}</p>
                            </div>
                            <div className="pt-2 border-t border-[#e5e1de] dark:border-[#3d2f21]">
                                <p className="text-[11px] uppercase font-black text-[#8a7560]">Total de la compra</p>
                                <p className="text-lg font-black text-[#181411] dark:text-white">
                                    {formatOrderTotal()}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {items.length ? (
                        <div className="text-left mt-6">
                            <p className="text-sm font-bold text-[#181411] dark:text-white mb-2">
                                Productos
                            </p>
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between text-sm border-b border-[#f0ebe7] dark:border-[#3d2f21] pb-2"
                                    >
                                        <span className="text-[#181411] dark:text-white">
                                            {item.name}
                                        </span>
                                        <span className="text-[#8a7560]">
                                            SKU {item.sku} x{item.qty}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {showBillingInfo ? (
                        <div className="mt-6 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 text-left space-y-2">
                            <p className="text-sm font-bold text-[#181411] dark:text-white">
                                Datos de facturacion
                            </p>
                            <p className="text-sm text-[#181411] dark:text-white">
                                Razon social: <span className="font-semibold">{billingInfo.businessName || "-"}</span>
                            </p>
                            <p className="text-sm text-[#181411] dark:text-white">
                                Direccion: <span className="font-semibold">{billingInfo.address || "-"}</span>
                            </p>
                            <p className="text-sm text-[#181411] dark:text-white">
                                Localidad: <span className="font-semibold">{billingInfo.city || "-"}</span>
                            </p>
                            <p className="text-sm text-[#181411] dark:text-white">
                                Tipo de IVA: <span className="font-semibold">{getBillingVatLabel(billingInfo.vatType)}</span>
                            </p>
                            <p className="text-sm text-[#181411] dark:text-white">
                                {getBillingDocumentLabel(billingInfo.documentType)}: <span className="font-semibold">{billingInfo.documentNumber || "-"}</span>
                            </p>
                        </div>
                    ) : null}

                    {shouldShowProof ? (
                        <div className="mt-6 text-left space-y-3">
                            <p className="text-sm font-bold text-[#181411] dark:text-white">
                                Subir comprobante
                            </p>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                    className="text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleUploadProof}
                                    disabled={proofUploading || !proofFile}
                                    className="px-4 h-10 rounded-lg bg-primary text-white font-bold disabled:opacity-60"
                                >
                                    {proofUploading ? "Subiendo..." : "Subir comprobante"}
                                </button>
                                {proofError ? (
                                    <div className="text-sm text-red-600">{proofError}</div>
                                ) : null}
                                {proofUrl ? (
                                    <a
                                        href={proofUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-primary font-bold"
                                    >
                                        Ver comprobante cargado
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-col md:flex-row gap-3 justify-center pt-4">
                    {showWhatsappAction ? (
                        <button
                            type="button"
                            onClick={() => window.open(order.whatsappReceiptUrl || order.whatsappUrl, "_blank", "noopener,noreferrer")}
                            className="px-5 h-11 rounded-lg bg-green-600 text-white font-bold"
                        >
                            {order?.contactChannel === "whatsapp" ? "Continuar por WhatsApp" : "Usar WhatsApp como alternativa"}
                        </button>
                    ) : null}
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="px-5 h-11 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-[#181411] dark:text-white font-bold"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </main>
        </StoreLayout>
    );
}

