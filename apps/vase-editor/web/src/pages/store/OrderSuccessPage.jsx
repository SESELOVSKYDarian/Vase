// partes: ./upload-proof.js, ./OrderSuccessPageParte.jsx
import React, { useEffect, useMemo, useState } from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import { navigate } from "../../utils/navigation";
import { getApiBase, getTenantHeaders } from "../../utils/api";
import { makeHandleUploadProof } from './upload-proof.js';
import OrderSuccessPageParte from './OrderSuccessPageParte.jsx';
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

    const handleUploadProof = makeHandleUploadProof({ order, proofFile, setOrder, setProofError, setProofFile, setProofUploading, setProofUrl });

    return (
        <OrderSuccessPageParte alias={alias} bank={bank} billingInfo={billingInfo} cbu={cbu} contactChannelLabel={contactChannelLabel} copiedField={copiedField} copyText={copyText} emailSent={emailSent} emailTarget={emailTarget} formatOrderTotal={formatOrderTotal} handleUploadProof={handleUploadProof} holder={holder} items={items} order={order} proofError={proofError} proofFile={proofFile} proofUploading={proofUploading} proofUrl={proofUrl} setProofFile={setProofFile} shouldShowProof={shouldShowProof} showBillingInfo={showBillingInfo} showTransferData={showTransferData} showWhatsappAction={showWhatsappAction} subtitle={subtitle} title={title} />
    );
}
