import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import StoreLayout from '../../components/layout/StoreLayout';
import { navigate } from '../../utils/navigation';
import { getCountryLabelByCode } from '../../utils/locations';
import { useAddressLocationFields } from '../../hooks/useAddressLocationFields';
import { getExternalLoginUrl, getExternalSignupUrl, isExternalAuthEnabled } from '../../utils/vaseAuth';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);


const EyeIcon = ({ open }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        {open ? (
            <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ) : (
            <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </>
        )}
    </svg>
);

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-gray-700';
const helperTextClass = 'mt-1.5 text-xs text-gray-500';

function AutocompleteField({
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
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl">
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
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-primary"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function Step1({
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
                <label className={labelClass}>Nombre completo</label>
                <input className={inputClass} type="text" placeholder="Tu nombre" value={data.name} onChange={(e) => onChange('name', e.target.value)} required minLength={2} maxLength={120} />
                {getFieldError('name') ? <p className="mt-1 text-xs text-red-600">{getFieldError('name')}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className={labelClass}>Telefono</label>
                    <input className={inputClass} type="tel" placeholder="+54 11 ...." value={data.phone} onChange={(e) => onChange('phone', e.target.value)} required minLength={7} maxLength={25} pattern="^\+?[0-9()\-\s]{7,25}$" title="Ingresa un telefono valido (solo numeros, espacios, +, -, parentesis)." />
                    {getFieldError('phone') ? <p className="mt-1 text-xs text-red-600">{getFieldError('phone')}</p> : null}
                </div>
                <div>
                    <label className={labelClass}>N° CUIL</label>
                    <input className={inputClass} type="text" placeholder="20-12345678-9" value={data.cuit} onChange={(e) => onChange('cuit', e.target.value)} required maxLength={13} pattern="^[0-9]{2}-?[0-9]{8}-?[0-9]{1}$" title="Formato valido: 20-12345678-9" />
                    {getFieldError('cuit') ? <p className="mt-1 text-xs text-red-600">{getFieldError('cuit')}</p> : null}
                </div>
            </div>

            <div className="border-t border-gray-100 pt-2">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Direccion</p>
                <div className="space-y-3">
                    <div>
                        <label className={labelClass}>Direccion</label>
                        <AutocompleteField
                            value={data.address}
                            onChange={onAddressInputChange}
                            onOptionSelect={onAddressOptionSelect}
                            options={isArgentinaCountry ? addressOptions : []}
                            placeholder="Calle y numero"
                            autoComplete="street-address"
                        />
                        <input type="hidden" value={data.address} required />
                        {getFieldError('address') ? <p className="mt-1 text-xs text-red-600">{getFieldError('address')}</p> : null}
                        <p className={helperTextClass}>
                            {isArgentinaCountry
                                ? addressLoading
                                    ? 'Buscando direcciones en GeoRef...'
                                    : 'Escribe calle y altura (minimo 3 caracteres) para ver sugerencias reales.'
                                : 'Completa la direccion manualmente.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Pais</label>
                            <AutocompleteField
                                value={countryInput}
                                onChange={onCountryInputChange}
                                options={countryOptions}
                                placeholder="Argentina"
                                autoComplete="country-name"
                            />
                            <input type="hidden" value={data.country} required />
                            {getFieldError('country') ? <p className="mt-1 text-xs text-red-600">{getFieldError('country')}</p> : null}
                            <p className={helperTextClass}>
                                {countriesLoading ? 'Cargando paises...' : 'Escribe para buscar y selecciona un pais del listado.'}
                            </p>
                        </div>
                        <div>
                            <label className={labelClass}>Provincia</label>
                            <AutocompleteField
                                value={data.province}
                                onChange={onProvinceInputChange}
                                options={provinceSuggestionsEnabled ? provinceOptions : []}
                                placeholder={isArgentinaCountry ? 'Buenos Aires' : 'Provincia / estado / region'}
                                autoComplete="address-level1"
                                disabled={!data.country}
                            />
                            <input type="hidden" value={data.province} required />
                            {getFieldError('province') ? <p className="mt-1 text-xs text-red-600">{getFieldError('province')}</p> : null}
                            <p className={helperTextClass}>
                                {!data.country
                                    ? 'Primero selecciona un pais.'
                                    : isArgentinaCountry
                                        ? provinceLoading
                                            ? 'Cargando provincias de Argentina...'
                                            : provinceSuggestionsEnabled
                                                ? 'Selecciona una provincia valida para habilitar las ciudades.'
                                                : 'No pudimos cargar provincias. Puedes escribirla manualmente.'
                                        : 'Completa la provincia o estado manualmente.'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Ciudad</label>
                            <AutocompleteField
                                value={data.city}
                                onChange={onCityInputChange}
                                options={citySuggestionsEnabled ? cityOptions : []}
                                placeholder={isArgentinaCountry ? 'Mar del Plata' : 'Ciudad'}
                                autoComplete="address-level2"
                                disabled={!data.country || (provinceSuggestionsEnabled && !data.provinceId)}
                            />
                            <input type="hidden" value={data.city} required />
                            {getFieldError('city') ? <p className="mt-1 text-xs text-red-600">{getFieldError('city')}</p> : null}
                            <p className={helperTextClass}>
                                {!data.country
                                    ? 'Primero selecciona un pais.'
                                    : isArgentinaCountry
                                        ? !data.provinceId
                                            ? 'Selecciona una provincia para ver las ciudades disponibles.'
                                            : citiesLoading
                                                ? 'Cargando ciudades de la provincia elegida...'
                                                : citySuggestionsEnabled
                                                    ? 'Selecciona una ciudad del listado oficial.'
                                                    : 'No pudimos cargar las ciudades. Puedes escribirla manualmente.'
                                        : 'Completa tu ciudad manualmente.'}
                            </p>
                        </div>
                        <div>
                            <label className={labelClass}>Codigo postal</label>
                            <input className={inputClass} type="text" placeholder="7600" value={data.postalCode} onChange={(e) => onChange('postalCode', e.target.value)} autoComplete="postal-code" required minLength={3} maxLength={20} />
                            {getFieldError('postalCode') ? <p className="mt-1 text-xs text-red-600">{getFieldError('postalCode')}</p> : null}
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={onNext} className="mt-2 w-full rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-orange-600">
                Continuar
            </button>
        </div>
    );
}

function Step2({ data, onChange, onNext, onBack, fieldErrors }) {
    const [showPass, setShowPass] = useState(false);
    const getFieldError = (field) => fieldErrors?.[field] || '';

    return (
        <div className="space-y-5">
            <div>
                <label className={labelClass}>Mail</label>
                <input className={inputClass} type="email" placeholder="tu@email.com" value={data.email} onChange={(e) => onChange('email', e.target.value)} required maxLength={160} />
                {getFieldError('email') ? <p className="mt-1 text-xs text-red-600">{getFieldError('email')}</p> : null}
            </div>
            <div>
                <label className={labelClass}>Contrasena</label>
                <div className="relative">
                    <input className={inputClass} type={showPass ? 'text' : 'password'} placeholder="********" value={data.password} onChange={(e) => onChange('password', e.target.value)} required minLength={8} maxLength={72} pattern="^(?=.*[A-Za-z])(?=.*\d).{8,72}$" title="Minimo 8 caracteres, al menos una letra y un numero." />
                    <button type="button" onClick={() => setShowPass((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7560] transition-colors hover:text-[#181411]">
                        <EyeIcon open={showPass} />
                    </button>
                </div>
                {getFieldError('password') ? <p className="mt-1 text-xs text-red-600">{getFieldError('password')}</p> : null}
            </div>

            <div>
                <label className={labelClass}>Confirmar contrasena</label>
                <input className={inputClass} type="password" placeholder="********" value={data.confirmPassword} onChange={(e) => onChange('confirmPassword', e.target.value)} required minLength={8} maxLength={72} />
                {getFieldError('confirmPassword') ? <p className="mt-1 text-xs text-red-600">{getFieldError('confirmPassword')}</p> : null}
            </div>

            <div className="space-y-3 pt-1">
                <button onClick={onNext} className="w-full rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-orange-600">
                    Continuar
                </button>
                <div className="text-center">
                    <button onClick={onBack} className="text-sm font-semibold text-[#8a7560] transition-colors hover:text-[#181411]">
                        Volver al paso anterior
                    </button>
                </div>
            </div>
        </div>
    );
}

function Step3({ data, onChange, onBack, onSubmit, loading, fieldErrors }) {
    const getFieldError = (field) => fieldErrors?.[field] || '';
    return (
        <div className="space-y-4">
            <div>
                <label className={labelClass}>Razon social o negocio</label>
                <input className={inputClass} type="text" placeholder="Nombre comercial o razon social" value={data.company} onChange={(e) => onChange('company', e.target.value)} required minLength={2} maxLength={180} />
                {getFieldError('company') ? <p className="mt-1 text-xs text-red-600">{getFieldError('company')}</p> : null}
            </div>
            <div>
                <label className={labelClass}>A que se dedica</label>
                <input className={inputClass} type="text" placeholder="Actividad principal" value={data.businessActivity} onChange={(e) => onChange('businessActivity', e.target.value)} required minLength={2} maxLength={180} />
                {getFieldError('businessActivity') ? <p className="mt-1 text-xs text-red-600">{getFieldError('businessActivity')}</p> : null}
            </div>

            <div className="space-y-3 pt-1">
                <button onClick={onSubmit} disabled={loading} className="w-full rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-orange-600 disabled:opacity-70">
                    {loading ? 'Creando cuenta...' : 'Finalizar registro'}
                </button>
                <div className="text-center">
                    <button onClick={onBack} className="text-sm font-semibold text-[#8a7560] transition-colors hover:text-[#181411]">
                        Volver al paso anterior
                    </button>
                </div>
            </div>
        </div>
    );
}

function Step4({
    email,
    code,
    onCodeChange,
    onVerify,
    onResend,
    onBack,
    loading,
    resendLoading,
    deliveryNotice,
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-[#e5e1de] bg-[#faf7f4] p-3 text-sm text-[#5b4632]">
                {deliveryNotice || (
                    <>
                        Te enviamos un codigo de verificacion a <span className="font-bold">{email}</span> desde el correo configurado en el panel admin.
                    </>
                )}
            </div>
            <div>
                <label className={labelClass}>Codigo de verificacion</label>
                <input
                    className={inputClass}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
                />
            </div>
            <div className="space-y-3 pt-1">
                <button
                    onClick={onVerify}
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-orange-600 disabled:opacity-70"
                >
                    {loading ? 'Verificando...' : 'Verificar email'}
                </button>
                <button
                    onClick={onResend}
                    disabled={resendLoading}
                    className="w-full rounded-lg border border-[#e5e1de] bg-white py-3 font-bold text-[#181411] transition-all active:scale-[0.98] disabled:opacity-60"
                >
                    {resendLoading ? 'Reenviando...' : 'Reenviar codigo'}
                </button>
                <div className="text-center">
                    <button onClick={onBack} className="text-sm font-semibold text-[#8a7560] transition-colors hover:text-[#181411]">
                        Volver al paso anterior
                    </button>
                </div>
            </div>
        </div>
    );
}

function Stepper({ current, total = 3 }) {
    const steps = total === 4
        ? ['Personal', 'Cuenta', 'Negocio', 'Verificar']
        : ['Personal', 'Cuenta', 'Negocio'];
    const denominator = Math.max(1, steps.length - 1);
    const progress = Math.max(0, Math.min(1, (current - 1) / denominator));
    const progressWidth = `${Math.round(progress * 100)}%`;

    return (
        <div className="relative mb-8 flex items-start justify-between px-2">
            <div className="absolute left-0 top-3.5 z-0 h-0.5 w-full bg-gray-200" />
            <div className="absolute left-0 top-3.5 z-0 h-0.5 bg-primary transition-all duration-500" style={{ width: progressWidth }} />
            {steps.map((label, index) => {
                const stepNum = index + 1;
                const done = stepNum < current;
                const active = stepNum === current;
                return (
                    <div key={label} className="relative z-10 flex flex-col items-center">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${done || active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-gray-500 ring-1 ring-gray-200'}`}>
                            {done ? <CheckIcon /> : stepNum}
                        </div>
                        <span className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${active ? 'text-primary' : done ? 'text-gray-700' : 'text-gray-500'}`}>{label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function mapSignupError(code) {
    const dictionary = {
        missing_fields: 'Completa los campos obligatorios.',
        user_exists: 'Ya existe una cuenta con ese email.',
        verification_pending: 'Ese email ya inicio el registro. Te reenviamos el codigo para que completes la verificacion.',
        pending_approval: 'Tu cuenta ya fue creada y esta pendiente de aprobacion del administrador.',
        invalid_tenant_id: 'Tenant invalido.',
        tenant_required: 'Falta configurar tenant para el registro.',
    };
    return dictionary[code] || 'No se pudo crear la cuenta.';
}

function mapVerificationError(code) {
    const dictionary = {
        missing_fields: 'Completa el email y el codigo.',
        invalid_code: 'El codigo ingresado no es valido.',
        code_expired: 'El codigo expiro. Solicita uno nuevo.',
        code_locked: 'Superaste los intentos permitidos. Reenviar codigo.',
        code_not_found: 'No hay un codigo activo para este email.',
        verification_not_found: 'No se encontro una verificacion para este email.',
    };
    return dictionary[code] || 'No se pudo verificar el email.';
}

function getVerificationDeliveryNotice(verification, email) {
    if (!verification) return '';
    if (verification.sent) {
        return `Te enviamos un codigo de verificacion a ${email}.`;
    }
    if (verification.provider === 'smtp_error') {
        return `No pudimos entregar el codigo por correo a ${email}. Revisa la configuracion SMTP o intenta reenviar el codigo.`;
    }
    if (verification.provider === 'log') {
        return 'El correo no se pudo enviar porque SMTP no esta configurado. Revisa los logs del backend para recuperar el codigo o configura el mailer.';
    }
    return `No pudimos confirmar la entrega del codigo a ${email}. Intenta reenviar el codigo.`;
}

export default function SignupPage() {
    const { signup, verifyEmailCode, resendVerificationCode } = useAuth();
    const externalAuthEnabled = isExternalAuthEnabled();
    const externalLoginUrl = getExternalLoginUrl();
    const externalSignupUrl = getExternalSignupUrl();
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [deliveryNotice, setDeliveryNotice] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country: 'AR',
        province: '',
        provinceId: '',
        city: '',
        cityId: '',
        postalCode: '',
        password: '',
        confirmPassword: '',
        company: '',
        businessActivity: '',
        cuit: '',
        address: '',
    });

    const roleForApi = 'retail';
    const update = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => {
            if (!prev?.[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const parseBackendFieldErrors = (codes = []) => {
        const mapping = {
            email_invalid: ['email', 'Ingresa un email valido.'],
            password_invalid_length: ['password', 'La contrasena debe tener entre 8 y 72 caracteres.'],
            password_invalid_format: ['password', 'La contrasena debe incluir al menos una letra y un numero.'],
            name_invalid: ['name', 'Nombre invalido.'],
            phone_invalid: ['phone', 'Telefono invalido.'],
            business_name_invalid: ['company', 'Razon social/negocio invalido.'],
            business_activity_invalid: ['businessActivity', 'Actividad invalida.'],
            cuil_invalid: ['cuit', 'CUIL invalido.'],
            address_invalid: ['address', 'Domicilio invalido.'],
            city_invalid: ['city', 'Localidad invalida.'],
            province_invalid: ['province', 'Provincia invalida.'],
            country_invalid: ['country', 'Pais invalido.'],
            postal_code_invalid: ['postalCode', 'Codigo postal invalido.'],
        };
        const next = {};
        codes.forEach((code) => {
            const entry = mapping[code];
            if (!entry) return;
            const [field, message] = entry;
            if (!next[field]) next[field] = message;
        });
        return next;
    };
    const {
        countryInput,
        countryOptions,
        countriesLoading,
        provinceOptions,
        provinceLoading,
        cityOptions,
        citiesLoading,
        isArgentinaCountry,
        provinceSuggestionsEnabled,
        citySuggestionsEnabled,
        addressOptions,
        addressLoading,
        handleCountryInputChange,
        handleProvinceInputChange,
        handleCityInputChange,
        handleAddressInputChange,
        handleAddressOptionSelect,
    } = useAddressLocationFields({
        value: formData,
        setValue: setFormData,
        fields: {
            countryCode: 'country',
            province: 'province',
            provinceId: 'provinceId',
            city: 'city',
            cityId: 'cityId',
            address: 'address',
        },
    });

    const persistProfileAddress = (email) => {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail) return;

        const countryLabel = getCountryLabelByCode(formData.country, countryOptions);
        const addressLine = formData.address.trim();
        const city = formData.city.trim();
        const postalCode = formData.postalCode.trim();
        const province = formData.province.trim();

        const payload = {
            fullName: formData.name.trim(),
            line1: addressLine,
            fullAddress: addressLine,
            address: addressLine,
            city,
            locality: city,
            postal: postalCode,
            postalCode,
            province,
            provinceId: formData.provinceId,
            region: province,
            country: countryLabel,
            countryCode: formData.country,
            cityId: formData.cityId,
            phone: formData.phone.trim(),
            phoneCountry: formData.country || 'AR',
            phoneNumber: formData.phone.trim(),
            company: formData.company.trim(),
            cuit: formData.cuit.trim(),
        };

        try {
            localStorage.setItem(`teflon_profile_address_${normalizedEmail}`, JSON.stringify(payload));
        } catch (err) {
            console.warn('No se pudo guardar la direccion inicial del perfil', err);
        }
    };

    const validateStep1 = () => {
        if (!formData.name.trim()) return 'Completa tu nombre.';
        if (!formData.phone.trim()) return 'Completa tu telefono.';
        if (!formData.cuit.trim()) return 'Completa tu CUIL.';
        if (!formData.address.trim()) return 'Completa domicilio.';
        if (!formData.country) return 'Selecciona tu pais.';
        if (!formData.city.trim()) return 'Completa tu ciudad.';
        if (!formData.province.trim()) return 'Completa tu provincia.';
        if (!formData.postalCode.trim()) return 'Completa el codigo postal.';
        return '';
    };

    const validateStep2 = () => {
        if (!formData.email.trim()) return 'Completa tu email.';
        if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Email invalido.';
        if (!formData.password) return 'Completa la contrasena.';
        if (formData.password.length < 6) return 'La contrasena debe tener al menos 6 caracteres.';
        if (formData.password !== formData.confirmPassword) return 'Las contrasenas no coinciden.';
        return '';
    };

    const goStep2 = () => {
        const msg = validateStep1();
        if (msg) {
            setError(msg);
            setFieldErrors({});
            return;
        }
        setError('');
        setStep(2);
    };

    const goStep3 = () => {
        const msg = validateStep2();
        if (msg) {
            setError(msg);
            setFieldErrors({});
            return;
        }
        setError('');
        setStep(3);
    };

    const submit = async () => {
        const step1Error = validateStep1();
        if (step1Error) {
            setError(step1Error);
            setStep(1);
            return;
        }

        const step2Error = validateStep2();
        if (step2Error) {
            setError(step2Error);
            setStep(2);
            return;
        }

        if (!formData.company.trim() || !formData.businessActivity.trim()) {
            setError('Completa razon social y actividad para continuar.');
            setStep(3);
            return;
        }
        if (!formData.address.trim()) {
            setError('Completa el domicilio comercial.');
            setStep(1);
            return;
        }

        setError('');
        setFieldErrors({});
        setLoading(true);
        try {
            const data = await signup({
                email: formData.email.trim(),
                password: formData.password,
                role: roleForApi,
                name: formData.name.trim(),
                phone: formData.phone,
                address: formData.address,
                address_extra: '',
                country_code: formData.country ?? '',
                country_label: getCountryLabelByCode(formData.country, countryOptions) ?? '',
                province: formData.province,
                city: formData.city,
                postal_code: formData.postalCode ?? '',
                business_name: formData.company,
                business_activity: formData.businessActivity,
                cuil: formData.cuit,
            });
            const normalizedEmail = formData.email.trim().toLowerCase();
            const requiresVerification = data?.requires_email_verification !== false;
            persistProfileAddress(normalizedEmail);
            if (requiresVerification) {
                setVerificationEmail(normalizedEmail);
                setVerificationCode('');
                setDeliveryNotice(getVerificationDeliveryNotice(data?.verification, normalizedEmail));
                setStep(4);
                return;
            }

            sessionStorage.setItem('teflon_auth_notice', 'Cuenta creada correctamente. Ya podes iniciar sesion.');
            navigate('/login');
        } catch (err) {
            const errorCode = String(err?.message || '');
            const payload = err?.payload || null;
            if (payload?.error === 'invalid_fields' && Array.isArray(payload?.fields)) {
                setFieldErrors(parseBackendFieldErrors(payload.fields));
            }
            if (payload?.requires_email_verification && errorCode === 'verification_pending') {
                const normalizedEmail = formData.email.trim().toLowerCase();
                setVerificationEmail(normalizedEmail);
                setVerificationCode('');
                setDeliveryNotice(getVerificationDeliveryNotice(payload?.verification, normalizedEmail));
                setError(mapSignupError(errorCode));
                setStep(4);
                return;
            }
            setError(mapSignupError(errorCode));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!verificationEmail) {
            setError('No encontramos el email para verificar.');
            return;
        }
        if (!verificationCode.trim()) {
            setError('Ingresa el codigo de verificacion.');
            return;
        }

        setError('');
        setVerificationLoading(true);
        try {
            await verifyEmailCode(verificationEmail, verificationCode.trim());
            sessionStorage.setItem(
                'teflon_auth_notice',
                'Email verificado. Tu cuenta quedo pendiente de aprobacion del administrador.',
            );
            navigate('/login');
        } catch (err) {
            setError(mapVerificationError(String(err?.message || '')));
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!verificationEmail) {
            setError('No encontramos el email para reenviar el codigo.');
            return;
        }

        setError('');
        setResendLoading(true);
        try {
            const response = await resendVerificationCode(verificationEmail);
            setDeliveryNotice(getVerificationDeliveryNotice(response?.verification, verificationEmail));
        } catch (err) {
            setError(mapVerificationError(String(err?.message || '')));
        } finally {
            setResendLoading(false);
        }
    };

    if (externalAuthEnabled) {
        return (
            <StoreLayout>
                <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-white via-gray-50 to-white p-4">
                    <div className="w-full max-w-[460px] rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.18)] md:p-8">
                        <div className="text-center space-y-3">
                            <h1 className="text-2xl font-extrabold text-gray-900">Registro centralizado</h1>
                            <p className="text-sm font-medium text-gray-500">
                                El alta de usuarios de Vase Business se resuelve desde Vase App.
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            {externalSignupUrl ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = externalSignupUrl;
                                    }}
                                    className="w-full rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-orange-600"
                                >
                                    Ir a crear cuenta
                                </button>
                            ) : null}

                            {externalLoginUrl ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = externalLoginUrl;
                                    }}
                                    className="w-full rounded-lg border border-gray-200 bg-white py-3 font-bold text-gray-900 transition-all active:scale-[0.98]"
                                >
                                    Ya tengo cuenta
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </StoreLayout>
        );
    }

    return (
        <StoreLayout>
            <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-white via-gray-50 to-white p-4">
                <div className="w-full max-w-[460px] rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.18)] md:p-8">
                    <div className="mb-6 text-center">
                        <h1 className="mb-1 text-2xl font-extrabold text-gray-900">Crear cuenta</h1>
                        <p className="text-sm font-medium text-gray-500">Crea tu cuenta para comprar y gestionar tus pedidos</p>
                    </div>

                    <Stepper current={step} total={4} />

                    {error ? (
                        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {step === 1 && (
                        <Step1
                            data={formData}
                            onChange={update}
                            onNext={goStep2}
                            fieldErrors={fieldErrors}
                            countryInput={countryInput}
                            onCountryInputChange={handleCountryInputChange}
                            countryOptions={countryOptions}
                            countriesLoading={countriesLoading}
                            onProvinceInputChange={handleProvinceInputChange}
                            provinceOptions={provinceOptions}
                            provinceLoading={provinceLoading}
                            provinceSuggestionsEnabled={provinceSuggestionsEnabled}
                            onCityInputChange={handleCityInputChange}
                            cityOptions={cityOptions}
                            citiesLoading={citiesLoading}
                            citySuggestionsEnabled={citySuggestionsEnabled}
                            addressOptions={addressOptions}
                            addressLoading={addressLoading}
                            onAddressInputChange={handleAddressInputChange}
                            onAddressOptionSelect={handleAddressOptionSelect}
                            isArgentinaCountry={isArgentinaCountry}
                        />
                    )}
                    {step === 2 && <Step2 data={formData} onChange={update} onNext={goStep3} onBack={() => setStep(1)} fieldErrors={fieldErrors} />}
                    {step === 3 && <Step3 data={formData} onChange={update} onBack={() => setStep(2)} onSubmit={submit} loading={loading} fieldErrors={fieldErrors} />}
                    {step === 4 && (
                        <Step4
                            email={verificationEmail || formData.email.trim()}
                            code={verificationCode}
                            onCodeChange={setVerificationCode}
                            onVerify={handleVerifyEmail}
                            onResend={handleResendVerification}
                            onBack={() => setStep(3)}
                            loading={verificationLoading}
                            resendLoading={resendLoading}
                            deliveryNotice={deliveryNotice}
                        />
                    )}

                    <div className="mt-6 border-t border-gray-100 pt-4 text-center">
                        <p className="text-sm text-gray-500">
                            Ya tenes cuenta?{' '}
                            <button onClick={() => navigate('/login')} className="font-bold text-primary hover:underline">
                                Iniciar sesion
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </StoreLayout>
    );
}
