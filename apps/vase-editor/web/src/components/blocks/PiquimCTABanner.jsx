import React from 'react';
import { navigate } from '../../utils/navigation';
import { ArrowRight } from 'lucide-react';

export default function PiquimCTABanner({
    title = 'Listo para llevar tus recetas al proximo nivel?',
    subtitle = '',
    primaryLabel = 'Comprar ahora',
    primaryHref = '/catalog',
    secondaryLabel = 'Ver catalogo',
    secondaryHref = '/catalog',
}) {
    return (
        <section className="relative overflow-hidden bg-[#ff4d00] px-4 py-16 md:px-[80px] md:py-20">
            <p className="pointer-events-none absolute left-[-60px] top-[-90px] text-[260px] font-black italic leading-none text-white/10 md:text-[450px]">
                piquim
            </p>

            <div className="relative z-10 mx-auto max-w-[1438px] text-center">
                <h2 className="mx-auto max-w-[980px] text-[40px] font-black leading-[0.95] tracking-[1px] text-[#fffaf6] md:text-[60px]">
                    {title}
                </h2>
                {subtitle ? (
                    <p className="mx-auto mt-3 max-w-[760px] text-sm text-[#fff0e8]">{subtitle}</p>
                ) : null}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(primaryHref || '/catalog')}
                        className="inline-flex items-center rounded-full border border-white/80 bg-[#ff4d00] px-[28px] py-[16px] text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(255,77,0,0.45)]"
                    >
                        {primaryLabel} <ArrowRight className="ml-2 size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(secondaryHref || '/catalog')}
                        className="inline-flex items-center py-[16px] text-[15px] font-semibold text-[#1a1614]"
                    >
                        {secondaryLabel} <ArrowRight className="ml-2 size-4" />
                    </button>
                </div>
            </div>
        </section>
    );
}
