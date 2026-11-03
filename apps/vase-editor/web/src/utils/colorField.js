// Acepta "#ff6a00", "ff6a00", "#f60" o "F60" y devuelve "#ff6a00". Si no es un color válido, devuelve ''.
export function normalizeHex(value) {
    const text = String(value || '').trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(text)) return `#${text.split('').map((char) => char + char).join('')}`;
    if (/^[0-9a-f]{6}$/.test(text)) return `#${text}`;
    return '';
}
