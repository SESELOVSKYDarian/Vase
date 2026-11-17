// Checkout: la página (título, pasos a la izquierda y resumen a la derecha).
import CheckoutDeliveryStep from './CheckoutDeliveryStep.jsx';
import CheckoutPaymentStep from './CheckoutPaymentStep.jsx';
import CheckoutShippingStep from './CheckoutShippingStep.jsx';
import CheckoutSummary from './CheckoutSummary.jsx';
import StoreLayout from '../../../components/layout/StoreLayout';
import { StepProgress } from './Accordion.jsx';

export default function CheckoutLayout({ bankTransfer, billingInfo, checkoutError, creating, customerInfo, deliveryLocation, deliveryMethod, deliveryQuoteError, displayCurrency, distanceQuote, handleCompletePurchase, handleDeliveryGroupChange, handleShippingCityInputChange, handleShippingCountryInputChange, handleShippingProvinceInputChange, highlightedTransfer, isArgentinaShippingCountry, items, iva, locale, openStep, orderChannel, orderChannelOptions, orderSuccess, paymentLabel, paymentMethod, paymentOptions, paymentSummary, pickupDeliveryOptions, selectedDeliveryGroup, selectedDeliveryOption, setBillingInfo, setCustomerInfo, setDeliveryLocation, setDeliveryMethod, setDeliveryQuoteError, setOpenStep, setOrderChannel, setPaymentMethod, setShippingInfo, setTaxesAcknowledged, shipping, shippingCitiesLoading, shippingCityOptions, shippingCitySuggestionsEnabled, shippingCountriesLoading, shippingCountryInput, shippingCountryOptions, shippingDeliveryOptions, shippingInfo, shippingProvinceLoading, shippingProvinceOptions, shippingProvinceSuggestionsEnabled, subtotal, summaryItems, taxesAcknowledged, total, validationError, whatsappNumber }) {
    return (
        <StoreLayout>
            <main className="store-checkout mx-auto w-full max-w-[1400px] px-4 py-6 text-gray-900 md:px-8 md:py-10">
                {/* Breadcrumbs */}
                <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
                    <button
                        className="transition-colors hover:text-gray-700"
                        onClick={() => (window.location.hash = '#')}
                        type="button"
                    >
                        Inicio
                    </button>
                    <span className="text-gray-300">/</span>
                    <button
                        className="transition-colors hover:text-gray-700"
                        onClick={() => (window.location.hash = '#cart')}
                        type="button"
                    >
                        Carrito
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900">Finalizar compra</span>
                </div>

                {/* Heading */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight leading-tight text-gray-900">
                        Finalizar compra
                    </h1>
                </div>

                <div className="flex flex-col gap-8 xl:flex-row">
                    {/* Left column */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Step Progress */}
                        <StepProgress openStep={openStep} />

                        {/* Steps */}
                        <div className="flex flex-col gap-4">
                            {/* 1 Shipping */}
                            <CheckoutShippingStep billingInfo={billingInfo} customerInfo={customerInfo} handleShippingCityInputChange={handleShippingCityInputChange} handleShippingCountryInputChange={handleShippingCountryInputChange} handleShippingProvinceInputChange={handleShippingProvinceInputChange} isArgentinaShippingCountry={isArgentinaShippingCountry} openStep={openStep} setBillingInfo={setBillingInfo} setCustomerInfo={setCustomerInfo} setOpenStep={setOpenStep} setShippingInfo={setShippingInfo} shippingCitiesLoading={shippingCitiesLoading} shippingCityOptions={shippingCityOptions} shippingCitySuggestionsEnabled={shippingCitySuggestionsEnabled} shippingCountriesLoading={shippingCountriesLoading} shippingCountryInput={shippingCountryInput} shippingCountryOptions={shippingCountryOptions} shippingInfo={shippingInfo} shippingProvinceLoading={shippingProvinceLoading} shippingProvinceOptions={shippingProvinceOptions} shippingProvinceSuggestionsEnabled={shippingProvinceSuggestionsEnabled} />

                            {/* 2 Delivery */}
                            <CheckoutDeliveryStep deliveryLocation={deliveryLocation} deliveryMethod={deliveryMethod} deliveryQuoteError={deliveryQuoteError} displayCurrency={displayCurrency} distanceQuote={distanceQuote} handleDeliveryGroupChange={handleDeliveryGroupChange} locale={locale} openStep={openStep} pickupDeliveryOptions={pickupDeliveryOptions} selectedDeliveryGroup={selectedDeliveryGroup} setDeliveryLocation={setDeliveryLocation} setDeliveryMethod={setDeliveryMethod} setDeliveryQuoteError={setDeliveryQuoteError} setOpenStep={setOpenStep} setShippingInfo={setShippingInfo} shippingDeliveryOptions={shippingDeliveryOptions} />

                            {/* 3 Payment */}
                            <CheckoutPaymentStep bankTransfer={bankTransfer} highlightedTransfer={highlightedTransfer} openStep={openStep} orderChannel={orderChannel} orderChannelOptions={orderChannelOptions} orderSuccess={orderSuccess} paymentLabel={paymentLabel} paymentMethod={paymentMethod} paymentOptions={paymentOptions} paymentSummary={paymentSummary} setOpenStep={setOpenStep} setOrderChannel={setOrderChannel} setPaymentMethod={setPaymentMethod} whatsappNumber={whatsappNumber} />
                        </div>

                        {validationError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {validationError}
                            </div>
                        ) : null}
                        {checkoutError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {checkoutError}
                            </div>
                        ) : null}
                    </div>

                    {/* Right column */}
                    <CheckoutSummary creating={creating} deliveryMethod={deliveryMethod} displayCurrency={displayCurrency} distanceQuote={distanceQuote} handleCompletePurchase={handleCompletePurchase} items={items} iva={iva} locale={locale} selectedDeliveryOption={selectedDeliveryOption} setTaxesAcknowledged={setTaxesAcknowledged} shipping={shipping} subtotal={subtotal} summaryItems={summaryItems} taxesAcknowledged={taxesAcknowledged} total={total} validationError={validationError} />
                </div>
            </main>
        </StoreLayout>
    );
}
