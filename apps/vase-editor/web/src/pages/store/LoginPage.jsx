import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import StoreLayout from '../../components/layout/StoreLayout';
import { navigate, normalizeInternalPath } from '../../utils/navigation';
import { resolveTenantBrandName } from '../../utils/tenantBranding';
import {
    getExternalBusinessLaunchUrl,
    getExternalLoginUrl,
    getExternalSignupUrl,
    isExternalAuthEnabled,
} from '../../utils/vaseAuth';

function getVerificationDeliveryNotice(verification, email) {
    if (!verification) return `Te reenviamos un codigo a ${email}.`;
    if (verification.sent) {
        return `Te reenviamos un codigo a ${email}.`;
    }
    if (verification.provider === 'smtp_error') {
        return `No pudimos entregar el codigo a ${email}. Revisa la configuracion SMTP o intenta de nuevo.`;
    }
    if (verification.provider === 'log') {
        return 'El correo no se pudo enviar porque SMTP no esta configurado. Revisa los logs del backend para recuperar el codigo.';
    }
    return `No pudimos confirmar la entrega del codigo a ${email}.`;
}

export default function LoginPage() {
    const { login, verifyEmailCode, resendVerificationCode } = useAuth();
    const { tenant, settings } = useTenant();
    const brandName = resolveTenantBrandName({ tenant, settings });
    const brandInitial = brandName.trim().charAt(0).toUpperCase() || 'S';
    const externalAuthEnabled = isExternalAuthEnabled();
    const externalLaunchUrl = getExternalBusinessLaunchUrl();
    const externalLoginUrl = getExternalLoginUrl();
    const externalSignupUrl = getExternalSignupUrl();
    const externalAccessUrl = externalLaunchUrl || externalLoginUrl;
    const [email, setEmail] = useState('admin');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        const storedNotice = sessionStorage.getItem('teflon_auth_notice');
        if (storedNotice) {
            setNotice(storedNotice);
            sessionStorage.removeItem('teflon_auth_notice');
        }
    }, []);

    const mapLoginError = (code) => {
        const dictionary = {
            invalid_credentials: 'Credenciales invalidas.',
            invalid_code: 'Codigo invalido.',
            code_not_found: 'Primero solicita un codigo.',
            code_expired: 'El codigo expiro. Solicita uno nuevo.',
            code_locked: 'Superaste los intentos permitidos. Solicita un nuevo codigo.',
            user_not_found: 'No encontramos una cuenta con ese email.',
            request_login_code_failed: 'No pudimos enviar el codigo.',
            pending_approval: 'Tu cuenta esta pendiente de aprobacion por el administrador.',
            user_inactive: 'Tu cuenta esta inactiva. Contacta al administrador.',
            no_tenant_access: 'No tienes acceso a este tenant.',
            email_password_required: 'Completa email y contrasena.',
            email_not_verified: 'Debes verificar tu email antes de iniciar sesion.',
            external_auth_enabled: 'El login externo esta activado.',
            failed_to_fetch: 'No se pudo conectar con el backend. Verifica que el server este corriendo.',
            login_failed: 'No se pudo iniciar sesion.',
        };
        const normalizedCode = code.toLowerCase().replace(/\s+/g, '_');
        return dictionary[normalizedCode] || `No se pudo iniciar sesion (${code}).`;
    };

    const mapVerificationError = (code) => {
        const dictionary = {
            missing_fields: 'Completa el codigo de verificacion.',
            invalid_code: 'El codigo ingresado no es valido.',
            code_expired: 'El codigo expiro. Solicita uno nuevo.',
            code_locked: 'Superaste los intentos. Reenvia un nuevo codigo.',
            code_not_found: 'No hay codigo activo. Reenvia uno nuevo.',
            verification_not_found: 'No encontramos verificacion para este email.',
        };
        return dictionary[code] || 'No se pudo verificar el email.';
    };

    const getNormalizedLoginEmail = () => {
        const rawEmail = String(email || '').trim();
        if (!rawEmail) return '';
        return rawEmail.toLowerCase();
    };

    const consumePostLoginRedirect = () => {
        const pendingRedirect = sessionStorage.getItem('teflon_post_login_redirect');
        if (!pendingRedirect) return false;
        sessionStorage.removeItem('teflon_post_login_redirect');
        navigate(normalizeInternalPath(pendingRedirect, '/profile'));
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (externalAuthEnabled && externalAccessUrl) {
            window.location.href = externalAccessUrl;
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await login(getNormalizedLoginEmail(), password);
            const role = data?.user?.role;
            if (consumePostLoginRedirect()) {
                return;
            }
            if (role === 'tenant_admin' || role === 'master_admin') {
                navigate('/admin');
            } else {
                navigate('/profile');
            }
        } catch (err) {
            const code = String(err?.message || '');
            setError(mapLoginError(code));
            if (code === 'email_not_verified') {
                setPendingVerificationEmail(getNormalizedLoginEmail());
                setVerificationCode('');
            } else {
                setPendingVerificationEmail('');
            }
        } finally {
            setLoading(false);
        }
    };

    if (externalAuthEnabled) {
        return (
            <StoreLayout>
                <div className="min-h-[80vh] flex items-center justify-center px-4">
                    <div className="max-w-md w-full bg-white dark:bg-[#1a130c] p-10 rounded-2xl shadow-xl border border-[#e5e1de] dark:border-[#3d2f21]">
                        <div className="text-center space-y-3">
                            <h2 className="text-3xl font-black text-[#181411] dark:text-white">Acceso centralizado</h2>
                            <p className="text-[#8a7560]">
                                El inicio de sesion de Vase Business se gestiona desde Vase App.
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (externalAccessUrl) {
                                        window.location.href = externalAccessUrl;
                                    }
                                }}
                                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                            >
                                Abrir desde Vase
                            </button>

                            {externalSignupUrl ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = externalSignupUrl;
                                    }}
                                    className="w-full border border-[#e5e1de] dark:border-[#3d2f21] text-[#181411] dark:text-white font-bold py-4 rounded-lg transition-all active:scale-[0.98]"
                                >
                                    Ir a registrarse
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </StoreLayout>
        );
    }

    const handleVerifyPendingEmail = async () => {
        if (!pendingVerificationEmail) {
            setError('No hay email pendiente de verificacion.');
            return;
        }
        if (!verificationCode.trim()) {
            setError('Ingresa el codigo de verificacion.');
            return;
        }

        setError('');
        setVerificationLoading(true);
        try {
            await verifyEmailCode(pendingVerificationEmail, verificationCode.trim());
            setNotice('Email verificado. Tu cuenta quedo pendiente de aprobacion del administrador.');
            setPendingVerificationEmail('');
            setVerificationCode('');
        } catch (err) {
            setError(mapVerificationError(String(err?.message || '')));
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!pendingVerificationEmail) {
            setError('No hay email pendiente de verificacion.');
            return;
        }

        setError('');
        setResendLoading(true);
        try {
            const response = await resendVerificationCode(pendingVerificationEmail);
            setNotice(getVerificationDeliveryNotice(response?.verification, pendingVerificationEmail));
        } catch (err) {
            setError(mapVerificationError(String(err?.message || '')));
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <StoreLayout>
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="relative max-w-md w-full overflow-hidden rounded-[32px] border border-[#f0d0bf] bg-[#fffaf6] p-8 shadow-[0_24px_80px_rgba(255,77,0,0.16)] dark:border-[#3d2f21] dark:bg-[#1a130c]">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#ff4d00]/15 blur-2xl" />
                    <div className="relative text-center mb-8">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff4d00] text-xl font-black text-white shadow-[0_16px_35px_rgba(255,77,0,0.35)]">
                            {brandInitial}
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff4d00]">Panel {brandName}</p>
                        <h2 className="mt-2 text-3xl font-black text-[#181411] dark:text-white">Iniciar sesion</h2>
                        <p className="text-[#8a7560] mt-2">Ingresa con usuario y contrasena</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                    {notice && (
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg mb-6 text-sm font-medium border border-emerald-100">
                            {notice}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-[#181411] dark:text-white mb-2">Usuario o email</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="admin o tu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#181411] dark:text-white mb-2">Contrasena</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="Tu contrasena"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>

                    {pendingVerificationEmail ? (
                        <div className="mt-6 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-[#faf7f4] dark:bg-[#2b2219] p-4 space-y-3">
                            <p className="text-[13px] font-semibold text-[#5b4632] dark:text-[#f4e7d8]">
                                Verifica tu email para continuar: {pendingVerificationEmail}
                            </p>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="Codigo de 6 digitos"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={handleVerifyPendingEmail}
                                    disabled={verificationLoading}
                                    className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {verificationLoading ? 'Verificando...' : 'Verificar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resendLoading}
                                    className="w-full border border-[#e5e1de] dark:border-[#3d2f21] text-[#181411] dark:text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {resendLoading ? 'Reenviando...' : 'Reenviar codigo'}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-8 text-center">
                        <p className="text-[#8a7560] text-sm">
                            No tienes cuenta?{' '}
                            <button
                                onClick={() => navigate('/signup')}
                                className="text-primary font-bold hover:underline"
                            >
                                Registrarse
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </StoreLayout>
    );
}
