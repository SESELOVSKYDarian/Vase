// Parte de SignupPage.jsx: SignupPage.
// partes: ./submit.js, ./persist-profile-address.js, ./verify-email.js, ./parse-backend-field-errors.js
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import StoreLayout from '../../../components/layout/StoreLayout';
import { navigate } from '../../../utils/navigation';
import { getCountryLabelByCode } from '../../../utils/locations';
import { useAddressLocationFields } from '../../../hooks/useAddressLocationFields';
import { getExternalLoginUrl, getExternalSignupUrl, isExternalAuthEnabled } from '../../../utils/vaseAuth';
import { isPiquimTenantIdentity, resolveTenantBrandName } from '../../../utils/tenantBranding';
import AuthShell, { AuthAlert, StepProgress, authPrimaryButtonClass, authSecondaryButtonClass } from '../../../components/auth/AuthShell';
import { Step1, Step2, Step3 } from './Step1.jsx';
import { Step4, getVerificationDeliveryNotice, mapSignupError, mapVerificationError } from './Step4.jsx';

import { makeSubmit } from './submit.js';
import { makePersistProfileAddress } from './persist-profile-address.js';
import { makeHandleVerifyEmail } from './verify-email.js';
import { makeParseBackendFieldErrors } from './parse-backend-field-errors.js';
export default function SignupPage() {
    const { signup, verifyEmailCode, resendVerificationCode } = useAuth();
    const { tenant, settings } = useTenant();
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });
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

    const parseBackendFieldErrors = makeParseBackendFieldErrors({  });
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

    const persistProfileAddress = makePersistProfileAddress({ countryOptions, formData });

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
        if (formData.password.length < 8) return 'La contrasena debe tener al menos 8 caracteres.';
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

    const submit = makeSubmit({ countryOptions, formData, parseBackendFieldErrors, persistProfileAddress, roleForApi, setDeliveryNotice, setError, setFieldErrors, setLoading, setStep, setVerificationCode, setVerificationEmail, signup, validateStep1, validateStep2 });

    const handleVerifyEmail = makeHandleVerifyEmail({ setError, setVerificationLoading, verificationCode, verificationEmail, verifyEmailCode });

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

    const brandName = resolveTenantBrandName({ tenant, settings });

    if (externalAuthEnabled) {
        return (
            <StoreLayout>
                <AuthShell
                    variant="signup"
                    isPiquim={isPiquim}
                    brandName={brandName}
                    eyebrow="Registro centralizado"
                    title="Crear cuenta"
                    subtitle="El alta de usuarios se resuelve desde Vase App. Te llevamos allí y después vuelves a la tienda."
                >
                    <div className="space-y-3">
                        {externalSignupUrl ? (
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = externalSignupUrl;
                                }}
                                className={authPrimaryButtonClass}
                            >
                                Continuar con Vase
                            </button>
                        ) : null}
                        {externalLoginUrl ? (
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = externalLoginUrl;
                                }}
                                className={authSecondaryButtonClass}
                            >
                                Ya tengo cuenta
                            </button>
                        ) : null}
                    </div>
                </AuthShell>
            </StoreLayout>
        );
    }

    const STEP_LABELS = ['Tus datos', 'Tu cuenta', 'Tu negocio', 'Verificación'];

    return (
        <StoreLayout>
            <AuthShell
                variant="signup"
                isPiquim={isPiquim}
                brandName={brandName}
                title="Crear cuenta"
                subtitle="Con tu cuenta compras y sigues tus pedidos."
                footer={
                    <>
                        ¿Ya tienes cuenta?{' '}
                        <button type="button" onClick={() => navigate('/login')} className="font-bold text-[var(--store-primary)] underline-offset-4 hover:underline">
                            Iniciar sesión
                        </button>
                    </>
                }
            >
                <StepProgress current={step} labels={STEP_LABELS} />

                {error ? (
                    <div className="mb-5">
                        <AuthAlert tone="error">{error}</AuthAlert>
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

            </AuthShell>
        </StoreLayout>
    );
}
