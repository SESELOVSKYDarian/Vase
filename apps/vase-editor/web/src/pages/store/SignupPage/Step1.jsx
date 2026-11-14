// Parte de SignupPage.jsx: inputClass, labelClass, helperTextClass, AutocompleteField, Step1, Step2 y más.
import { useState } from 'react';
import { PasswordInput, authErrorTextClass, authHelperClass, authInputClass, authLabelClass, authLinkButtonClass, authPrimaryButtonClass } from '../../../components/auth/AuthShell';

export const inputClass = authInputClass;
export const labelClass = authLabelClass;
export const helperTextClass = authHelperClass;

export function AutocompleteField({
    id,
    value,
    onChange,
    onOptionSelect,
    options = [],
    placeholder = '',
    disabled = false,
    autoComplete,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const normalized = String(value || '').trim().toLowerCase();
    const filtered = options
        .filter((item) => item?.label)
        .filter((item) => !normalized || item.label.toLowerCase().includes(normalized))
        .slice(0, 8);

    return (
        <div className="relative">
            <input
                id={id}
                className={inputClass}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 120)}
                autoComplete={autoComplete}
                disabled={disabled}
            />
            {isOpen && filtered.length ? (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-auto rounded-xl border border-[var(--store-border)] bg-[var(--store-card-bg)] p-1.5 shadow-xl">
                    {filtered.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onChange(item.label);
                                onOptionSelect?.(item);
                                setIsOpen(false);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--store-text)] hover:bg-[var(--store-surface-soft)] hover:text-[var(--store-primary)]"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function Step1({
    data,
    onChange,
    onNext,
    fieldErrors,
    countryInput,
    onCountryInputChange,
    countryOptions,
    countriesLoading,
    onProvinceInputChange,
    provinceOptions,
    provinceLoading,
    provinceSuggestionsEnabled,
    onCityInputChange,
    cityOptions,
    citiesLoading,
    citySuggestionsEnabled,
    addressOptions,
    addressLoading,
    onAddressInputChange,
    onAddressOptionSelect,
    isArgentinaCountry,
}) {
    const getFieldError = (field) => fieldErrors?.[field] || '';
    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="signup-field-1" className={labelClass}>Nombre completo</label>
                <input id="signup-field-1" className={inputClass} type="text" autoComplete="name" placeholder="Tu nombre" value={data.name} onChange={(e) => onChange('name', e.target.value)} required minLength={2} maxLength={120} />
                {getFieldError('name') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('name')}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor="signup-field-2" className={labelClass}>Teléfono</label>
                    <input id="signup-field-2" className={inputClass} type="tel" autoComplete="tel" inputMode="tel" placeholder="+54 11 1234 5678" value={data.phone} onChange={(e) => onChange('phone', e.target.value)} required minLength={7} maxLength={25} pattern="^\+?[0-9()\-\s]{7,25}$" title="Ingresa un telefono valido (solo numeros, espacios, +, -, parentesis)." />
                    {getFieldError('phone') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('phone')}</p> : null}
                </div>
                <div>
                    <label htmlFor="signup-field-3" className={labelClass}>N° de CUIL</label>
                    <input id="signup-field-3" className={inputClass} type="text" placeholder="20-12345678-9" value={data.cuit} onChange={(e) => onChange('cuit', e.target.value)} required maxLength={13} pattern="^[0-9]{2}-?[0-9]{8}-?[0-9]{1}$" title="Formato valido: 20-12345678-9" />
                    {getFieldError('cuit') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('cuit')}</p> : null}
                </div>
            </div>

            <div className="border-t border-[var(--store-border)] pt-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--store-muted-text)]">Dirección</p>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="signup-field-4" className={labelClass}>Dirección</label>
                        <AutocompleteField id="signup-field-4"
                            value={data.address}
                            onChange={onAddressInputChange}
                            onOptionSelect={onAddressOptionSelect}
                            options={isArgentinaCountry ? addressOptions : []}
                            placeholder="Calle y numero"
                            autoComplete="street-address"
                        />
                        <input type="hidden" value={data.address} required />
                        {getFieldError('address') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('address')}</p> : null}
                        {isArgentinaCountry && addressLoading ? <p className={helperTextClass}>Buscando direcciones…</p> : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="signup-field-5" className={labelClass}>País</label>
                            <AutocompleteField id="signup-field-5"
                                value={countryInput}
                                onChange={onCountryInputChange}
                                options={countryOptions}
                                placeholder="Argentina"
                                autoComplete="country-name"
                            />
                            <input type="hidden" value={data.country} required />
                            {getFieldError('country') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('country')}</p> : null}
                            {countriesLoading ? <p className={helperTextClass}>Cargando países…</p> : null}
                        </div>
                        <div>
                            <label htmlFor="signup-field-6" className={labelClass}>Provincia</label>
                            <AutocompleteField id="signup-field-6"
                                value={data.province}
                                onChange={onProvinceInputChange}
                                options={provinceSuggestionsEnabled ? provinceOptions : []}
                                placeholder={isArgentinaCountry ? 'Buenos Aires' : 'Provincia / estado / region'}
                                autoComplete="address-level1"
                                disabled={!data.country}
                            />
                            <input type="hidden" value={data.province} required />
                            {getFieldError('province') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('province')}</p> : null}
                            {!data.country ? <p className={helperTextClass}>Primero elige un país.</p> : isArgentinaCountry && provinceLoading ? <p className={helperTextClass}>Cargando provincias…</p> : isArgentinaCountry && !provinceSuggestionsEnabled ? <p className={helperTextClass}>No pudimos cargar las provincias; escríbela a mano.</p> : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="signup-field-7" className={labelClass}>Ciudad</label>
                            <AutocompleteField id="signup-field-7"
                                value={data.city}
                                onChange={onCityInputChange}
                                options={citySuggestionsEnabled ? cityOptions : []}
                                placeholder={isArgentinaCountry ? 'Mar del Plata' : 'Ciudad'}
                                autoComplete="address-level2"
                                disabled={!data.country || (provinceSuggestionsEnabled && !data.provinceId)}
                            />
                            <input type="hidden" value={data.city} required />
                            {getFieldError('city') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('city')}</p> : null}
                            {!data.country ? <p className={helperTextClass}>Primero elige un país.</p> : isArgentinaCountry && !data.provinceId ? <p className={helperTextClass}>Elige una provincia primero.</p> : isArgentinaCountry && citiesLoading ? <p className={helperTextClass}>Cargando ciudades…</p> : isArgentinaCountry && !citySuggestionsEnabled ? <p className={helperTextClass}>No pudimos cargar las ciudades; escríbela a mano.</p> : null}
                        </div>
                        <div>
                            <label htmlFor="signup-field-8" className={labelClass}>Código postal</label>
                            <input id="signup-field-8" className={inputClass} type="text" placeholder="7600" value={data.postalCode} onChange={(e) => onChange('postalCode', e.target.value)} autoComplete="postal-code" required minLength={3} maxLength={20} />
                            {getFieldError('postalCode') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('postalCode')}</p> : null}
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={onNext} className={authPrimaryButtonClass}>
                Continuar
            </button>
        </div>
    );
}

export function Step2({ data, onChange, onNext, onBack, fieldErrors }) {
    const getFieldError = (field) => fieldErrors?.[field] || '';

    return (
        <div className="space-y-5">
            <div>
                <label htmlFor="signup-email" className={labelClass}>Email</label>
                <input id="signup-email" className={inputClass} type="email" autoComplete="email" placeholder="tu@email.com" value={data.email} onChange={(e) => onChange('email', e.target.value)} required maxLength={160} />
                {getFieldError('email') ? <p className={authErrorTextClass}>{getFieldError('email')}</p> : null}
            </div>
            <div>
                <label htmlFor="signup-password" className={labelClass}>Contraseña</label>
                <PasswordInput id="signup-password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={data.password} onChange={(e) => onChange('password', e.target.value)} required minLength={8} maxLength={72} pattern="^(?=.*[A-Za-z])(?=.*\d).{8,72}$" title="Mínimo 8 caracteres, al menos una letra y un número." />
                {getFieldError('password') ? <p className={authErrorTextClass}>{getFieldError('password')}</p> : <p className={helperTextClass}>Mínimo 8 caracteres, con una letra y un número.</p>}
            </div>

            <div>
                <label htmlFor="signup-confirm" className={labelClass}>Confirmar contraseña</label>
                <PasswordInput id="signup-confirm" autoComplete="new-password" placeholder="Repite la contraseña" value={data.confirmPassword} onChange={(e) => onChange('confirmPassword', e.target.value)} required minLength={8} maxLength={72} />
                {getFieldError('confirmPassword') ? <p className={authErrorTextClass}>{getFieldError('confirmPassword')}</p> : null}
            </div>

            <div className="space-y-3 pt-2">
                <button type="button" onClick={onNext} className={authPrimaryButtonClass}>
                    Continuar
                </button>
                <button type="button" onClick={onBack} className={`${authLinkButtonClass} block w-full text-center`}>
                    Volver
                </button>
            </div>
        </div>
    );
}

export function Step3({ data, onChange, onBack, onSubmit, loading, fieldErrors }) {
    const getFieldError = (field) => fieldErrors?.[field] || '';
    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="signup-field-12" className={labelClass}>Razón social o nombre del negocio</label>
                <input id="signup-field-12" className={inputClass} type="text" autoComplete="organization" placeholder="Nombre comercial o razón social" value={data.company} onChange={(e) => onChange('company', e.target.value)} required minLength={2} maxLength={180} />
                {getFieldError('company') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('company')}</p> : null}
            </div>
            <div>
                <label htmlFor="signup-field-13" className={labelClass}>¿A qué se dedica?</label>
                <input id="signup-field-13" className={inputClass} type="text" placeholder="Ej: heladería, panadería, confitería" value={data.businessActivity} onChange={(e) => onChange('businessActivity', e.target.value)} required minLength={2} maxLength={180} />
                {getFieldError('businessActivity') ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{getFieldError('businessActivity')}</p> : null}
            </div>

            <div className="space-y-3 pt-1">
                <button onClick={onSubmit} disabled={loading} className={authPrimaryButtonClass}>
                    {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
                <div>
                    <button type="button" onClick={onBack} className={`${authLinkButtonClass} block w-full text-center`}>
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
}
