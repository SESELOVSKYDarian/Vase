// Checkout, paso 2: envío o retiro.
import DeliveryLocationSelector from '../../../components/store/DeliveryLocationSelector';
import { Accordion } from './Accordion.jsx';
import { DISTANCE_DELIVERY_KEY } from '../../../utils/shipping';
import { checkoutGhostButtonClass } from './map-distance-quote-error.js';
import { checkoutPrimaryButtonClass } from './map-distance-quote-error.js';
import { formatCurrency } from '../../../utils/format';

export default function CheckoutDeliveryStep({ deliveryLocation, deliveryMethod, deliveryQuoteError, displayCurrency, distanceQuote, handleDeliveryGroupChange, locale, openStep, pickupDeliveryOptions, selectedDeliveryGroup, setDeliveryLocation, setDeliveryMethod, setDeliveryQuoteError, setOpenStep, setShippingInfo, shippingDeliveryOptions }) {
    return (
        <Accordion
            step={2}
            title="Entrega"
            openStep={openStep}
            onOpen={() => setOpenStep(2)}
        >
            <div className="pt-4 pb-2 space-y-3">
                <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
                    <button
                        type="button"
                        onClick={() => handleDeliveryGroupChange("shipping")}
                        disabled={!shippingDeliveryOptions.length}
                        className={[
                            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                            selectedDeliveryGroup === "shipping"
                                ? "bg-primary text-white shadow-[0_2px_8px_-2px_var(--color-primary)]"
                                : "text-gray-500 hover:text-gray-900",
                            !shippingDeliveryOptions.length ? "cursor-not-allowed opacity-40" : "",
                        ].join(" ")}
                    >
                        Envio a domicilio
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeliveryGroupChange("pickup")}
                        disabled={!pickupDeliveryOptions.length}
                        className={[
                            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                            selectedDeliveryGroup === "pickup"
                                ? "bg-primary text-white shadow-[0_2px_8px_-2px_var(--color-primary)]"
                                : "text-gray-500 hover:text-gray-900",
                            !pickupDeliveryOptions.length ? "cursor-not-allowed opacity-40" : "",
                        ].join(" ")}
                    >
                        Retiro en local
                    </button>
                </div>

                {(selectedDeliveryGroup === "pickup" ? pickupDeliveryOptions : shippingDeliveryOptions).map((opt) => {
                    const checked = deliveryMethod === opt.key;
                    const isDistanceOption = opt.key === DISTANCE_DELIVERY_KEY;
                    const optionDescription = isDistanceOption && distanceQuote?.ok
                        ? distanceQuote.match_type === "polygon"
                            ? `${distanceQuote.zone?.name || "Zona"} · zona fija detectada por tu ubicacion`
                            : `${distanceQuote.zone?.name || "Zona"} · ${distanceQuote.distance_km} km desde ${distanceQuote.branch?.name || "la sucursal"}`
                        : opt.desc;
                    const optionPrice = isDistanceOption && distanceQuote?.ok
                        ? Number(distanceQuote.final_price ?? distanceQuote.price ?? 0)
                        : opt.price;
                    return (
                        <label
                            key={opt.key}
                            className={[
                                "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                                checked
                                    ? "border-primary/35 bg-primary/[0.08] ring-1 ring-primary/15"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                            ].join(" ")}
                        >
                            <div className={[
                                "flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all",
                                checked ? "border-primary bg-primary" : "border-gray-300",
                            ].join(" ")}>
                                {checked && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <input
                                className="sr-only"
                                name="delivery"
                                type="radio"
                                checked={checked}
                                onChange={() => setDeliveryMethod(opt.key)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${checked ? "text-gray-900" : "text-gray-800"}`}>{opt.title}</p>
                                <p className="mt-0.5 truncate text-xs text-gray-500">{optionDescription}</p>
                            </div>
                            <span className={`text-sm font-bold flex-shrink-0 ${checked ? "text-gray-900" : "text-gray-500"}`}>
                                {optionPrice == null
                                    ? "Calcular"
                                    : optionPrice === 0
                                    ? "Gratis"
                                    : formatCurrency(optionPrice, displayCurrency, locale)}
                            </span>
                        </label>
                    );
                })}

                {deliveryMethod === DISTANCE_DELIVERY_KEY ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm shadow-slate-200/60">
                        <div className="space-y-1 mb-4">
                            <p className="text-sm font-semibold text-gray-900">
                                Calcula el envio con tu ubicacion
                            </p>
                            <p className="text-xs leading-relaxed text-gray-500">
                                Comparte tu ubicacion o busca tu direccion. Primero probamos zonas fijas y luego calculamos la distancia hasta la sucursal mas cercana.
                            </p>
                        </div>

                        <div className="mt-4">
                            <DeliveryLocationSelector
                                value={deliveryLocation}
                                onChange={(nextLocation) => {
                                    setDeliveryLocation(nextLocation);
                                    setDeliveryQuoteError(null);
                                }}
                                onAddressDetected={(address) => {
                                    setShippingInfo((prev) => ({
                                        ...prev,
                                        fullAddress: prev.fullAddress || address,
                                    }));
                                }}
                            />
                        </div>

                        {distanceQuote?.ok ? (
                            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                <p className="font-bold">
                                    {distanceQuote.zone?.name}
                                    {distanceQuote.distance_km != null ? ` · ${distanceQuote.distance_km} km` : ""}
                                </p>
                                <p className="mt-1">
                                    {distanceQuote.match_type === "polygon"
                                        ? "Zona fija detectada"
                                        : `Sucursal mas cercana: ${distanceQuote.branch?.name || "Sucursal principal"}`}
                                </p>
                                <div className="mt-2 space-y-1 text-xs opacity-90">
                                    <p>
                                        Zona:{" "}
                                        <span className="font-semibold">
                                            {Number(distanceQuote.zone_amount ?? distanceQuote.base_price ?? 0) <= 0
                                                ? "Gratis"
                                                : formatCurrency(
                                                    Number(distanceQuote.zone_amount ?? distanceQuote.base_price ?? 0),
                                                    displayCurrency,
                                                    locale,
                                                )}
                                        </span>
                                    </p>
                                    <p>
                                        Flete:{" "}
                                        <span className="font-semibold">
                                            {Number(distanceQuote.freight_amount || 0) <= 0
                                                ? "Gratis"
                                                : formatCurrency(
                                                    Number(distanceQuote.freight_amount || 0),
                                                    displayCurrency,
                                                    locale,
                                                )}
                                        </span>
                                        {distanceQuote.match_type !== "polygon" && distanceQuote.pricing_mode === "per_km" ? (
                                            <span className="opacity-80">
                                                {" "}
                                                ({formatCurrency(Number(distanceQuote.price_per_km || 0), displayCurrency, locale)}/km)
                                            </span>
                                        ) : null}
                                    </p>
                                    <p className="text-sm font-bold text-emerald-900">
                                        Envio final:{" "}
                                        {Number(distanceQuote.final_price ?? distanceQuote.price ?? 0) <= 0
                                            ? "Gratis"
                                            : formatCurrency(
                                                Number(distanceQuote.final_price ?? distanceQuote.price ?? 0),
                                                displayCurrency,
                                                locale,
                                            )}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {deliveryQuoteError ? (
                            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {deliveryQuoteError}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex justify-between pt-2">
                    <button onClick={() => setOpenStep(1)} className={checkoutGhostButtonClass}>
                        Volver
                    </button>
                    <button
                        onClick={() => setOpenStep(3)}
                        className={checkoutPrimaryButtonClass}
                    >
                        Continuar
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        </Accordion>
    );
}
