import React from 'react';
import {
    getPriceVisibilityMode,
    PRICE_VISIBILITY,
    PRICE_VISIBILITY_OPTIONS,
} from '../../../utils/priceVisibility';

const PRICE_ADJUSTMENTS_FALLBACK = {
    retail_percent: 0,
    wholesale_percent: 0,
    promo_enabled: false,
    promo_percent: 0,
    promo_scope: 'both',
    promo_label: 'Oferta',
};

const fieldClass =
    "w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const compactFieldClass =
    "w-24 rounded-lg border border-white/25 bg-zinc-900/70 px-2.5 py-1.5 text-right text-sm text-white outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const PricingEditor = ({ settings, setSettings, offersManager, usersManager, categories = [], onSave, isSaving }) => {
    if (!offersManager || !usersManager) return null;

    const {
        offers,
        offersLoading,
        offersError,
        offerForm,
        offerFormSaving,
        editingOfferId,
        offerDeleteId,
        setOfferForm,
        resetOfferForm,
        toggleOfferUser,
        toggleOfferCategory,
        editOffer,
        submitOffer,
        removeOffer,
    } = offersManager;

    const offerUsers = Array.isArray(usersManager.usersList) ? usersManager.usersList : [];
    const categoryItems = Array.isArray(categories) ? categories : [];

    const priceAdjustments = settings?.commerce?.price_adjustments || PRICE_ADJUSTMENTS_FALLBACK;
    const priceVisibilityMode = getPriceVisibilityMode(settings);

    const updateCommerce = (patch) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                ...patch,
            },
        }));
    };

    const updatePriceAdjustments = (patch) => {
        updateCommerce({
            price_adjustments: {
                ...(settings?.commerce?.price_adjustments || {}),
                ...patch,
            },
        });
    };

    const toggleReviewsEnabled = () => {
        updateCommerce({
            reviews_enabled: settings?.commerce?.reviews_enabled === false,
        });
    };

    const updatePriceVisibility = (mode) => {
        updateCommerce({
            price_visibility: mode,
            show_prices: mode !== PRICE_VISIBILITY.HIDDEN,
        });
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Pricing</h2>
                    <p className="text-sm text-zinc-400">Completa los campos de descuentos y ofertas.</p>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="rounded-lg bg-evolution-indigo px-3 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
                >
                    {isSaving ? 'Guardando...' : 'Guardar ajustes'}
                </button>
            </div>
            <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Visibilidad de precios</p>
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
                    {PRICE_VISIBILITY_OPTIONS.map((option) => {
                        const selected = priceVisibilityMode === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => updatePriceVisibility(option.value)}
                                className={`rounded-2xl border p-4 text-left transition-all ${
                                    selected
                                        ? 'border-evolution-indigo/70 bg-evolution-indigo/15 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                                        : 'border-white/10 bg-black/10 hover:border-white/25'
                                }`}
                            >
                                <p className="text-sm font-bold text-white">{option.label}</p>
                                <p className="mt-2 text-xs leading-5 text-zinc-400">{option.description}</p>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                    Usa "Con inicio de sesion" para que solo clientes autenticados puedan ver precios.
                </p>
            </div>
            <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Ajustes por porcentaje</p>
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Minorista</p>
                            <p className="text-xs text-zinc-500">Ajuste sobre el precio base</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                value={priceAdjustments.retail_percent}
                                onChange={(e) => updatePriceAdjustments({ retail_percent: Number(e.target.value || 0) })}
                                className={compactFieldClass}
                            />
                            <span className="text-xs font-bold text-zinc-400">%</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Mayorista</p>
                            <p className="text-xs text-zinc-500">Ajuste sobre el precio base</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                value={priceAdjustments.wholesale_percent}
                                onChange={(e) => updatePriceAdjustments({ wholesale_percent: Number(e.target.value || 0) })}
                                className={compactFieldClass}
                            />
                            <span className="text-xs font-bold text-zinc-400">%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Ofertas</p>
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Activar oferta</p>
                            <p className="text-xs text-zinc-500">Descuento global por porcentaje</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => updatePriceAdjustments({ promo_enabled: !priceAdjustments.promo_enabled })}
                            className={`h-6 w-11 rounded-full border transition ${
                                priceAdjustments.promo_enabled
                                    ? 'border-evolution-indigo/70 bg-evolution-indigo'
                                    : 'border-white/20 bg-zinc-700'
                            }`}
                            aria-label="Toggle oferta global"
                        >
                            <span
                                className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                    priceAdjustments.promo_enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Descuento</p>
                            <p className="text-xs text-zinc-500">Porcentaje de oferta</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                value={priceAdjustments.promo_percent}
                                onChange={(e) => updatePriceAdjustments({ promo_percent: Number(e.target.value || 0) })}
                                className={compactFieldClass}
                            />
                            <span className="text-xs font-bold text-zinc-400">%</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Aplica a</label>
                        <select
                            value={priceAdjustments.promo_scope}
                            onChange={(e) => updatePriceAdjustments({ promo_scope: e.target.value })}
                            className={fieldClass}
                        >
                            <option value="both" className="bg-zinc-900">Minorista y mayorista</option>
                            <option value="retail" className="bg-zinc-900">Solo minorista</option>
                            <option value="wholesale" className="bg-zinc-900">Solo mayorista</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Etiqueta</label>
                        <input
                            type="text"
                            value={priceAdjustments.promo_label}
                            onChange={(e) => updatePriceAdjustments({ promo_label: e.target.value })}
                            placeholder="Oferta"
                            className={fieldClass}
                        />
                    </div>
                </div>
            </div>

            <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Reseñas</p>
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Habilitar comentarios</p>
                            <p className="text-xs text-zinc-500">Permite comentarios en el detalle del producto.</p>
                        </div>
                        <button
                            type="button"
                            onClick={toggleReviewsEnabled}
                            className={`h-6 w-11 rounded-full border transition ${
                                settings?.commerce?.reviews_enabled !== false
                                    ? 'border-evolution-indigo/70 bg-evolution-indigo'
                                    : 'border-white/20 bg-zinc-700'
                            }`}
                            aria-label="Toggle reseñas"
                        >
                            <span
                                className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                    settings?.commerce?.reviews_enabled !== false ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Ofertas por clientes y categorias</p>
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Nombre</label>
                            <input
                                type="text"
                                value={offerForm.name}
                                onChange={(e) => setOfferForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej: Oferta Clientes VIP"
                                className={fieldClass}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Etiqueta</label>
                            <input
                                type="text"
                                list="offer-label-suggestions"
                                value={offerForm.label}
                                onChange={(e) => setOfferForm((prev) => ({ ...prev, label: e.target.value }))}
                                placeholder="Oferta"
                                className={fieldClass}
                            />
                            <datalist id="offer-label-suggestions">
                                <option value="Oferta" />
                                {categoryItems.map((categoryItem) => (
                                    <option key={categoryItem.id} value={categoryItem.name} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Descuento (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={offerForm.percent}
                                onChange={(e) => setOfferForm((prev) => ({ ...prev, percent: Number(e.target.value || 0) }))}
                                className={compactFieldClass}
                            />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400">
                            <input
                                type="checkbox"
                                checked={offerForm.enabled}
                                onChange={(e) => setOfferForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                            />
                            Activa
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Usuarios objetivo (vacio = todos)</p>
                            <div className="max-h-36 space-y-1 overflow-auto rounded-xl border border-white/10 bg-black/20 p-2">
                                {offerUsers.length === 0 ? (
                                    <p className="text-xs text-zinc-500">Sin usuarios para seleccionar.</p>
                                ) : offerUsers.map((userItem) => (
                                    <label key={userItem.id} className="flex items-center gap-2 text-xs text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={(offerForm.user_ids || []).includes(userItem.id)}
                                            onChange={() => toggleOfferUser(userItem.id)}
                                        />
                                        <span className="truncate">{userItem.email}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Categorias objetivo (vacio = todas)</p>
                            {categoryItems.length === 0 ? (
                                <p className="text-xs text-zinc-500">Sin categorias para seleccionar.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                                    {categoryItems.map((categoryItem) => {
                                        const selected = (offerForm.category_ids || []).includes(categoryItem.id);
                                        return (
                                            <button
                                                key={categoryItem.id}
                                                type="button"
                                                onClick={() => toggleOfferCategory(categoryItem.id)}
                                                className={`rounded-lg border px-2 py-1 text-xs font-bold transition-all ${
                                                    selected
                                                        ? 'border-evolution-indigo/70 bg-evolution-indigo/20 text-indigo-100'
                                                        : 'border-white/15 bg-black/20 text-zinc-300'
                                                }`}
                                            >
                                                {categoryItem.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {(offerForm.category_ids || []).length > 0 ? (
                                <p className="text-xs text-zinc-500">
                                    Seleccionadas: {categoryItems
                                        .filter((categoryItem) => (offerForm.category_ids || []).includes(categoryItem.id))
                                        .map((categoryItem) => categoryItem.name)
                                        .join(', ')}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={submitOffer}
                            disabled={offerFormSaving}
                            className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                                offerFormSaving
                                    ? 'cursor-not-allowed bg-zinc-700 text-zinc-300'
                                    : 'bg-evolution-indigo text-white hover:bg-evolution-indigo/90'
                            }`}
                        >
                            {editingOfferId ? 'Actualizar oferta' : 'Crear oferta'}
                        </button>
                        {editingOfferId ? (
                            <button
                                type="button"
                                onClick={resetOfferForm}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300"
                            >
                                Cancelar edicion
                            </button>
                        ) : null}
                    </div>

                    <div className="border-t border-white/10 pt-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Ofertas creadas</p>
                        {offersLoading ? (
                            <p className="text-xs text-zinc-500">Cargando ofertas...</p>
                        ) : offersError ? (
                            <p className="text-xs text-rose-400">{offersError}</p>
                        ) : offers.length === 0 ? (
                            <p className="text-xs text-zinc-500">Todavia no hay ofertas avanzadas.</p>
                        ) : (
                            <div className="space-y-2">
                                {offers.map((offerItem) => {
                                    const categoryNames = categoryItems
                                        .filter((categoryItem) => (offerItem.category_ids || []).includes(categoryItem.id))
                                        .map((categoryItem) => categoryItem.name);
                                    return (
                                        <div key={offerItem.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{offerItem.name}</p>
                                                    <p className="text-xs text-zinc-400">
                                                        {offerItem.percent}% · {offerItem.enabled ? 'Activa' : 'Inactiva'} · etiqueta: {offerItem.label || 'Oferta'}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        Usuarios: {(offerItem.user_ids || []).length || 'Todos'} · Categorías: {(offerItem.category_ids || []).length || 'Todas'}
                                                    </p>
                                                    {categoryNames.length > 0 ? (
                                                        <p className="truncate text-xs text-zinc-500">
                                                            Categorias objetivo: {categoryNames.join(', ')}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => editOffer(offerItem)}
                                                        className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-200"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOffer(offerItem.id)}
                                                        disabled={offerDeleteId === offerItem.id}
                                                        className={`rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-widest ${
                                                            offerDeleteId === offerItem.id
                                                                ? 'cursor-not-allowed text-zinc-500'
                                                                : 'text-rose-300 hover:text-rose-200'
                                                        }`}
                                                    >
                                                        {offerDeleteId === offerItem.id ? '...' : 'Eliminar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingEditor;



