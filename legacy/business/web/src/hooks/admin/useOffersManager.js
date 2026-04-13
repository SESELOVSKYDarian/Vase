import { useCallback, useState } from 'react';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const EMPTY_OFFER_FORM = {
    name: '',
    label: 'Oferta',
    percent: 0,
    enabled: true,
    user_ids: [],
    category_ids: [],
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('teflon_token');
    return {
        ...getTenantHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const normalizeOffer = (raw = {}) => ({
    id: raw.id || '',
    name: raw.name || '',
    label: raw.label || 'Oferta',
    percent: Number(raw.percent || 0),
    enabled: raw.enabled !== false,
    user_ids: Array.isArray(raw.user_ids) ? raw.user_ids.filter(Boolean) : [],
    category_ids: Array.isArray(raw.category_ids) ? raw.category_ids.filter(Boolean) : [],
});

export const useOffersManager = () => {
    const { addToast } = useToast();
    const [offers, setOffers] = useState([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [offersError, setOffersError] = useState('');
    const [offerForm, setOfferForm] = useState(EMPTY_OFFER_FORM);
    const [offerFormSaving, setOfferFormSaving] = useState(false);
    const [editingOfferId, setEditingOfferId] = useState(null);
    const [offerDeleteId, setOfferDeleteId] = useState(null);
    const [offerAssignmentSavingId, setOfferAssignmentSavingId] = useState(null);

    const resetOfferForm = useCallback(() => {
        setEditingOfferId(null);
        setOfferForm(EMPTY_OFFER_FORM);
    }, []);

    const loadOffers = useCallback(async () => {
        setOffersLoading(true);
        setOffersError('');
        try {
            const res = await fetch(`${getApiBase()}/tenant/offers`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                if (res.status === 404) {
                    setOffers([]);
                    setOffersError('Modulo de ofertas no disponible en backend.');
                    return;
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudieron cargar las ofertas');
            }
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
            setOffers(items.map(normalizeOffer));
        } catch (err) {
            console.error('Failed to load offers', err);
            setOffers([]);
            setOffersError('No se pudieron cargar las ofertas.');
        } finally {
            setOffersLoading(false);
        }
    }, []);

    const toggleOfferUser = useCallback((userId) => {
        setOfferForm((prev) => {
            const current = Array.isArray(prev.user_ids) ? prev.user_ids : [];
            const next = current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId];
            return { ...prev, user_ids: next };
        });
    }, []);

    const toggleOfferCategory = useCallback((categoryId) => {
        setOfferForm((prev) => {
            const current = Array.isArray(prev.category_ids) ? prev.category_ids : [];
            const next = current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId];
            return { ...prev, category_ids: next };
        });
    }, []);

    const editOffer = useCallback((offerItem) => {
        const next = normalizeOffer(offerItem);
        setEditingOfferId(next.id || null);
        setOfferForm({
            name: next.name,
            label: next.label,
            percent: next.percent,
            enabled: next.enabled,
            user_ids: next.user_ids,
            category_ids: next.category_ids,
        });
    }, []);

    const submitOffer = useCallback(async () => {
        const name = String(offerForm?.name || '').trim();
        const percent = Number(offerForm?.percent || 0);
        if (!name) {
            addToast('Ingresa un nombre para la oferta.', 'error');
            return false;
        }
        if (!Number.isFinite(percent) || percent <= 0) {
            addToast('Ingresa un porcentaje mayor a 0.', 'error');
            return false;
        }

        setOfferFormSaving(true);
        try {
            const payload = {
                name,
                label: String(offerForm?.label || 'Oferta').trim() || 'Oferta',
                percent,
                enabled: !!offerForm?.enabled,
                user_ids: Array.isArray(offerForm?.user_ids) ? offerForm.user_ids : [],
                category_ids: Array.isArray(offerForm?.category_ids) ? offerForm.category_ids : [],
            };
            const isEdit = !!editingOfferId;
            const url = isEdit
                ? `${getApiBase()}/tenant/offers/${editingOfferId}`
                : `${getApiBase()}/tenant/offers`;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('El backend no tiene habilitado /tenant/offers.');
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudo guardar la oferta');
            }
            await loadOffers();
            resetOfferForm();
            addToast(isEdit ? 'Oferta actualizada' : 'Oferta creada', 'success');
            return true;
        } catch (err) {
            console.error('Failed to save offer', err);
            addToast(err.message || 'No se pudo guardar la oferta', 'error');
            return false;
        } finally {
            setOfferFormSaving(false);
        }
    }, [addToast, editingOfferId, loadOffers, offerForm, resetOfferForm]);

    const removeOffer = useCallback(async (offerId) => {
        if (!offerId) return;
        if (!window.confirm('Eliminar esta oferta?')) return;
        setOfferDeleteId(offerId);
        try {
            const res = await fetch(`${getApiBase()}/tenant/offers/${offerId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('El backend no tiene habilitado /tenant/offers.');
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudo eliminar la oferta');
            }
            await loadOffers();
            if (editingOfferId === offerId) {
                resetOfferForm();
            }
            addToast('Oferta eliminada', 'success');
        } catch (err) {
            console.error('Failed to delete offer', err);
            addToast(err.message || 'No se pudo eliminar la oferta', 'error');
        } finally {
            setOfferDeleteId(null);
        }
    }, [addToast, editingOfferId, loadOffers, resetOfferForm]);

    const toggleOfferUserAssignment = useCallback(async (offerItem, user) => {
        const normalizedOffer = normalizeOffer(offerItem);
        const userId = typeof user === 'string' ? user : user?.id;
        if (!normalizedOffer.id || !userId) return false;

        const currentUserIds = Array.isArray(normalizedOffer.user_ids) ? normalizedOffer.user_ids : [];
        const alreadyAssigned = currentUserIds.includes(userId);
        const nextUserIds = alreadyAssigned
            ? currentUserIds.filter((id) => id !== userId)
            : [...currentUserIds, userId];

        if (!alreadyAssigned && currentUserIds.length === 0) {
            const confirmed = window.confirm(
                'Esta oferta hoy es global. Si la vinculas a un usuario dejara de aplicar a todos y pasara a ser personalizada. Continuar?'
            );
            if (!confirmed) return false;
        }

        if (alreadyAssigned && currentUserIds.length === 1) {
            const confirmed = window.confirm(
                'Al quitar el ultimo usuario, la oferta volvera a quedar global para todos. Continuar?'
            );
            if (!confirmed) return false;
        }

        setOfferAssignmentSavingId(normalizedOffer.id);
        try {
            const payload = {
                name: normalizedOffer.name,
                label: normalizedOffer.label || 'Oferta',
                percent: Number(normalizedOffer.percent || 0),
                enabled: normalizedOffer.enabled !== false,
                user_ids: nextUserIds,
                category_ids: Array.isArray(normalizedOffer.category_ids) ? normalizedOffer.category_ids : [],
            };
            const res = await fetch(`${getApiBase()}/tenant/offers/${normalizedOffer.id}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('El backend no tiene habilitado /tenant/offers.');
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudo actualizar la vinculacion de la oferta');
            }

            const saved = normalizeOffer(await res.json());
            setOffers((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));

            if (editingOfferId === saved.id) {
                setOfferForm({
                    name: saved.name,
                    label: saved.label,
                    percent: saved.percent,
                    enabled: saved.enabled,
                    user_ids: saved.user_ids,
                    category_ids: saved.category_ids,
                });
            }

            const userLabel = typeof user === 'string' ? 'usuario' : (user?.email || 'usuario');
            addToast(
                alreadyAssigned
                    ? `Oferta desvinculada de ${userLabel}`
                    : `Oferta vinculada a ${userLabel}`,
                'success'
            );
            return true;
        } catch (err) {
            console.error('Failed to toggle offer user assignment', err);
            addToast(err.message || 'No se pudo actualizar la oferta personalizada', 'error');
            return false;
        } finally {
            setOfferAssignmentSavingId(null);
        }
    }, [addToast, editingOfferId, setOfferForm]);

    return {
        offers,
        offersLoading,
        offersError,
        offerForm,
        offerFormSaving,
        editingOfferId,
        offerDeleteId,
        offerAssignmentSavingId,
        setOfferForm,
        resetOfferForm,
        loadOffers,
        toggleOfferUser,
        toggleOfferCategory,
        editOffer,
        submitOffer,
        removeOffer,
        toggleOfferUserAssignment,
    };
};
