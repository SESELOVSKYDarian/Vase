import { uploadPublicFile } from './uploadsClient';

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

// Sube el archivo al servidor de archivos y devuelve su link. Si el servidor no responde y la imagen es
// chica, la guarda dentro de la página como último recurso (el campo avisa que conviene volver a subirla).
export async function uploadMedia(file, { inlineMaxBytes = 1.5 * 1024 * 1024 } = {}) {
    try {
        return await uploadPublicFile(file);
    } catch (error) {
        if (String(file?.type || '').startsWith('image/') && file.size <= inlineMaxBytes) {
            const dataUrl = await readAsDataUrl(file).catch(() => '');
            if (dataUrl) return dataUrl;
        }
        throw error;
    }
}
