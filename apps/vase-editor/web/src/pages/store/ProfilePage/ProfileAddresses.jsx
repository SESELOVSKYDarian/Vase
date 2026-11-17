// Mi cuenta en la tienda: direcciones de envío y datos de facturación.
// partes: ./AddressSummary.jsx, ./AddressForm.jsx
import { BILLING_DOCUMENT_OPTIONS } from '../../../utils/billing';
import { BILLING_VAT_OPTIONS } from '../../../utils/billing';
import { Headset } from './profile-helpers.jsx';
import { Home } from './profile-helpers.jsx';
import { MapPin } from './profile-helpers.jsx';
import { PHONE_COUNTRIES } from './profile-helpers.jsx';
import { Phone } from './profile-helpers.jsx';
import { User } from './profile-helpers.jsx';
import { buildPhone } from './profile-helpers.jsx';
import { getBillingDocumentLabel } from '../../../utils/billing';
import { getBillingVatLabel } from '../../../utils/billing';

import AddressSummary from './AddressSummary.jsx';
import AddressForm from './AddressForm.jsx';
export default function ProfileAddresses({ address, addressDraft, addressesSpanClass, billingDetails, citiesLoading, cityOptions, citySuggestionsEnabled, countriesLoading, countryInput, countryOptions, handleCityInputChange, handleCountryInputChange, handleProvinceInputChange, handleWholesaleQuote, hasProfileBillingInfo, isArgentinaCountry, isEditingAddress, isWholesaleUser, profileName, provinceLoading, provinceOptions, provinceSuggestionsEnabled, resetAddress, roleLabel, saveAddress, setAddressDraft, setIsEditingAddress, wholesaleQuoteUrl }) {
    return (
        <div className={`${addressesSpanClass} space-y-6`}>
            <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e5e1de] dark:border-[#3d2f21] flex justify-between items-center">
                    <h3 className="font-bold text-lg">Direccion principal</h3>
                    <MapPin className="h-5 w-5 shrink-0 text-[#8a7560]" />
                </div>
                <div className="p-6">
                    {!isEditingAddress ? (
                        <AddressSummary address={address} billingDetails={billingDetails} hasProfileBillingInfo={hasProfileBillingInfo} profileName={profileName} roleLabel={roleLabel} />
                    ) : (
                        <AddressForm addressDraft={addressDraft} citiesLoading={citiesLoading} cityOptions={cityOptions} citySuggestionsEnabled={citySuggestionsEnabled} countriesLoading={countriesLoading} countryInput={countryInput} countryOptions={countryOptions} handleCityInputChange={handleCityInputChange} handleCountryInputChange={handleCountryInputChange} handleProvinceInputChange={handleProvinceInputChange} isArgentinaCountry={isArgentinaCountry} provinceLoading={provinceLoading} provinceOptions={provinceOptions} provinceSuggestionsEnabled={provinceSuggestionsEnabled} setAddressDraft={setAddressDraft} />
                    )}
                    <div className="mt-6 flex gap-3">
                        {isEditingAddress ? (
                            <>
                                <button
                                    className="flex-1 px-3 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-all"
                                    onClick={saveAddress}
                                >
                                    Guardar
                                </button>
                                <button
                                    className="flex-1 px-3 py-2 bg-[#f5f2f0] border border-[#e5e1de] text-xs font-bold rounded hover:bg-white transition-all"
                                    onClick={() => {
                                        setAddressDraft(address);
                                        setIsEditingAddress(false);
                                    }}
                                >
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="flex-1 px-3 py-2 bg-[#f5f2f0] border border-[#e5e1de] text-xs font-bold rounded hover:bg-white transition-all"
                                    onClick={() => setIsEditingAddress(true)}
                                >
                                    Editar
                                </button>
                                <button
                                    className="flex-1 px-3 py-2 bg-[#f5f2f0] border border-[#e5e1de] text-xs font-bold rounded hover:bg-white transition-all text-red-600"
                                    onClick={resetAddress}
                                >
                                    Eliminar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isWholesaleUser ? (
                <div className="bg-primary rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <div className="relative z-10">
                        <h4 className="font-bold text-lg mb-2">Necesitas cotizacion mayorista?</h4>
                        <p className="text-white/80 text-sm mb-2">
                            Contacta a nuestro equipo por el mismo WhatsApp configurado para los pedidos.
                        </p>
                        <p className="text-white/70 text-xs mb-4">
                            El mensaje sale armado con tus datos para pedir precios mayoristas.
                        </p>
                        <button
                            type="button"
                            onClick={handleWholesaleQuote}
                            disabled={!wholesaleQuoteUrl}
                            className="w-full bg-white text-primary font-bold py-2 rounded-lg text-sm hover:bg-[#f8f7f5] transition-all disabled:cursor-not-allowed disabled:bg-white/80 disabled:text-primary/60"
                        >
                            {wholesaleQuoteUrl ? 'Contactar asesor' : 'Configura el WhatsApp de pedidos'}
                        </button>
                    </div>
                    <Headset
                        className="h-[100px] w-[100px] text-white/10 absolute -bottom-4 -right-4 group-hover:scale-110 transition-transform"
                    />
                </div>
            ) : null}
        </div>
    );
}
