// Pedido confirmado: resumen, datos para transferir y subida del comprobante.
import StoreLayout from '../../components/layout/StoreLayout';
import { getBillingDocumentLabel } from '../../utils/billing';
import { getBillingVatLabel } from '../../utils/billing';
import { navigate } from '../../utils/navigation';

export default function OrderSuccessView({ alias, bank, billingInfo, cbu, contactChannelLabel, copiedField, copyText, emailSent, emailTarget, formatOrderTotal, handleUploadProof, holder, items, order, proofError, proofFile, proofUploading, proofUrl, setProofFile, shouldShowProof, showBillingInfo, showTransferData, showWhatsappAction, subtitle, title }) {
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
