// Ficha de producto: pestañas Descripción, Especificaciones y Reseñas.
import SpecSheetDownload from '../../../components/store/SpecSheetDownload';
import { navigate } from '../../../utils/navigation';

export default function ProductTabs({ activeTab, canShowSpecifications, formatReviewDate, handleReviewSubmit, renderRatingStars, reviewForm, reviewSubmitting, reviews, reviewsEnabled, reviewsError, reviewsLoading, setActiveTab, setReviewForm, specificationEntries, user, view }) {
    return (
        <div className="rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c]">
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[#e5e1de] dark:border-[#3d2f21] px-6 pt-5">
                {[
                    { id: "description", label: "Descripción" },
                    ...(canShowSpecifications ? [{ id: "specifications", label: "Especificaciones" }] : []),
                    { id: "reviews", label: "Reseñas" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-0.5 text-sm font-bold uppercase tracking-widest ${activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-[#8a7560] hover:text-primary"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {activeTab === "description" ? (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-[#181411] dark:text-white mb-2">
                                {view.name}
                            </h3>
                            <p className="text-sm text-[#8a7560] leading-relaxed whitespace-pre-line">
                                {view.longDescription || view.shortDescription || "Sin descripción disponible."}
                            </p>
                        </div>
                        <SpecSheetDownload sheet={view.specSheet} compact />
                    </div>
                ) : null}

                {activeTab === "specifications" && canShowSpecifications ? (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-black text-[#181411] dark:text-white mb-2">
                                Especificaciones técnicas
                            </h3>
                            {view.showSpecifications && specificationEntries.length ? (
                                <p className="text-sm text-[#8a7560]">
                                    Detalle rápido del producto en formato de celdas.
                                </p>
                            ) : null}
                        </div>

                        <SpecSheetDownload sheet={view.specSheet} />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {(view.showSpecifications ? specificationEntries : []).map((item) => (
                                <div
                                    key={`spec-${item.label}`}
                                    className="rounded-2xl border border-[#e5e1de] bg-[#faf8f6] px-4 py-3 dark:border-[#3d2f21] dark:bg-[#120d08]"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a7560]">
                                        {item.label}
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-[#181411] dark:text-white">
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {activeTab === "reviews" ? (
                    <div className="space-y-5">
                        {!reviewsEnabled ? (
                            <div className="text-sm text-[#8a7560]">
                                Las reseñas están deshabilitadas para esta tienda.
                            </div>
                        ) : null}

                        {reviewsEnabled ? (
                            <div className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 bg-[#faf8f6] dark:bg-[#120d08]">
                                {!user ? (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-sm text-[#8a7560]">
                                            Iniciá sesión para dejar tu comentario.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => navigate("/login")}
                                            className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                        >
                                            Iniciar sesión
                                        </button>
                                    </div>
                                ) : (
                                    <form className="space-y-3" onSubmit={handleReviewSubmit}>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#8a7560]">
                                                Puntuación
                                            </label>
                                            <select
                                                value={reviewForm.rating}
                                                onChange={(event) =>
                                                    setReviewForm((prev) => ({
                                                        ...prev,
                                                        rating: Number(event.target.value || 5),
                                                    }))
                                                }
                                                className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                            >
                                                <option value={5}>5</option>
                                                <option value={4}>4</option>
                                                <option value={3}>3</option>
                                                <option value={2}>2</option>
                                                <option value={1}>1</option>
                                            </select>
                                        </div>
                                        <textarea
                                            value={reviewForm.comment}
                                            onChange={(event) =>
                                                setReviewForm((prev) => ({
                                                    ...prev,
                                                    comment: event.target.value,
                                                }))
                                            }
                                            rows={3}
                                            maxLength={1000}
                                            placeholder="Escribí tu experiencia con este producto..."
                                            className="w-full rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] px-3 py-2 text-sm text-[#181411] dark:text-white placeholder:text-[#8a7560] focus:outline-none focus:border-primary"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={reviewSubmitting}
                                                className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-60"
                                            >
                                                {reviewSubmitting ? "Enviando..." : "Publicar reseña"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : null}

                        {reviewsError ? (
                            <p className="text-sm text-red-600">{reviewsError}</p>
                        ) : null}

                        {reviewsLoading ? (
                            <div className="text-sm text-[#8a7560]">Cargando reseñas...</div>
                        ) : !reviewsEnabled ? null : reviews.length === 0 ? (
                            <div className="text-sm text-[#8a7560]">
                                Todavía no hay reseñas para este producto.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reviews.map((review) => (
                                    <article
                                        key={review.id}
                                        className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 bg-white dark:bg-[#1a130c]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-[#181411] dark:text-white">
                                                {review.author_name || "Cliente"}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-widest text-[#8a7560]">
                                                {formatReviewDate(review.created_at)}
                                            </p>
                                        </div>
                                        <p className="text-xs font-bold text-primary mt-1">
                                            {renderRatingStars(review.rating)}
                                        </p>
                                        <p className="text-sm text-[#8a7560] leading-relaxed mt-2">
                                            {review.comment}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
