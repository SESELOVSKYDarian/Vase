// Parte de ProfilePage: handleProfilePhotoChange.
import { getApiBase } from '../../../utils/api';

/** Arma handleProfilePhotoChange con lo que necesita del componente. */
export function makeHandleProfilePhotoChange({ setProfilePhoto, uploadProfilePhoto, user }) {
    return async (event) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        event.target.value = '';
    
        let previewUrl = '';
        try {
            previewUrl = URL.createObjectURL(file);
            setProfilePhoto(previewUrl);
            const photoUrl = await uploadProfilePhoto(file);
            if (photoUrl) {
                const finalUrl = photoUrl.startsWith('http')
                    ? photoUrl
                    : `${getApiBase()}${photoUrl}`;
                setProfilePhoto(finalUrl);
                try {
                    const key = `teflon_profile_photo_${user.id || user.email}`;
                    localStorage.removeItem(key);
                } catch {}
            }
        } catch (err) {
            console.error('Photo upload failed', err);
            const message = typeof err?.message === 'string' ? err.message : 'No se pudo subir la foto';
            window.alert(message);
            if (user.photo_url) {
                setProfilePhoto(user.photo_url.startsWith('http')
                    ? user.photo_url
                    : `${getApiBase()}${user.photo_url}`);
            } else {
                setProfilePhoto('');
            }
        } finally {
            if (previewUrl) {
                setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
            }
        }
    };
}
