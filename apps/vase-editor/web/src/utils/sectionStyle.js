// Estilo y celular de cada bloque. Se guarda en props.section_style (el servidor guarda solo props).
// Sin nada cargado, el bloque se ve exactamente igual que antes.

export const SPACING = [
    ['none', 'Sin', 0],
    ['sm', 'Chica', 24],
    ['md', 'Normal', 48],
    ['lg', 'Grande', 88],
];

const SPACING_PX = Object.fromEntries(SPACING.map(([id, , px]) => [id, px]));

export function sectionStyleOf(props = {}) {
    const raw = props?.section_style && typeof props.section_style === 'object' ? props.section_style : {};
    return {
        spaceTop: SPACING_PX[raw.spaceTop] !== undefined ? raw.spaceTop : 'none',
        spaceBottom: SPACING_PX[raw.spaceBottom] !== undefined ? raw.spaceBottom : 'none',
        hideMobile: raw.hideMobile === true,
        hideDesktop: raw.hideDesktop === true,
    };
}

// Separación extra arriba y abajo del bloque (margen, no toca el diseño de adentro).
export function spacingStyle(props = {}) {
    const style = sectionStyleOf(props);
    const top = SPACING_PX[style.spaceTop];
    const bottom = SPACING_PX[style.spaceBottom];
    if (!top && !bottom) return undefined;
    return { ...(top ? { marginTop: top } : {}), ...(bottom ? { marginBottom: bottom } : {}) };
}

// Clases de Tailwind para mostrar el bloque solo en celular o solo en compu (corte en md = 768px).
export function deviceClass(props = {}) {
    const style = sectionStyleOf(props);
    if (style.hideMobile && style.hideDesktop) return 'hidden';
    if (style.hideMobile) return 'hidden md:block';
    if (style.hideDesktop) return 'md:hidden';
    return undefined;
}

export function hiddenOn(props = {}, viewport = 'desktop') {
    const style = sectionStyleOf(props);
    return viewport === 'mobile' ? style.hideMobile : style.hideDesktop;
}

// Devuelve props con el estilo cambiado; si queda todo por defecto, borra section_style.
export function withSectionStyle(props = {}, patch = {}) {
    const next = { ...sectionStyleOf(props), ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([key, value]) => (key.startsWith('space') ? value !== 'none' : value === true)));
    const { section_style: _old, ...rest } = props || {};
    return Object.keys(clean).length ? { ...rest, section_style: clean } : rest;
}

// A qué pestaña va cada sección del editor de siempre, según su título.
const STYLE_HEADING = /color|estilo|plantilla|disposici|tama[nñ]o/i;
export const headingTab = (text = '') => (STYLE_HEADING.test(String(text)) ? 'estilo' : 'contenido');

export const INSPECTOR_TABS = [
    ['contenido', 'Contenido'],
    ['estilo', 'Estilo'],
    ['celular', 'En celular'],
];
