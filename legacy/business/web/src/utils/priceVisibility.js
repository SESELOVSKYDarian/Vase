export const PRICE_VISIBILITY = Object.freeze({
    PUBLIC: 'public',
    AUTHENTICATED: 'authenticated',
    HIDDEN: 'hidden',
});

export const PRICE_VISIBILITY_OPTIONS = [
    {
        value: PRICE_VISIBILITY.PUBLIC,
        label: 'Publicos',
        description: 'Cualquier visitante puede ver los precios en la tienda.',
    },
    {
        value: PRICE_VISIBILITY.AUTHENTICATED,
        label: 'Con inicio de sesion',
        description: 'Los precios solo se muestran a usuarios autenticados.',
    },
    {
        value: PRICE_VISIBILITY.HIDDEN,
        label: 'Ocultos',
        description: 'La tienda reemplaza los precios por "Consultar precio".',
    },
];

const VALID_PRICE_VISIBILITY = new Set(Object.values(PRICE_VISIBILITY));

export const getPriceVisibilityMode = (settings) => {
    const configuredMode = settings?.commerce?.price_visibility;
    if (VALID_PRICE_VISIBILITY.has(configuredMode)) {
        return configuredMode;
    }

    if (settings?.commerce?.show_prices === false) {
        return PRICE_VISIBILITY.HIDDEN;
    }

    return PRICE_VISIBILITY.AUTHENTICATED;
};

export const getPriceAccessState = (settings, user) => {
    const mode = getPriceVisibilityMode(settings);
    const showPricesEnabled = mode !== PRICE_VISIBILITY.HIDDEN;
    const canViewPrices =
        mode === PRICE_VISIBILITY.PUBLIC ||
        (mode === PRICE_VISIBILITY.AUTHENTICATED && Boolean(user));

    return {
        mode,
        showPricesEnabled,
        canViewPrices,
        requiresLogin: mode === PRICE_VISIBILITY.AUTHENTICATED && !user,
        isPublic: mode === PRICE_VISIBILITY.PUBLIC,
        isHidden: mode === PRICE_VISIBILITY.HIDDEN,
    };
};
