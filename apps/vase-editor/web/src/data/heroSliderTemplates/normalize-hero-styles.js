// Parte de heroSliderTemplates.js: normalizeHeroStyles.
import { HERO_THEME_TOKEN_MAP, getDefaultHeroStyles, normalizeHeroVariant } from "./style-defaults-by-variant.js";

export const normalizeHeroStyles = (variant, styles, themeColors = null) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    const defaults = getDefaultHeroStyles(variant);
    const source = styles && typeof styles === 'object' ? styles : {};
    const themeMap = HERO_THEME_TOKEN_MAP[normalizedVariant] || {};
    const next = { ...defaults };

    Object.keys(defaults).forEach((key) => {
        const override = source[key];
        if (typeof override === 'string' && override.trim().length > 0) {
            next[key] = override;
            return;
        }
        const tokenName = themeMap[key];
        if (tokenName && themeColors && typeof themeColors[tokenName] === 'string' && themeColors[tokenName].length > 0) {
            next[key] = themeColors[tokenName];
        }
    });

    return next;
};
