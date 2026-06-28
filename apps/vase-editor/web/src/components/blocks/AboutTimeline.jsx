import React from 'react';
import { navigate } from '../../utils/navigation';

export default function AboutTimeline({
    tagline = 'Evolución',
    title = 'Nuestra historia',
    description = 'El camino que recorrimos.',
    primaryButton = { label: 'Ver colecciones', link: '/catalog' },
    backgroundImage = '',
    styles = {},
}) {
    const accentColor = styles.accentColor || '#f97316';

    return (
        <section className="py-20 bg-zinc-50 relative overflow-hidden">
            <div className="mx-auto max-w-5xl px-4 md:px-10 relative z-10">
                <div className="text-center mb-16">
                    <span className="text-sm font-bold uppercase tracking-widest mb-2 block text-zinc-500">{tagline}</span>
                    <h2 className="text-4xl md:text-6xl font-black text-zinc-900 mb-6">{title}</h2>
                    <p className="text-lg text-zinc-600 max-w-2xl mx-auto">{description}</p>
                </div>

                <div className="relative border-l-4 border-zinc-200 ml-4 md:ml-1/2 md:-translate-x-1/2 space-y-12 pb-12">
                    {[
                        { year: '2014', title: 'Fundación', text: 'Iniciamos operaciones con un pequeño depósito y tres empleados.' },
                        { year: '2018', title: 'Expansión', text: 'Abrimos nuestra primera sucursal física de gran envergadura.' },
                        { year: '2023', title: 'Digitalización', text: 'Lanzamiento de nuestra plataforma e-commerce B2B/B2C.' },
                        { year: '2026', title: 'Actualidad', text: 'Líderes en importación y distribución nacional.' },
                    ].map((item, idx) => (
                        <div key={idx} className="relative pl-8 md:pl-0 md:flex items-center justify-between group">
                            <div className="absolute w-4 h-4 rounded-full bg-zinc-300 border-4 border-white -left-[10px] md:left-1/2 md:-translate-x-1/2 md:-ml-[2px] mt-1.5 md:mt-0 transition-colors group-hover:bg-orange-500" style={{ '--tw-bg-opacity': 1, backgroundColor: 'var(--hover-bg, #d4d4d8)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = accentColor} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#d4d4d8'} />
                            <div className={`md:w-5/12 ${idx % 2 === 0 ? 'md:text-right md:pr-12' : 'md:order-2 md:pl-12'}`}>
                                <span className="text-4xl font-black text-zinc-200 block mb-2">{item.year}</span>
                                <h3 className="text-xl font-bold text-zinc-900">{item.title}</h3>
                                <p className="text-zinc-500 mt-2">{item.text}</p>
                            </div>
                            <div className={`hidden md:block md:w-5/12 ${idx % 2 === 0 ? 'md:order-2' : ''}`} />
                        </div>
                    ))}
                </div>

                {primaryButton?.label && (
                    <div className="text-center mt-12">
                        <button
                            onClick={() => navigate(primaryButton.link)}
                            className="px-8 py-4 rounded-full font-bold text-white transition-transform active:scale-95 shadow-xl shadow-orange-500/20"
                            style={{ backgroundColor: accentColor }}
                        >
                            {primaryButton.label}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
