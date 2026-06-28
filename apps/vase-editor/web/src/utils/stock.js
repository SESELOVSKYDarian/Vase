export const getLowStockThreshold = (settings, fallback = 3) => {
    const raw = Number(settings?.commerce?.low_stock_threshold);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

export const getStockStatus = (stock, lowStockThreshold = 3) => {
    if (typeof stock !== "number") return null;
    if (stock <= 0) {
        return {
            label: "Sin stock",
            tone: "text-red-700",
            bg: "bg-red-100",
            level: "out",
        };
    }
    if (stock <= lowStockThreshold) {
        return {
            label: "Stock por acabar",
            tone: "text-amber-700",
            bg: "bg-amber-100",
            level: "low",
        };
    }
    return {
        label: "Hay stock",
        tone: "text-emerald-700",
        bg: "bg-emerald-100",
        level: "ok",
    };
};

export const isInStock = (stock) => (typeof stock === "number" ? stock > 0 : true);
