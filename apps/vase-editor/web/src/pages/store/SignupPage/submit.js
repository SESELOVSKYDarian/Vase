// Parte de SignupPage: submit.
import { getCountryLabelByCode } from '../../../utils/locations';
import { getVerificationDeliveryNotice } from './Step4.jsx';
import { mapSignupError } from './Step4.jsx';
import { navigate } from '../../../utils/navigation';

/** Arma submit con lo que necesita del componente. */
export function makeSubmit({ countryOptions, formData, parseBackendFieldErrors, persistProfileAddress, roleForApi, setDeliveryNotice, setError, setFieldErrors, setLoading, setStep, setVerificationCode, setVerificationEmail, signup, validateStep1, validateStep2 }) {
    return async () => {
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
}
