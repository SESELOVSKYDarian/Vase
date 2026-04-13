import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import StoreLayout from '../../components/layout/StoreLayout';
import { navigate } from '../../utils/navigation';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const PersonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const StorefrontIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
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

const inputClass = 'w-full px-3.5 py-2.5 rounded-lg border border-[#e5e1de] bg-white text-[#181411] focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-[#8a7560]';
const labelClass = 'block text-[13px] font-bold text-[#181411] mb-1.5';

function Step1({ data, onChange, onNext }) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelClass}>Nombre completo</label>
                <input className={inputClass} type="text" placeholder="Tu nombre" value={data.name} onChange={(e) => onChange('name', e.target.value)} />
            </div>
            <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} type="email" placeholder="tu@email.com" value={data.email} onChange={(e) => onChange('email', e.target.value)} />
            </div>
            <div>
                <label className={labelClass}>Telefono</label>
                <input className={inputClass} type="tel" placeholder="+54 11 ...." value={data.phone} onChange={(e) => onChange('phone', e.target.value)} />
            </div>
            <button onClick={onNext} className="w-full mt-2 bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                Continuar
            </button>
        </div>
    );
}

function Step2({ data, onChange, onNext, onBack }) {
    const [showPass, setShowPass] = useState(false);

    return (
        <div className="space-y-5">
            <div>
                <label className={labelClass}>Contrasena</label>
                <div className="relative">
                    <input className={inputClass} type={showPass ? 'text' : 'password'} placeholder="********" value={data.password} onChange={(e) => onChange('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7560] hover:text-[#181411]">
                        <EyeIcon open={showPass} />
                    </button>
                </div>
            </div>
            <div>
                <label className={labelClass}>Confirmar contrasena</label>
                <input className={inputClass} type="password" placeholder="********" value={data.confirmPassword} onChange={(e) => onChange('confirmPassword', e.target.value)} />
            </div>
            <div>
                <label className={labelClass}>Tipo de cuenta</label>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { value: 'minorista', label: 'Minorista', Icon: PersonIcon },
                        { value: 'mayorista', label: 'Mayorista', Icon: StorefrontIcon },
                    ].map(({ value, label, Icon }) => (
                        <label key={value} className="cursor-pointer">
                            <input type="radio" name="accountType" value={value} checked={data.accountType === value} onChange={() => onChange('accountType', value)} className="sr-only" />
                            <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${data.accountType === value ? 'border-primary bg-primary/10 text-primary' : 'border-[#e5e1de] bg-white text-[#8a7560]'}`}>
                                <Icon />
                                <span className="font-bold text-sm mt-2">{label}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
            <div className="pt-1 space-y-3">
                <button onClick={onNext} className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    Continuar
                </button>
                <div className="text-center">
                    <button onClick={onBack} className="text-[#8a7560] font-semibold text-sm hover:text-[#181411] transition-colors">
                        Volver al paso anterior
                    </button>
                </div>
            </div>
        </div>
    );
}

function Step3({ data, onChange, onBack, onSubmit, loading }) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelClass}>Nombre de la empresa</label>
                <input className={inputClass} type="text" placeholder="Nombre comercial o razon social" value={data.company} onChange={(e) => onChange('company', e.target.value)} />
            </div>
            <div>
                <label className={labelClass}>CUIT / CUIL</label>
                <input className={inputClass} type="text" placeholder="00-00000000-0" value={data.cuit} onChange={(e) => onChange('cuit', e.target.value)} />
            </div>
            <div>
                <label className={labelClass}>Direccion comercial</label>
                <input className={inputClass} type="text" placeholder="Calle, numero, localidad" value={data.address} onChange={(e) => onChange('address', e.target.value)} />
            </div>
            <div className="pt-1 space-y-3">
                <button onClick={onSubmit} disabled={loading} className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70">
                    {loading ? 'Creando cuenta...' : 'Finalizar registro'}
                </button>
                <div className="text-center">
                    <button onClick={onBack} className="text-[#8a7560] font-semibold text-sm hover:text-[#181411] transition-colors">
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
                        Te enviamos un codigo de verificacion a <span className="font-bold">{email}</span>.
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
            <div className="pt-1 space-y-3">
                <button
                    onClick={onVerify}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                    {loading ? 'Verificando...' : 'Verificar email'}
                </button>
                <button
                    onClick={onResend}
                    disabled={resendLoading}
                    className="w-full border border-[#e5e1de] bg-white text-[#181411] font-bold py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                    {resendLoading ? 'Reenviando...' : 'Reenviar codigo'}
                </button>
                <div className="text-center">
                    <button onClick={onBack} className="text-[#8a7560] font-semibold text-sm hover:text-[#181411] transition-colors">
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
        <div className="flex items-start justify-between mb-8 relative px-2">
            <div className="absolute top-3.5 left-0 w-full h-0.5 bg-[#f0ece8] z-0" />
            <div className="absolute top-3.5 left-0 h-0.5 bg-primary z-0 transition-all duration-500" style={{ width: progressWidth }} />
            {steps.map((label, i) => {
                const stepNum = i + 1;
                const done = stepNum < current;
                const active = stepNum === current;
                return (
                    <div key={label} className="relative z-10 flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${done || active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-[#f0ece8] text-[#8a7560]'}`}>
                            {done ? <CheckIcon /> : stepNum}
                        </div>
                        <span className={`text-[9px] mt-1.5 font-bold uppercase tracking-wider transition-colors ${active ? 'text-primary' : 'text-[#8a7560]'}`}>{label}</span>
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
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [deliveryNotice, setDeliveryNotice] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        accountType: 'minorista',
        company: '',
        cuit: '',
        address: '',
    });

    const roleForApi = useMemo(
        () => (formData.accountType === 'mayorista' ? 'wholesale' : 'retail'),
        [formData.accountType]
    );

    const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    const persistProfileAddress = (email) => {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail) return;

        const payload = {
            fullName: formData.name.trim(),
            line1: formData.address.trim(),
            city: '',
            postal: '',
            region: '',
            country: 'Argentina',
            phone: formData.phone.trim(),
            phoneCountry: 'AR',
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
        if (!formData.email.trim()) return 'Completa tu email.';
        if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Email invalido.';
        if (!formData.phone.trim()) return 'Completa tu telefono.';
        return '';
    };

    const validateStep2 = () => {
        if (!formData.password) return 'Completa la contrasena.';
        if (formData.password.length < 6) return 'La contrasena debe tener al menos 6 caracteres.';
        if (formData.password !== formData.confirmPassword) return 'Las contrasenas no coinciden.';
        return '';
    };

    const goStep2 = () => {
        const msg = validateStep1();
        if (msg) {
            setError(msg);
            return;
        }
        setError('');
        setStep(2);
    };

    const goStep3 = () => {
        const msg = validateStep2();
        if (msg) {
            setError(msg);
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
        if (formData.accountType === 'mayorista') {
            if (!formData.company.trim() || !formData.cuit.trim() || !formData.address.trim()) {
                setError('Para mayorista completa empresa, cuit y direccion.');
                setStep(3);
                return;
            }
        }

        setError('');
        setLoading(true);
        try {
            const data = await signup(
                formData.email.trim(),
                formData.password,
                roleForApi,
                formData.name.trim()
            );
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

            const loginNotice = 'Cuenta creada correctamente. Ya podes iniciar sesion.';
            sessionStorage.setItem('teflon_auth_notice', loginNotice);
            navigate('/login');
        } catch (err) {
            const errorCode = String(err?.message || '');
            const payload = err?.payload || null;
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
                'Email verificado. Tu cuenta quedo pendiente de aprobacion del administrador.'
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

    return (
        <StoreLayout>
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-xl border border-[#e5e1de] p-5 md:p-6">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-extrabold text-[#181411] mb-1">Crear cuenta</h1>
                        <p className="text-[#8a7560] text-sm font-medium">Unite a Sanitarios El Teflon</p>
                    </div>

                    <Stepper current={step} total={4} />

                    {error ? (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-sm font-semibold mb-5">
                            {error}
                        </div>
                    ) : null}

                    {step === 1 && <Step1 data={formData} onChange={update} onNext={goStep2} />}
                    {step === 2 && <Step2 data={formData} onChange={update} onNext={goStep3} onBack={() => setStep(1)} />}
                    {step === 3 && <Step3 data={formData} onChange={update} onBack={() => setStep(2)} onSubmit={submit} loading={loading} />}
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

                    <div className="mt-6 pt-4 border-t border-[#f0ece8] text-center">
                        <p className="text-[#8a7560] text-sm">
                            Ya tenes cuenta?{' '}
                            <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline">
                                Iniciar sesion
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </StoreLayout>
    );
}

