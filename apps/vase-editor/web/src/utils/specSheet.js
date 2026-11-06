// Ficha técnica (PDF) del producto. Solo links http(s), igual que el servidor.
export function specSheetFrom(...sources) {
    for (const source of sources) {
        const sheet = source && typeof source === 'object' ? source : null;
        const url = String(sheet?.url || '').trim();
        if (!/^https?:\/\//i.test(url)) continue;
        const name = String(sheet.name || '').trim() || decodeURIComponent(url.split('?')[0].split('/').pop() || 'ficha-tecnica.pdf');
        const size = Number(sheet.size);
        return { url, name, size: Number.isFinite(size) && size > 0 ? size : null };
    }
    return null;
}

export function formatFileSize(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
