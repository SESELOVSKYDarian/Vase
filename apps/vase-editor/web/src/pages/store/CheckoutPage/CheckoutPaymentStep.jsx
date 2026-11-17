// Checkout, paso 3: cómo paga el cliente.
import { Accordion } from './Accordion.jsx';
import { PayOption } from './Accordion.jsx';

export default function CheckoutPaymentStep({ bankTransfer, highlightedTransfer, openStep, orderChannel, orderChannelOptions, orderSuccess, paymentLabel, paymentMethod, paymentOptions, paymentSummary, setOpenStep, setOrderChannel, setPaymentMethod, whatsappNumber }) {
    return (
        <Accordion
            step={3}
            title="Pago"
            openStep={openStep}
            onOpen={() => setOpenStep(3)}
        >
            <div className="pt-4 pb-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentOptions.map((opt) => (
                        <PayOption
                            key={opt.key}
                            active={paymentMethod === opt.key}
                            onClick={() => {
                                if (!opt.disabled) {
                                    setPaymentMethod(opt.key);
                                }
                            }}
                            icon={opt.icon}
                            label={opt.label}
                            description={opt.description}
                            highlight={opt.highlight}
                            disabled={opt.disabled}
                        />
                    ))}
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                    {paymentSummary}
                </div>

                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            Como quieres recibir la confirmacion
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Puedes recibir la confirmacion por WhatsApp o por email.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {orderChannelOptions.map((option) => {
                            const disabled = option.key === "whatsapp" && !whatsappNumber;
                            return (
                                <PayOption
                                    key={option.key}
                                    active={orderChannel === option.key}
                                    onClick={() => {
                                        if (!disabled) {
                                            setOrderChannel(option.key);
                                        }
                                    }}
                                    icon={
                                        option.key === "whatsapp" ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4A8.5 8.5 0 1 1 21 11.5Z"></path><path d="M8 12s1.5 3 4 3 4-3 4-3"></path></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>
                                        )
                                    }
                                    label={option.label}
                                    description={disabled ? "Configura un numero de WhatsApp en la tienda." : option.description}
                                    disabled={disabled}
                                />
                            );
                        })}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                        {orderChannel === "whatsapp"
                            ? "El pedido queda registrado y tambien intentaremos enviarte una copia por email."
                            : "El pedido queda registrado y la confirmacion principal llega a tu Gmail."}
                    </div>
                </div>

                {paymentMethod === "transfer" ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Datos para la transferencia</p>
                        {highlightedTransfer ? (
                            <div className="mb-2.5 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">{highlightedTransfer.label} para transferir</p>
                                    <p className="mt-0.5 break-all text-lg font-bold text-gray-900">{highlightedTransfer.value}</p>
                                </div>
                                <button
                                    type="button"
                                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    onClick={() => navigator.clipboard?.writeText(highlightedTransfer.value)}
                                >
                                    Copiar
                                </button>
                            </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { label: "CBU", value: bankTransfer.cbu || "-" },
                                { label: "Alias", value: bankTransfer.alias || "-" },
                                { label: "Banco", value: bankTransfer.bank || "-" },
                                { label: "Titular", value: bankTransfer.holder || "-" },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {orderSuccess ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm space-y-2">
                        <p className="font-bold">Pedido confirmado</p>
                        <p>Metodo: {orderSuccess.paymentLabel || paymentLabel}</p>
                        <p>Canal: {orderSuccess.contactChannel === "email" ? "Gmail" : "WhatsApp"}</p>
                        {orderSuccess.customerEmail ? (
                            <p>Email: {orderSuccess.customerEmail}</p>
                        ) : null}
                        {orderSuccess.emailDelivery ? (
                            <p className="text-xs font-semibold">
                                {orderSuccess.emailDelivery.sent
                                    ? `Confirmacion enviada a ${orderSuccess.emailDelivery.email || orderSuccess.customerEmail}.`
                                    : "No pudimos enviar la confirmacion por email en este intento."}
                            </p>
                        ) : null}
                        {orderSuccess.id ? (
                            <p>ID: {orderSuccess.id}</p>
                        ) : null}
                        {orderSuccess.method === "transfer" && (orderSuccess.whatsappReceiptUrl || orderSuccess.whatsappUrl) ? (
                            <button
                                type="button"
                                onClick={() => window.open(orderSuccess.whatsappReceiptUrl || orderSuccess.whatsappUrl, "_blank", "noopener,noreferrer")}
                                className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white font-bold"
                            >
                                Enviar comprobante por WhatsApp
                            </button>
                        ) : orderSuccess.method === "cash_on_pickup" ? (
                            <p className="text-xs font-semibold text-green-700">
                                Pago en local seleccionado. Presentate en la sucursal elegida.
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </Accordion>
    );
}
