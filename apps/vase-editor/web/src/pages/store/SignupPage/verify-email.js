// Parte de SignupPage: handleVerifyEmail.
import { mapVerificationError } from './Step4.jsx';
import { navigate } from '../../../utils/navigation';

/** Arma handleVerifyEmail con lo que necesita del componente. */
export function makeHandleVerifyEmail({ setError, setVerificationLoading, verificationCode, verificationEmail, verifyEmailCode }) {
    return async () => {
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
            const result = await verifyEmailCode(verificationEmail, verificationCode.trim());
            sessionStorage.setItem(
                'teflon_auth_notice',
                result?.pending_approval === false
                    ? 'Email verificado. Ya podes ingresar con tu cuenta.'
                    : 'Email verificado. Tu cuenta quedo pendiente de aprobacion del administrador.',
            );
            navigate('/login');
        } catch (err) {
            setError(mapVerificationError(String(err?.message || '')));
        } finally {
            setVerificationLoading(false);
        }
    };
}
