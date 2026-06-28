import React, { useEffect, useMemo, useState } from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import { formatCurrency } from "../../utils/format";
import { useStore } from "../../context/StoreContext";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import { navigate } from "../../utils/navigation";
import { getApiBase, getAuthHeaders, getTenantHeaders } from "../../utils/api";
import PriceAccessPrompt from "../../components/PriceAccessPrompt";
import { getPriceAccessState } from "../../utils/priceVisibility";
import { createPlaceholderImage } from "../../utils/productImage";

export default function CartPage() {
    const { cartItems, updateQty, removeItem, addToCart, cartCount, cartSubtotal } = useStore();
    const { settings } = useTenant();
    const { user, loading: authLoading } = useAuth();
    const currency = settings?.commerce?.currency || "ARS";
    const locale = settings?.commerce?.locale || "es-AR";
    const { showPricesEnabled, canViewPrices } = getPriceAccessState(settings, user);
    const [suggestedProducts, setSuggestedProducts] = useState([]);
    const [loadingSuggested, setLoadingSuggested] = useState(false);

    useEffect(() => {
        let active = true;

        const loadSuggested = async () => {
            setLoadingSuggested(true);
            try {
                const res = await fetch(`${getApiBase()}/public/products?limit=24`, {
                    headers: { ...getTenantHeaders(), ...getAuthHeaders() },
                });
                if (!res.ok) {
                    throw new Error(`Error al cargar sugeridos: ${res.status}`);
                }
                const data = await res.json();
                if (!active) return;
                const items = Array.isArray(data.items) ? data.items : [];
                const shuffled = [...items].sort(() => Math.random() - 0.5);
                setSuggestedProducts(shuffled.slice(0, 4));
            } catch (err) {
                console.error("No se pudieron cargar los productos sugeridos", err);
                if (!active) return;
                setSuggestedProducts([]);
            } finally {
                if (active) {
                    setLoadingSuggested(false);
                }
            }
        };

        loadSuggested();
        return () => {
            active = false;
        };
    }, []);

    const frequentlyBought = useMemo(() => {
        return suggestedProducts.map((product) => {
            const data = product.data || {};
            const rawImages = Array.isArray(data.images) ? data.images : [];
            const rawFirst = rawImages[0];
            const image =
                data.image ||
                data.image_url ||
                (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
                createPlaceholderImage({ label: "Producto", width: 200, height: 200 });
            return {
                id: product.id,
                sku: product.sku || product.erp_id,
                name: product.name || "Producto",
                price: Number(product.price || 0),
                image,
                alt: data.image_alt || product.name || "Producto",
                stock: product.stock,
            };
        });
    }, [suggestedProducts]);

    const shippingFlat = Number(settings?.commerce?.shipping_flat || 0);
    const taxRate = Number(settings?.commerce?.tax_rate || 0);
    const shipping = cartSubtotal > 0 ? shippingFlat : 0;
    const tax = (cartSubtotal + shipping) * taxRate;
    const total = cartSubtotal + shipping + tax;

    const freeShippingThreshold = Number(settings?.commerce?.free_shipping_threshold || 0);
    const freeShippingRemaining = Math.max(0, freeShippingThreshold - cartSubtotal);
    const goToAuthForCheckout = (path = "/login") => {
        sessionStorage.setItem("teflon_post_login_redirect", "/checkout");
        navigate(path);
    };

    if (!cartItems.length) {
        return (
            <StoreLayout>
                <main className="w-full flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 min-h-[60vh]">
                    <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 transition-all">
                        <div className="size-24 bg-orange-50 dark:bg-orange-500/10 text-primary rounded-full flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
                        </div>
                        <h1 className="text-3xl font-black mb-3 text-zinc-900 dark:text-zinc-50">Tu carrito está vacío</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">
                            Parece que aún no has añadido nada al carrito.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate("/catalog")}
                            className="bg-primary hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl w-full transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                        >
                            Explorar catálogo
                        </button>
                    </div>
                </main>
            </StoreLayout>
        );
    }

    return (
        <StoreLayout>
            <div className="bg-zinc-50 dark:bg-zinc-950 min-h-[80vh] pb-32 lg:pb-12 pt-8">
                <main className="max-w-[1280px] mx-auto w-full px-4 md:px-8">
                    <div className="flex flex-col gap-2 mb-10">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">Tu Carrito</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                            Tienes {cartCount} producto{cartCount === 1 ? "" : "s"} seleccionado{cartCount === 1 ? "" : "s"}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
                        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-4">
                                {cartItems.map((it) => (
                                    <CartItem
                                        key={it.id}
                                        item={it}
                                        onRemove={() => removeItem(it.id)}
                                        onDec={() => updateQty(it.id, it.qty - 1)}
                                        onInc={() => updateQty(it.id, it.qty + 1)}
                                        onChangeQty={(v) => updateQty(it.id, v)}
                                        currency={currency}
                                        locale={locale}
                                        showPricesEnabled={showPricesEnabled}
                                        canViewPrices={canViewPrices}
                                        authLoading={authLoading}
                                    />
                                ))}
                            </div>

                            <div className="mt-12">
                                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6 text-zinc-900 dark:text-white">
                                    Completa tu carrito
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {loadingSuggested ? (
                                        <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400 font-medium">
                                            Buscando recomendaciones...
                                        </div>
                                    ) : frequentlyBought.length ? (
                                        frequentlyBought.map((item) => (
                                            <UpsellCard
                                                key={item.id}
                                                item={item}
                                                onAdd={() => addToCart(item)}
                                                currency={currency}
                                                locale={locale}
                                                showPricesEnabled={showPricesEnabled}
                                                canViewPrices={canViewPrices}
                                                authLoading={authLoading}
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400 font-medium">
                                            No hay sugerencias disponibles.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 xl:col-span-4">
                            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-t-[2rem] lg:rounded-[2rem] border-t lg:border border-white/20 dark:border-zinc-800 p-6 lg:p-8 fixed bottom-0 left-0 right-0 z-50 lg:static lg:sticky lg:top-24 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-xl dark:shadow-black/50 flex flex-col transition-all">
                                <h2 className="text-2xl font-black mb-6 hidden lg:block text-zinc-900 dark:text-white">Resumen</h2>

                                {canViewPrices ? (
                                    <>
                                        <div className="hidden lg:flex flex-col gap-4 mb-3">
                                            <Row label="Subtotal (sin impuestos)" value={formatCurrency(cartSubtotal, currency, locale)} />
                                            <Row label="Envío estimado" value={shipping === 0 ? "Gratis" : formatCurrency(shipping, currency, locale)} />
                                            {tax > 0 && <Row label="IVA (19%)" value={formatCurrency(tax, currency, locale)} />}
                                            <Row label="Impuestos Adicionales" value={formatCurrency(0, currency, locale)} />
                                            <Row label="Aranceles (si aplica)" value={formatCurrency(0, currency, locale)} />
                                        </div>
                                        <div className="hidden lg:flex px-2 mb-4">
                                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest leading-tight">
                                                ⚠️ El precio final y los impuestos pueden variar según tu ubicación / región
                                            </span>
                                        </div>

                                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-0 lg:pt-6 mb-4 lg:mb-8">
                                            <div className="flex justify-between items-center lg:items-end">
                                                <span className="font-bold text-zinc-500 dark:text-zinc-400 text-sm lg:text-base">Total</span>
                                                <span className="text-3xl lg:text-4xl font-black text-primary tracking-tight">
                                                    {formatCurrency(total, currency, locale)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : showPricesEnabled ? (
                                    <div className="mb-8 rounded-2xl bg-zinc-50 dark:bg-zinc-950 p-6 border border-zinc-100 dark:border-zinc-800">
                                        {authLoading ? (
                                            <p className="text-sm text-zinc-500 font-medium text-center">Cargando...</p>
                                        ) : (
                                            <PriceAccessPrompt align="center" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="mb-8 rounded-2xl bg-zinc-50 dark:bg-zinc-950 p-6 border border-zinc-100 dark:border-zinc-800 text-center text-sm font-medium text-zinc-500">
                                        Precios no disponibles.
                                    </div>
                                )}

                                {user ? (
                                    <button
                                        onClick={() => navigate("/checkout")}
                                        className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mb-4 shadow-lg shadow-orange-500/20"
                                    >
                                        Ir al Checkout
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                    </button>
                                ) : (
                                    <div className="mb-4 space-y-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 p-6 border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                                                    Inicia sesión para pagar
                                                </p>
                                                <p className="text-xs text-zinc-500 font-medium">
                                                    Necesitas una cuenta para completar tu compra.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col xl:flex-row gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => goToAuthForCheckout("/login")}
                                                disabled={authLoading}
                                                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600 disabled:opacity-60 active:scale-95"
                                            >
                                                {authLoading ? "Cargando..." : "Iniciar sesión"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => goToAuthForCheckout("/signup")}
                                                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-50 transition-all hover:border-primary hover:text-primary active:scale-95"
                                            >
                                                Crear cuenta
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="hidden lg:flex flex-col gap-3 mt-4">
                                    <InfoBadge
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>}
                                        title="Envío gratis"
                                        desc={
                                            canViewPrices && freeShippingThreshold > 0
                                                ? freeShippingRemaining > 0
                                                    ? `Faltan ${formatCurrency(freeShippingRemaining, currency, locale)}`
                                                    : "¡Felicidades, tienes envío gratis!"
                                                : "Beneficios en envíos"
                                        }
                                        highlight={freeShippingRemaining <= 0 && canViewPrices}
                                    />
                                    <InfoBadge
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                        title="Pago 100% Seguro"
                                        desc="Tus datos están encriptados"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </StoreLayout>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    );
}

function InfoBadge({ icon, title, desc, highlight }) {
    return (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${highlight ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
            <div className={`p-2 rounded-xl ${highlight ? 'bg-primary/10' : 'bg-white dark:bg-zinc-800 shadow-sm'}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{title}</span>
                <span className="text-xs font-medium opacity-80">{desc}</span>
            </div>
        </div>
    );
}

function CartItem({ item, onRemove, onDec, onInc, onChangeQty, currency, locale, showPricesEnabled, canViewPrices, authLoading }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 p-3 sm:p-5 flex flex-col sm:flex-row gap-5 relative group shadow-sm hover:shadow-md transition-all">
            <button
                onClick={onRemove}
                className="absolute top-4 right-4 z-10 size-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-500/20 text-zinc-400 rounded-full transition-colors"
                title="Eliminar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="w-full sm:w-36 h-48 sm:h-auto aspect-square bg-zinc-50 dark:bg-zinc-950 rounded-[1.5rem] overflow-hidden flex-shrink-0 relative border border-black/5 dark:border-white/5">
                <div
                    className="absolute inset-0 bg-center bg-no-repeat bg-contain m-2"
                    style={{ backgroundImage: `url("${item.image}")` }}
                    role="img"
                    aria-label={item.alt}
                    title={item.alt}
                />
            </div>

            <div className="flex flex-col flex-1 py-1">
                <div className="pr-10 mb-2">
                    <p className="text-xs text-primary font-black tracking-widest uppercase mb-1">{item.sku}</p>
                    <h3 className="font-black text-lg md:text-xl text-zinc-900 dark:text-white leading-tight">{item.name}</h3>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-max mb-4 sm:mb-auto">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Variante:</span>
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{item.variant || "Estándar"}</span>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 mt-auto">
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
                        <button onClick={onDec} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-zinc-700 shadow-sm hover:shadow transition-all active:scale-95">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <input
                            className="w-12 text-center bg-transparent border-none focus:ring-0 font-black text-zinc-900 dark:text-white"
                            type="number"
                            value={item.qty}
                            min={1}
                            onChange={(e) => onChangeQty(Number(e.target.value || 1))}
                        />
                        <button onClick={onInc} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-zinc-700 shadow-sm hover:shadow transition-all active:scale-95">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>

                    {showPricesEnabled ? (
                        <div className="text-right">
                            {canViewPrices ? (
                                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    {formatCurrency(item.price * item.qty, currency, locale)}
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-zinc-500">
                                    {authLoading ? "Cargando..." : "Inicia sesión para ver"}
                                </span>
                            )}
                        </div>
                    ) : <span className="text-xs font-medium text-zinc-500">Consultar precio</span>}
                </div>
            </div>
        </div>
    );
}

function UpsellCard({ item, onAdd, currency, locale, showPricesEnabled, canViewPrices, authLoading }) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer" onClick={onAdd}>
            <div className="size-20 bg-zinc-50 dark:bg-zinc-950 rounded-[1rem] overflow-hidden flex-shrink-0 relative border border-black/5 dark:border-white/5">
                <div
                    className="absolute inset-0 bg-center bg-no-repeat bg-contain m-1 group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url("${item.image}")` }}
                    role="img"
                    aria-label={item.alt}
                    title={item.alt}
                />
            </div>

            <div className="flex flex-col flex-1 pl-1">
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h4>
                <div className="mt-1">
                    {showPricesEnabled ? (
                        canViewPrices ? (
                            <span className="text-primary font-black text-sm">
                                {formatCurrency(item.price, currency, locale)}
                            </span>
                        ) : (
                            <span className="text-[10px] uppercase font-bold text-zinc-400">
                                {authLoading ? "Cargando..." : "Iniciar sesión"}
                            </span>
                        )
                    ) : (
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Consultar</span>
                    )}
                </div>
            </div>

            <button
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 size-10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm active:scale-95 shrink-0 mr-1"
                title="Agregar al carrito"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
            </button>
        </div>
    );
}
