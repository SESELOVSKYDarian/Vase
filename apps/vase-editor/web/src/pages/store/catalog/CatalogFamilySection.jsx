// Sección de familias de productos.
import { ArrowRight } from "lucide-react";
import { PIQUIM_CATALOG_CARDS } from "../../../data/piquimBranding";

export function CatalogFamilySection({ cards, onSelectCard }) {
    const items = Array.isArray(cards) && cards.length ? cards : PIQUIM_CATALOG_CARDS;

    return (
        <section className="mb-6 overflow-hidden rounded-[36px_36px_18px_18px] bg-[#ff4d00] p-4 shadow-[0_24px_70px_rgba(255,77,0,0.22)] md:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffe0d0]">Catalogo Piquim</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#fffaf6] md:text-5xl">
                        Materia prima por rubro
                    </h2>
                </div>
                <p className="max-w-md text-sm font-semibold leading-6 text-[#ffe0d0]">
                    Elegi una familia para filtrar el catalogo real y encontrar productos para produccion profesional.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {items.slice(0, 3).map((card, index) => {
                    const tags = Array.isArray(card.tags)
                        ? card.tags
                        : String(card.tags || "")
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean);
                    return (
                        <article
                            key={card.id || `${card.title}-${index}`}
                            className="group relative min-h-[430px] overflow-hidden rounded-[28px] bg-[#1a1614] shadow-[0_18px_46px_rgba(26,22,20,0.28)] md:min-h-[540px]"
                        >
                            <img
                                src={card.image || PIQUIM_CATALOG_CARDS[index]?.image}
                                alt={card.title || "Catalogo Piquim"}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                style={{ objectPosition: card.objectPosition || PIQUIM_CATALOG_CARDS[index]?.objectPosition || "center" }}
                                loading={index === 0 ? "eager" : "lazy"}
                            />
                            <div
                                className="absolute inset-0"
                                style={{ background: card.overlay || PIQUIM_CATALOG_CARDS[index]?.overlay }}
                            />
                            <div className="relative z-10 flex h-full min-h-[430px] flex-col justify-between p-6 text-white md:min-h-[540px] md:p-8">
                                <div className="space-y-4">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                                        {card.prefix}
                                    </p>
                                    <h3 className="text-4xl font-black tracking-[-0.05em] md:text-5xl">
                                        {card.title}
                                    </h3>
                                    <p className="max-w-sm text-sm font-semibold leading-6 text-white/82">
                                        {card.description}
                                    </p>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <span key={`${card.id}-${tag}`} className="rounded-full bg-white/18 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] backdrop-blur">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onSelectCard(card)}
                                        className="inline-flex w-fit items-center rounded-full bg-[#fffaf6] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#ff4d00] transition-transform hover:-translate-y-0.5"
                                    >
                                        <span className="inline-flex items-center">
                                            Ver catalogo <ArrowRight className="ml-2 size-4" />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
