// Checkout: resumen del pedido a la derecha (productos, totales y botón de compra).
import { DISTANCE_DELIVERY_KEY } from '../../../utils/shipping';
import { Line } from './Accordion.jsx';
import { formatCurrency } from '../../../utils/format';

export default function CheckoutSummary({ creating, deliveryMethod, displayCurrency, distanceQuote, handleCompletePurchase, items, iva, locale, selectedDeliveryOption, setTaxesAcknowledged, shipping, subtotal, summaryItems, taxesAcknowledged, total, validationError }) {
    return (
        <div className="w-full lg:w-[380px]">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl shadow-slate-200/80">
                {/* Panel header */}
                <div className="border-b border-gray-200 px-6 pb-4 pt-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resumen</p>
                    <h3 className="mt-0.5 text-lg font-bold text-gray-900">Tu pedido</h3>
                </div>

                {/* Items */}
                <div className="px-6 py-4 space-y-3 max-h-[260px] overflow-y-auto">
                    {summaryItems.map((it) => (
                        <div key={it.id} className="flex items-center gap-3">
                            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                                <div
                                    className="w-full h-full bg-center bg-no-repeat bg-cover"
                                    style={{
                                        backgroundImage: it.image
                                            ? `url("${it.image}")`
                                            : "none",
                                    }}
                                    role="img"
                                    aria-label={it.alt || it.name}
                                    title={it.alt || it.name}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">{it.name}</p>
                                <p className="mt-0.5 text-xs text-gray-500">×{it.qty}</p>
                            </div>
                            <p className="flex-shrink-0 text-sm font-semibold text-gray-900">
                                {formatCurrency(it.price * it.qty, displayCurrency, locale)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="space-y-2.5 border-t border-gray-200 px-6 py-4">
                    <Line label="Subtotal" value={formatCurrency(subtotal, displayCurrency, locale)} />
                    <Line
                        label="Envio"
                        value={
                            deliveryMethod === DISTANCE_DELIVERY_KEY && !distanceQuote?.ok
                                ? "A calcular"
                                : selectedDeliveryOption?.type === "pickup"
                                    ? "Retiro en local"
                                    : formatCurrency(shipping, displayCurrency, locale)
                        }
                    />
                    <Line label="Impuestos" value={formatCurrency(iva, displayCurrency, locale)} />
                </div>

                {/* Total row */}
                <div className="flex items-center justify-between border-t border-gray-200 bg-primary/[0.06] px-6 py-4">
                    <span className="text-sm text-gray-500">Total a pagar</span>
                    <span className="text-2xl font-black text-gray-900">
                        {formatCurrency(total, displayCurrency, locale)}
                    </span>
                </div>

                {/* Taxes Acknowledgement */}
                <div className="px-6 pt-4 pb-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center pt-0.5">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={taxesAcknowledged}
                                onChange={(e) => setTaxesAcknowledged(e.target.checked)}
                            />
                            <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-primary transition-all group-hover:border-primary/50 flex flex-shrink-0 items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        </div>
                        <div className="flex-1 text-[11px] text-gray-600 leading-relaxed font-medium">
                            Entiendo que los precios mostrados no incluyen impuestos y seran liquidados <span className="font-bold">segun la categoria y/o ubicacion</span>, con factura electronica emitida automaticamente.
                        </div>
                    </label>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6 pt-4">
                    <button
                        onClick={handleCompletePurchase}
                        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-[0_8px_32px_-8px_var(--color-primary)] hover:brightness-110 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                        disabled={creating || !items.length || !!validationError}
                    >
                        {creating ? (
                            <>
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Procesando...
                            </>
                        ) : (
                            <>
                                Confirmar compra
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
