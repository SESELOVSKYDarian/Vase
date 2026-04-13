/**
 * VaseLabs Onboarding Utilities
 * Lógica para procesamiento de archivos y scraping durante el registro.
 */

export const processTrainingFiles = async (files: File[]) => {
    // Simulación de procesamiento de archivos
    console.log('Procesando archivos para Base de Conocimientos:', files.map(f => f.name));
    return files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        status: 'processed'
    }));
};

export const scrapeWebsiteUrl = async (url: string) => {
    // Simulación de scraping inicial
    console.log('Iniciando scraping de:', url);
    if (!url.startsWith('http')) return { success: false, error: 'URL inválida' };

    // En una implementación real, esto llamaría a un Edge Function o API interna
    return {
        success: true,
        pages_found: Math.floor(Math.random() * 10) + 1,
        content_preview: 'Conectado exitosamente con el dominio neural...'
    };
};

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
