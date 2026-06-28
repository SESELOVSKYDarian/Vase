import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "teflon_cart_v1";
const buildFavoritesKey = (userKey) => `teflon_favorites_${userKey || "guest"}`;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const StoreContext = createContext(null);

const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStock = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const isValidProductId = (value) => UUID_REGEX.test(String(value || "").trim());

const normalizeCartItem = (item) => {
    if (!item || !isValidProductId(item.id)) return null;
    const qty = Math.max(1, safeNumber(item.qty, 1));
    return {
        ...item,
        id: String(item.id).trim(),
        sku: item.sku || item.erp_id || item.id,
        name: item.name || "Producto",
        price: safeNumber(item.price, 0),
        qty,
        image: item.image || item.image_url || "",
        alt: item.alt || item.name || "Producto",
        stock: normalizeStock(item.stock) ?? undefined,
    };
};

const normalizeFavorite = (product) => {
    if (!product || !product.id) return null;
    return {
        id: product.id,
        sku: product.sku || product.erp_id || product.id,
        name: product.name || "Producto",
        price: safeNumber(product.price, 0),
        image: product.image || product.image_url || "",
        alt: product.alt || product.name || "Producto",
        stock: normalizeStock(product.stock) ?? undefined,
    };
};

export const StoreProvider = ({ children }) => {
    const { user } = useAuth();
    const favoritesKey = useMemo(
        () => buildFavoritesKey(user?.id || user?.email || "guest"),
        [user]
    );
    const [search, setSearch] = useState("");
    const [cartItems, setCartItems] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter(Boolean) : [];
        } catch (err) {
            console.warn("No se pudo leer el carrito guardado", err);
            return [];
        }
    });
    const [favorites, setFavorites] = useState(() => {
        try {
            const raw = localStorage.getItem(favoritesKey);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.warn("No se pudo leer favoritos guardados", err);
            return [];
        }
    });
    const [toast, setToast] = useState({ show: false, message: "" });
    const toastTimerRef = useRef(null);

    useEffect(() => {
        setCartItems((prev) => {
            const normalized = (Array.isArray(prev) ? prev : []).map(normalizeCartItem).filter(Boolean);
            if (
                normalized.length === prev.length &&
                normalized.every((item, index) => item.id === prev[index]?.id && item.qty === prev[index]?.qty)
            ) {
                return prev;
            }
            return normalized;
        });
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
        } catch (err) {
            console.warn("No se pudo guardar el carrito", err);
        }
    }, [cartItems]);

    useEffect(() => {
        if (!user) {
            setFavorites([]);
            return;
        }
        try {
            const raw = localStorage.getItem(favoritesKey);
            setFavorites(raw ? JSON.parse(raw) : []);
        } catch (err) {
            console.warn("No se pudo cargar favoritos del usuario", err);
            setFavorites([]);
        }
    }, [favoritesKey, user]);

    useEffect(() => {
        if (!user) return;
        try {
            localStorage.setItem(favoritesKey, JSON.stringify(favorites));
        } catch (err) {
            console.warn("No se pudo guardar favoritos", err);
        }
    }, [favorites, favoritesKey, user]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const cartCount = useMemo(
        () => cartItems.reduce((acc, item) => acc + item.qty, 0),
        [cartItems]
    );

    const cartSubtotal = useMemo(
        () => cartItems.reduce((acc, item) => acc + item.price * item.qty, 0),
        [cartItems]
    );

    const showToast = useCallback((message) => {
        if (!message) return;
        setToast({ show: true, message });
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
            setToast({ show: false, message: "" });
        }, 2600);
    }, []);

    const addToCart = (product, qty = 1) => {
        if (!product || !isValidProductId(product.id)) {
            showToast("No se pudo agregar este producto al carrito");
            return;
        }
        const nextQty = Math.max(1, safeNumber(qty, 1));
        const stockValue = normalizeStock(product.stock);
        let didAdd = false;

        setCartItems((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            const maxQty = stockValue != null ? Math.max(stockValue, 0) : null;
            if (maxQty !== null && maxQty <= 0) {
                return prev;
            }
            if (existing) {
                const desiredQty = existing.qty + nextQty;
                const cappedQty = maxQty != null ? Math.min(desiredQty, maxQty) : desiredQty;
                if (cappedQty === existing.qty) {
                    return prev;
                }
                didAdd = true;
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, qty: cappedQty, stock: stockValue ?? item.stock }
                        : item
                );
            }

            didAdd = true;
            return [
                ...prev,
                {
                    id: product.id,
                    sku: product.sku || product.erp_id || product.id,
                    name: product.name || "Producto",
                    price: safeNumber(product.price, 0),
                    qty: maxQty != null ? Math.min(nextQty, maxQty) : nextQty,
                    image: product.image || product.image_url || "",
                    alt: product.alt || product.name || "Producto",
                    variant: product.variant || "",
                    stock: stockValue ?? undefined,
                },
            ];
        });
        if (didAdd) {
            showToast("Producto agregado al carrito");
        }
    };

    const updateQty = (id, qty) => {
        const nextQty = Math.max(1, safeNumber(qty, 1));
        setCartItems((prev) =>
            prev.flatMap((item) => {
                if (item.id !== id) return [item];
                const maxQty = typeof item.stock === "number" ? item.stock : null;
                const cappedQty = maxQty != null ? Math.min(nextQty, maxQty) : nextQty;
                if (cappedQty < 1) return [];
                return [{ ...item, qty: cappedQty }];
            })
        );
    };

    const removeItem = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const isFavorite = useCallback(
        (id) => favorites.some((item) => item.id === id),
        [favorites]
    );

    const requireAuthForFavorites = useCallback(() => {
        if (user) return true;
        showToast("Inicia sesión para guardar favoritos");
        return false;
    }, [user, showToast]);

    const addFavorite = useCallback((product) => {
        if (!requireAuthForFavorites()) return;
        const normalized = normalizeFavorite(product);
        if (!normalized) return;
        setFavorites((prev) => {
            if (prev.some((item) => item.id === normalized.id)) return prev;
            return [...prev, normalized];
        });
    }, [requireAuthForFavorites]);

    const removeFavorite = useCallback((id) => {
        setFavorites((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const toggleFavorite = useCallback((product) => {
        if (!requireAuthForFavorites()) return false;
        const normalized = normalizeFavorite(product);
        if (!normalized) return false;
        let added = false;
        setFavorites((prev) => {
            const exists = prev.some((item) => item.id === normalized.id);
            added = !exists;
            if (exists) {
                return prev.filter((item) => item.id !== normalized.id);
            }
            return [...prev, normalized];
        });
        return added;
    }, [requireAuthForFavorites]);

    return (
        <StoreContext.Provider
            value={{
                search,
                setSearch,
                cartItems,
                cartCount,
                cartSubtotal,
                addToCart,
                updateQty,
                removeItem,
                clearCart,
                favorites,
                isFavorite,
                addFavorite,
                removeFavorite,
                toggleFavorite,
                toast,
                showToast,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error("useStore debe usarse dentro de StoreProvider");
    }
    return context;
};
