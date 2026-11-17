// Mi cuenta en la tienda: formulario para cambiar la dirección y los datos de facturación.
import { BILLING_DOCUMENT_OPTIONS } from '../../../utils/billing';
import { BILLING_VAT_OPTIONS } from '../../../utils/billing';
import { PHONE_COUNTRIES } from './profile-helpers.jsx';

export default function AddressForm({ addressDraft, citiesLoading, cityOptions, citySuggestionsEnabled, countriesLoading, countryInput, countryOptions, handleCityInputChange, handleCountryInputChange, handleProvinceInputChange, isArgentinaCountry, provinceLoading, provinceOptions, provinceSuggestionsEnabled, setAddressDraft }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Nombre</label>
                <input
                    type="text"
                    value={addressDraft.fullName}
                    onChange={(e) => setAddressDraft({ ...addressDraft, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                />
            </div>
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Direccion</label>
                <input
                    type="text"
                    value={addressDraft.line1}
                    onChange={(e) => setAddressDraft({ ...addressDraft, line1: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                />
            </div>
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Pais</label>
                <input
                    type="text"
                    list="profile-country-options"
                    value={countryInput}
                    onChange={(e) => handleCountryInputChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                />
                <datalist id="profile-country-options">
                    {countryOptions.map((country) => (
                        <option key={country.value} value={country.label} />
                    ))}
                </datalist>
                <p className="text-[11px] text-[#8a7560]">
                    {countriesLoading ? 'Cargando paises...' : 'Escribe para buscar y selecciona un pais del listado.'}
                </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Provincia</label>
                <input
                    type="text"
                    list={provinceSuggestionsEnabled ? 'profile-province-options' : undefined}
                    value={addressDraft.region}
                    onChange={(e) => handleProvinceInputChange(e.target.value)}
                    disabled={!addressDraft.countryCode}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm disabled:opacity-60"
                />
                {provinceSuggestionsEnabled ? (
                    <datalist id="profile-province-options">
                        {provinceOptions.map((province) => (
                            <option key={province.value} value={province.label} />
                        ))}
                    </datalist>
                ) : null}
                <p className="text-[11px] text-[#8a7560]">
                    {!addressDraft.countryCode
                        ? 'Primero selecciona un pais.'
                        : isArgentinaCountry
                            ? provinceLoading
                                ? 'Cargando provincias...'
                                : provinceSuggestionsEnabled
                                    ? 'Selecciona una provincia valida para habilitar las ciudades.'
                                    : 'Si no carga el listado, puedes escribir la provincia manualmente.'
                            : 'Completa la provincia o estado manualmente.'}
                </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Ciudad</label>
                <input
                    type="text"
                    list={citySuggestionsEnabled ? 'profile-city-options' : undefined}
                    value={addressDraft.city}
                    onChange={(e) => handleCityInputChange(e.target.value)}
                    disabled={!addressDraft.countryCode || (provinceSuggestionsEnabled && !addressDraft.provinceId)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm disabled:opacity-60"
                />
                {citySuggestionsEnabled ? (
                    <datalist id="profile-city-options">
                        {cityOptions.map((city) => (
                            <option key={city.value} value={city.label} />
                        ))}
                    </datalist>
                ) : null}
                <p className="text-[11px] text-[#8a7560]">
                    {!addressDraft.countryCode
                        ? 'Primero selecciona un pais.'
                        : isArgentinaCountry
                            ? !addressDraft.provinceId
                                ? 'Selecciona una provincia para ver las ciudades disponibles.'
                                : citiesLoading
                                    ? 'Cargando ciudades...'
                                    : citySuggestionsEnabled
                                        ? 'Selecciona una ciudad del listado oficial.'
                                        : 'Si no carga el listado, puedes escribir la ciudad manualmente.'
                            : 'Completa tu ciudad manualmente.'}
                </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Codigo postal</label>
                <input
                    type="text"
                    value={addressDraft.postal}
                    onChange={(e) => setAddressDraft({ ...addressDraft, postal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                />
            </div>
            <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Telefono</label>
                <div className="flex flex-col md:flex-row gap-2">
                    <select
                        value={addressDraft.phoneCountry}
                        onChange={(e) =>
                            setAddressDraft({
                                ...addressDraft,
                                phoneCountry: e.target.value,
                            })
                        }
                        className="w-full md:w-48 px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                    >
                        {PHONE_COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                                {country.dial} {country.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={addressDraft.phoneNumber}
                        onChange={(e) =>
                            setAddressDraft({
                                ...addressDraft,
                                phoneNumber: e.target.value,
                            })
                        }
                        placeholder="Numero de telefono"
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                    />
                </div>
            </div>
            <div className="border-t border-[#e5e1de] pt-3 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a7560] mb-3">
                    Facturacion
                </p>
                <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Razon social</label>
                        <input
                            type="text"
                            value={addressDraft.billingBusinessName || ''}
                            onChange={(e) => setAddressDraft({ ...addressDraft, billingBusinessName: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Direccion de facturacion</label>
                        <input
                            type="text"
                            value={addressDraft.billingAddress || ''}
                            onChange={(e) => setAddressDraft({ ...addressDraft, billingAddress: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Localidad</label>
                        <input
                            type="text"
                            value={addressDraft.billingCity || ''}
                            onChange={(e) => setAddressDraft({ ...addressDraft, billingCity: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Tipo de IVA</label>
                        <select
                            value={addressDraft.billingVatType || ''}
                            onChange={(e) => setAddressDraft({ ...addressDraft, billingVatType: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                        >
                            <option value="">Seleccionar</option>
                            {BILLING_VAT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3">
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-[10px] font-bold uppercase text-[#8a7560]">Documento</label>
                            <select
                                value={addressDraft.billingDocumentType || 'cuit'}
                                onChange={(e) => setAddressDraft({ ...addressDraft, billingDocumentType: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                            >
                                {BILLING_DOCUMENT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-[10px] font-bold uppercase text-[#8a7560]">Numero</label>
                            <input
                                type="text"
                                value={addressDraft.billingDocumentNumber || ''}
                                onChange={(e) => setAddressDraft({ ...addressDraft, billingDocumentNumber: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
