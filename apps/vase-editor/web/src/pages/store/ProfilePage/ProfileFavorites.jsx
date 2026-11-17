// Mi cuenta en la tienda: pestaña Favoritos.
import { Heart } from './profile-helpers.jsx';
import { createPlaceholderImage } from '../../../utils/productImage';
import { formatCurrency } from '../../../utils/format';
import { navigate } from '../../../utils/navigation';

export default function ProfileFavorites({ addToCart, currency, favorites, locale, removeFavorite, showPrices }) {
    return (
        <>
            {favorites.length ? (
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] overflow-hidden hover:shadow-lg transition-all"
                        >
                            <button
                                type="button"
                                onClick={() => navigate(`/product/${item.id}`)}
                                className="w-full aspect-square bg-[#f5f2f0] dark:bg-[#2c2116] overflow-hidden"
                            >
                                <img
                                    src={item.image || createPlaceholderImage({ label: 'Producto', width: 300, height: 300 })}
                                    alt={item.alt || item.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                            <div className="p-4 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm font-bold text-[#181411] dark:text-white leading-snug">
                                        {item.name}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => removeFavorite(item.id)}
                                        className="text-[#8a7560] hover:text-red-500 transition-colors"
                                        aria-label="Quitar de favoritos"
                                    >
                                        <Heart className="h-4 w-4 fill-current" />
                                    </button>
                                </div>
                                {showPrices ? (
                                    <span className="text-primary font-black text-sm">
                                        {formatCurrency(item.price || 0, currency, locale)}
                                    </span>
                                ) : (
                                    <span className="text-[#8a7560] text-xs">Consultar precio</span>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/product/${item.id}`)}
                                        className="flex-1 h-9 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-xs font-bold text-[#181411] dark:text-white hover:border-primary/60"
                                    >
                                        Ver producto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addToCart(item, 1)}
                                        className="flex-1 h-9 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="lg:col-span-3 bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-8 text-center text-[#8a7560]">
                    <div className="flex items-center justify-center gap-2 text-[#181411] dark:text-white font-bold mb-3">
                        <Heart className="h-6 w-6 text-primary fill-current" />
                        Favoritos
                    </div>
                    Todavia no agregaste favoritos.
                </div>
            )}
        </>
    );
}
