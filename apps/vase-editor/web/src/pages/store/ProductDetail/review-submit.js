// Parte de ProductDetail: handleReviewSubmit.
import { getApiBase } from '../../../utils/api';
import { getAuthHeaders } from '../../../utils/api';
import { getTenantHeaders } from '../../../utils/api';

/** Arma handleReviewSubmit con lo que necesita del componente. */
export function makeHandleReviewSubmit({ productId, reviewForm, reviewSubmitting, setReviewForm, setReviewSubmitting, setReviews, setReviewsEnabled, setReviewsError, showToast }) {
    return async (event) => {
        event.preventDefault();
        if (!productId || reviewSubmitting) return;
    
        const comment = String(reviewForm.comment || "").trim();
        if (!comment) {
            setReviewsError("Escribí un comentario antes de enviar.");
            return;
        }
    
        setReviewSubmitting(true);
        setReviewsError("");
        try {
            const response = await fetch(`${getApiBase()}/public/products/${productId}/reviews`, {
                method: "POST",
                headers: {
                    ...getTenantHeaders(),
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment,
                    rating: Number(reviewForm.rating || 5),
                }),
            });
    
            const contentType = response.headers.get("content-type") || "";
            const payload = contentType.includes("application/json")
                ? await response.json()
                : { error: await response.text() };
    
            if (!response.ok) {
                if (response.status === 401 || payload?.error === "unauthorized") {
                    setReviewsError("Iniciá sesión para comentar.");
                } else if (payload?.error === "reviews_disabled") {
                    setReviewsEnabled(false);
                    setReviewsError("Las reseñas están deshabilitadas para esta tienda.");
                } else {
                    setReviewsError("No se pudo enviar la reseña.");
                }
                return;
            }
    
            if (payload?.review) {
                setReviews((prev) => [payload.review, ...prev]);
            }
            setReviewForm({ rating: 5, comment: "" });
            showToast("Reseña enviada");
        } catch (err) {
            console.error("No se pudo enviar la reseña", err);
            setReviewsError("No se pudo enviar la reseña.");
        } finally {
            setReviewSubmitting(false);
        }
    };
}
