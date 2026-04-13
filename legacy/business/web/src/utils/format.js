export const formatCurrency = (amount, currency = "ARS", locale = "es-AR") => {
    const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    } catch (err) {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    }
};
