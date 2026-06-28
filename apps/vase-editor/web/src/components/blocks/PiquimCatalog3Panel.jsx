import React from 'react';
import { navigate } from '../../utils/navigation';
import { PIQUIM_CATALOG_CARDS } from '../../data/piquimBranding';

export default function PiquimCatalog3Panel({
    title = 'Elegi tu mundo.',
    titleHighlight = 'Inspirate.',
    eyebrow = 'NUESTRO CATALOGO',
    subtitle = '',
    cards = PIQUIM_CATALOG_CARDS,
}) {
    const list = Array.isArray(cards) && cards.length ? cards : PIQUIM_CATALOG_CARDS;

    return (
        <section className="bg-[#1a1614]">
            <div className="mx-auto flex max-w-[1438px] items-center justify-between px-4 py-10 md:px-[80px] md:py-[50px]">
                <div>
                    <h2 className="text-[40px] font-black leading-none tracking-[-1.2px] text-[#fffaf6] md:text-[56px]">
                        {title}
                        <br />
                        <span className="italic text-[#ff4d00]">{titleHighlight}</span>
                    </h2>
                    {subtitle ? (
                        <p className="mt-3 max-w-[580px] text-sm text-[#d7c8bf]">{subtitle}</p>
                    ) : null}
                </div>
                <p className="hidden text-[16px] tracking-[3.2px] text-[#ff4d00] md:block">{eyebrow}</p>
            </div>

            <div className="grid grid-cols-1 gap-[2px] md:grid-cols-2">
                {list.slice(0, 2).map((card, idx) => (
                    <article key={card.id || idx} className="relative h-[620px] overflow-hidden md:h-[700px]">
                        <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0" style={{ background: card.overlay || 'linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(26,22,20,0.8) 100%)' }} />

                        <div className="absolute bottom-8 left-8 right-8 space-y-4 md:bottom-10 md:left-10 md:right-10">
                            <div className="flex items-center gap-3">
                                <span className="h-px w-6 bg-white" />
                                <p className="text-[11px] tracking-[1.98px] text-white">{card.prefix}</p>
                            </div>
                            <h3 className="text-[46px] font-black italic leading-none tracking-[-1.2px] text-[#ff4d00] md:text-[56px]">{card.title}</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {(card.tags || []).map((tag) => (
                                    <span key={`${card.id}-${tag}`} className="rounded-full border border-white bg-white/15 px-2.5 py-1 text-[10px] text-[#fffaf6]">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <p className="max-w-[320px] text-[13px] leading-[1.5] text-[#fffaf6]">{card.description}</p>
                            <button
                                type="button"
                                onClick={() => navigate(`/catalog?category=${encodeURIComponent(card.category || card.title || '')}`)}
                                className="border-b-2 border-[#ff4d00] pb-1 text-[11px] font-bold tracking-[0.88px] text-[#fffaf6]"
                            >
                                VER CATALOGO
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
