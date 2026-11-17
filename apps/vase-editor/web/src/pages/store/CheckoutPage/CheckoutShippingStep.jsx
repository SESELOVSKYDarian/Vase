// Checkout, paso 1: datos del cliente y dirección de entrega.
import { Accordion } from './Accordion.jsx';
import { BILLING_DOCUMENT_OPTIONS } from '../../../utils/billing';
import { BILLING_VAT_OPTIONS } from '../../../utils/billing';
import { checkoutFieldClass } from './map-distance-quote-error.js';
import { checkoutNoteClass } from './map-distance-quote-error.js';
import { checkoutPrimaryButtonClass } from './map-distance-quote-error.js';

export default function CheckoutShippingStep({ billingInfo, customerInfo, handleShippingCityInputChange, handleShippingCountryInputChange, handleShippingProvinceInputChange, isArgentinaShippingCountry, openStep, setBillingInfo, setCustomerInfo, setOpenStep, setShippingInfo, shippingCitiesLoading, shippingCityOptions, shippingCitySuggestionsEnabled, shippingCountriesLoading, shippingCountryInput, shippingCountryOptions, shippingInfo, shippingProvinceLoading, shippingProvinceOptions, shippingProvinceSuggestionsEnabled }) {
    return (
        <Accordion
            step={1}
            title="Tus datos"
            openStep={openStep}
            onOpen={() => setOpenStep(1)}
        >
            <div className="pt-4 pb-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Nombre completo
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder="Tu nombre"
                            type="text"
                            value={customerInfo.fullName}
                            onChange={(e) =>
                                setCustomerInfo((prev) => ({
                                    ...prev,
                                    fullName: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Telefono
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder="+54 11..."
                            type="tel"
                            value={customerInfo.phone}
                            onChange={(e) =>
                                setCustomerInfo((prev) => ({
                                    ...prev,
                                    phone: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">
                            Email
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder="tucorreo@gmail.com"
                            type="email"
                            value={customerInfo.email}
                            onChange={(e) =>
                                setCustomerInfo((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                }))
                            }
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Aca te enviamos la confirmacion del pedido.
                        </p>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">
                            Direccion completa
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder="Calle Falsa 123"
                            type="text"
                            value={shippingInfo.fullAddress}
                            onChange={(e) =>
                                setShippingInfo((s) => ({
                                    ...s,
                                    fullAddress: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Pais
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder="Argentina"
                            type="text"
                            list="checkout-country-options"
                            value={shippingCountryInput}
                            onChange={(e) => handleShippingCountryInputChange(e.target.value)}
                            autoComplete="country-name"
                        />
                        <datalist id="checkout-country-options">
                            {shippingCountryOptions.map((country) => (
                                <option key={country.value} value={country.label} />
                            ))}
                        </datalist>
                        <p className={checkoutNoteClass}>
                            {shippingCountriesLoading ? "Cargando paises..." : "Escribe para buscar y selecciona un pais del listado."}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Provincia
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder={isArgentinaShippingCountry ? "Buenos Aires" : "Provincia / estado / region"}
                            type="text"
                            list={shippingProvinceSuggestionsEnabled ? "checkout-province-options" : undefined}
                            value={shippingInfo.province}
                            onChange={(e) => handleShippingProvinceInputChange(e.target.value)}
                            autoComplete="address-level1"
                            disabled={!shippingInfo.countryCode}
                        />
                        {shippingProvinceSuggestionsEnabled ? (
                            <datalist id="checkout-province-options">
                                {shippingProvinceOptions.map((province) => (
                                    <option key={province.value} value={province.label} />
                                ))}
                            </datalist>
                        ) : null}
                        <p className={checkoutNoteClass}>
                            {!shippingInfo.countryCode
                                ? "Primero selecciona un pais."
                                : isArgentinaShippingCountry
                                    ? shippingProvinceLoading
                                        ? "Cargando provincias de Argentina..."
                                        : shippingProvinceSuggestionsEnabled
                                            ? "Selecciona una provincia valida para habilitar las ciudades."
                                            : "No pudimos cargar provincias. Puedes escribirla manualmente."
                                    : "Completa la provincia o estado manualmente."}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Ciudad
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder={isArgentinaShippingCountry ? "Mar del Plata" : "Ciudad"}
                            type="text"
                            list={shippingCitySuggestionsEnabled ? "checkout-city-options" : undefined}
                            value={shippingInfo.city}
                            onChange={(e) => handleShippingCityInputChange(e.target.value)}
                            autoComplete="address-level2"
                            disabled={!shippingInfo.countryCode || (shippingProvinceSuggestionsEnabled && !shippingInfo.provinceId)}
                        />
                        {shippingCitySuggestionsEnabled ? (
                            <datalist id="checkout-city-options">
                                {shippingCityOptions.map((city) => (
                                    <option key={city.value} value={city.label} />
                                ))}
                            </datalist>
                        ) : null}
                        <p className={checkoutNoteClass}>
                            {!shippingInfo.countryCode
                                ? "Primero selecciona un pais."
                                : isArgentinaShippingCountry
                                    ? !shippingInfo.provinceId
                                        ? "Selecciona una provincia para ver las ciudades disponibles."
                                        : shippingCitiesLoading
                                            ? "Cargando ciudades de la provincia elegida..."
                                            : shippingCitySuggestionsEnabled
                                                ? "Selecciona una ciudad del listado oficial."
                                                : "No pudimos cargar las ciudades. Puedes escribirla manualmente."
                                    : "Completa tu ciudad manualmente."}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Codigo postal
                        </label>
                        <input
                            className={checkoutFieldClass}
                            placeholder="7600"
                            type="text"
                            value={shippingInfo.postalCode}
                            onChange={(e) =>
                                setShippingInfo((s) => ({
                                    ...s,
                                    postalCode: e.target.value,
                                }))
                            }
                            autoComplete="postal-code"
                        />
                    </div>
                    <div className="col-span-2 mt-2 border-t border-gray-200 pt-5">
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-900">
                                Datos de facturacion
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Completa estos datos si necesitas factura.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">
                                    Razon social
                                </label>
                                <input
                                    className={checkoutFieldClass}
                                    placeholder="Ej: Mi Empresa SRL"
                                    type="text"
                                    value={billingInfo.businessName}
                                    onChange={(e) =>
                                        setBillingInfo((prev) => ({
                                            ...prev,
                                            businessName: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">
                                    Direccion de facturacion
                                </label>
                                <input
                                    className={checkoutFieldClass}
                                    placeholder="Calle y numero"
                                    type="text"
                                    value={billingInfo.address}
                                    onChange={(e) =>
                                        setBillingInfo((prev) => ({
                                            ...prev,
                                            address: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Localidad
                                </label>
                                <input
                                    className={checkoutFieldClass}
                                    placeholder="Mar del Plata"
                                    type="text"
                                    value={billingInfo.city}
                                    onChange={(e) =>
                                        setBillingInfo((prev) => ({
                                            ...prev,
                                            city: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Tipo de IVA
                                </label>
                                <select
                                    className={checkoutFieldClass}
                                    value={billingInfo.vatType}
                                    onChange={(e) =>
                                        setBillingInfo((prev) => ({
                                            ...prev,
                                            vatType: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">Seleccionar</option>
                                    {BILLING_VAT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Tipo de documento
                                </label>
                                <select
                                    className={checkoutFieldClass}
                                    value={billingInfo.documentType}
                                    onChange={(e) =>
                                        setBillingInfo((prev) => ({
                                            ...prev,
                                            documentType: e.target.value,
                                        }))
                                    }
                                >
                                    {BILLING_DOCUMENT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Numero
                                </label>
                                <input
                                    className={checkoutFieldClass}
                                    placeholder="20-12345678-9 / 12345678"
                                    type="text"
                                    value={billingInfo.documentNumber}
                                    onChange={(e) =>
                                        setBillingInfo((prev) => ({
                                            ...prev,
                                            documentNumber: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={() => setOpenStep(2)} className={checkoutPrimaryButtonClass}>
                        Continuar
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        </Accordion>
    );
}
