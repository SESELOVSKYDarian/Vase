// Parte de SignupPage.jsx: Step4, mapSignupError, mapVerificationError, getVerificationDeliveryNotice.
import { AuthAlert, authLinkButtonClass, authPrimaryButtonClass, authSecondaryButtonClass } from '../../../components/auth/AuthShell';
import { inputClass, labelClass } from './Step1.jsx';

export function Step4({
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
            <AuthAlert tone="info">
                {deliveryNotice || (
                    <>
                        Te enviamos un código de 6 dígitos a <span className="font-semibold text-[var(--store-text)]">{email}</span>. Puede tardar un minuto.
                    </>
                )}
            </AuthAlert>
            <div>
                <label htmlFor="signup-field-14" className={labelClass}>Código de verificación</label>
                <input id="signup-field-14"
                    className={`${inputClass} text-center text-lg font-semibold tracking-[0.4em]`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
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
                    className={authPrimaryButtonClass}
                >
                    {loading ? 'Verificando…' : 'Verificar email'}
                </button>
                <button
                    onClick={onResend}
                    disabled={resendLoading}
                    className={authSecondaryButtonClass}
                >
                    {resendLoading ? 'Reenviando…' : 'Reenviar código'}
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

export function mapSignupError(code) {
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

export function mapVerificationError(code) {
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

export function getVerificationDeliveryNotice(verification, email) {
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
