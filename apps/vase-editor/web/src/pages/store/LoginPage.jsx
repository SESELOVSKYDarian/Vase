import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import StoreLayout from '../../components/layout/StoreLayout';
import { navigate, normalizeInternalPath } from '../../utils/navigation';
import { isPiquimTenantIdentity, resolveTenantBrandName } from '../../utils/tenantBranding';
import AuthShell, {
    AuthAlert,
    PasswordInput,
    authInputClass,
    authLabelClass,
    authLinkButtonClass,
    authPrimaryButtonClass,
    authSecondaryButtonClass,
} from '../../components/auth/AuthShell';
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
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });
    const brandName = resolveTenantBrandName({ tenant, settings });
    const externalAuthEnabled = isExternalAuthEnabled();
    const externalLaunchUrl = getExternalBusinessLaunchUrl();
    const externalLoginUrl = getExternalLoginUrl();
    const externalSignupUrl = getExternalSignupUrl();
    const externalAccessUrl = externalLaunchUrl || externalLoginUrl;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                <AuthShell
                    variant="login"
                    isPiquim={isPiquim}
                    brandName={brandName}
                    eyebrow="Acceso centralizado"
                    title="Iniciar sesión"
                    subtitle="El inicio de sesión se gestiona desde Vase App. Te llevamos allí y después vuelves a la tienda."
                    footer={externalSignupUrl ? 'Si todavía no tienes cuenta, puedes crearla desde Vase.' : null}
                >
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (externalAccessUrl) {
                                    window.location.href = externalAccessUrl;
                                }
                            }}
                            className={authPrimaryButtonClass}
                        >
                            Continuar con Vase
                        </button>
                        {externalSignupUrl ? (
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = externalSignupUrl;
                                }}
                                className={authSecondaryButtonClass}
                            >
                                Crear cuenta
                            </button>
                        ) : null}
                    </div>
                </AuthShell>
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
            <AuthShell
                variant="login"
                isPiquim={isPiquim}
                brandName={brandName}
                eyebrow="Mi cuenta"
                title="Iniciar sesión"
                subtitle={isPiquim ? 'Ingresa para ver precios, tus pedidos y tus favoritos.' : 'Ingresa con tu email o usuario.'}
                footer={
                    <>
                        ¿No tienes cuenta?{' '}
                        <button type="button" onClick={() => navigate('/signup')} className="font-bold text-[var(--store-primary)] underline-offset-4 hover:underline">
                            Crear cuenta
                        </button>
                    </>
                }
            >
                {error || notice ? (
                    <div className="mb-6 space-y-3">
                        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
                        {notice ? <AuthAlert tone="success">{notice}</AuthAlert> : null}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="login-email" className={authLabelClass}>Email o usuario</label>
                        <input
                            id="login-email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={authInputClass}
                            placeholder="tu@email.com"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck={false}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="login-password" className={authLabelClass}>Contraseña</label>
                        <PasswordInput
                            id="login-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Tu contraseña"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                        {loading ? 'Ingresando…' : 'Ingresar'}
                    </button>
                </form>

                {pendingVerificationEmail ? (
                    <div className="mt-8 space-y-4 rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface-soft)] p-5">
                        <div>
                            <p className="text-sm font-bold text-[var(--store-text)]">Verifica tu email</p>
                            <p className="mt-1 text-sm leading-5 text-[var(--store-muted-text)]">
                                Te enviamos un código de 6 dígitos a <span className="font-semibold text-[var(--store-text)]">{pendingVerificationEmail}</span>.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="login-code" className={authLabelClass}>Código de verificación</label>
                            <input
                                id="login-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className={`${authInputClass} text-center text-lg font-semibold tracking-[0.4em]`}
                                placeholder="000000"
                            />
                        </div>
                        <div className="space-y-3">
                            <button type="button" onClick={handleVerifyPendingEmail} disabled={verificationLoading} className={authPrimaryButtonClass}>
                                {verificationLoading ? 'Verificando…' : 'Verificar'}
                            </button>
                            <button type="button" onClick={handleResendCode} disabled={resendLoading} className={`${authLinkButtonClass} block w-full text-center`}>
                                {resendLoading ? 'Reenviando…' : 'Reenviar código'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </AuthShell>
        </StoreLayout>
    );
}
