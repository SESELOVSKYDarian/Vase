// Qué cambió entre dos versiones del diseño, en palabras simples, para el historial.

const SETTINGS_PARTS = [
    ['theme', 'colores y estilo'],
    ['branding', 'logo, textos y menú'],
    ['seo', 'Google y redes'],
    ['commerce', 'ajustes de la tienda'],
];

const PAGE_PARTS = [
    ['home', 'página de inicio'],
    ['about', 'página Nosotros'],
];

const same = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export function changedParts(previous, next) {
    const parts = [];
    for (const [key, label] of SETTINGS_PARTS) {
        if (!same(previous?.settings?.[key], next?.settings?.[key])) parts.push(label);
    }
    for (const [key, label] of PAGE_PARTS) {
        if (!same(previous?.pages?.[key], next?.pages?.[key])) parts.push(label);
    }
    return parts;
}

export function historySummary(parts) {
    if (!parts.length) return 'Cambios en el diseño';
    const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
    return `Antes de cambiar ${list}`;
}

// Un punto nuevo cada vez que se vuelve a editar después de un rato: así quedan los cambios
// grandes y no cada tecla.
export const CHECKPOINT_GAP_MS = 10 * 60 * 1000;

export function shouldCheckpoint(lastCheckpointAt, now = Date.now()) {
    return !lastCheckpointAt || now - lastCheckpointAt >= CHECKPOINT_GAP_MS;
}

export function historyWhen(value, now = new Date()) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
    if (minutes < 1) return 'Recién';
    if (minutes < 60) return `Hace ${minutes} min`;
    const sameDay = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `Hoy, ${time}`;
    return `${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, ${time}`;
}
