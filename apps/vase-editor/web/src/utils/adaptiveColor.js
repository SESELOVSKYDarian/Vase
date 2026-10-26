// Los bloques de pagina guardan colores fijos (por ejemplo fondo #ffffff y texto #111827) como datos
// del tenant, asi que en modo oscuro quedaban con fondo blanco. Este helper deja pasar cualquier color
// personalizado, pero los colores "claros por defecto" pasan a variables que html.dark redefine
// (ver index.css). En modo claro la variable no existe y se usa el color original.

const LIGHT_BACKGROUNDS = new Set(['#ffffff', '#fff', '#fffaf6', '#f8f7f5']);
const LIGHT_SURFACES = new Set(['#f8fafc', '#f9fafb', '#f3f4f6', '#faf7f4']);
const DARK_TEXTS = new Set(['#111827', '#1a1614', '#0f172a', '#1f2937', '#181411', '#111111', '#000000', '#000']);
const MUTED_TEXTS = new Set(['#64748b', '#6f625d', '#6b7280', '#475569', '#8a7560']);

const ROLE_VARIABLES = {
    background: '--adaptive-background',
    surface: '--adaptive-surface',
    card: '--adaptive-card',
    text: '--adaptive-text',
    muted: '--adaptive-muted',
};

function resolveRole(color, role) {
    if (role === 'text') return DARK_TEXTS.has(color) ? 'text' : null;
    if (role === 'muted') return MUTED_TEXTS.has(color) || DARK_TEXTS.has(color) ? 'muted' : null;
    if (role === 'card') return LIGHT_BACKGROUNDS.has(color) || LIGHT_SURFACES.has(color) ? 'card' : null;
    if (LIGHT_BACKGROUNDS.has(color)) return 'background';
    if (LIGHT_SURFACES.has(color)) return 'surface';
    return null;
}

export function adaptiveColor(value, role = 'background') {
    if (typeof value !== 'string') return value;
    const color = value.trim().toLowerCase();
    const resolvedRole = resolveRole(color, role);
    return resolvedRole ? `var(${ROLE_VARIABLES[resolvedRole]}, ${value})` : value;
}
