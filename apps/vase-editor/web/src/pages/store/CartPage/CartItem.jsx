// Parte de CartPage.jsx: Row, InfoBadge, CartItem, UpsellCard.
import { formatCurrency } from "../../../utils/format";

export function Row({ label, value }) {
    return (
        <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    );
}

export function InfoBadge({ icon, title, desc, highlight }) {
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

export function CartItem({ item, onRemove, onDec, onInc, onChangeQty, currency, locale, showPricesEnabled, canViewPrices, authLoading }) {
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

export function UpsellCard({ item, onAdd, currency, locale, showPricesEnabled, canViewPrices, authLoading }) {
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
