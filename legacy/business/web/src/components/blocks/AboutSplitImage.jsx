import React from 'react';
import { navigate } from '../../utils/navigation';

export default function AboutSplitImage({
    tagline = 'Desde 2014',
    title = 'Nuestra historia',
    description = 'Excelencia en soluciones.',
    primaryButton = { label: 'Ver colecciones', link: '/catalog' },
    secondaryButton = { label: 'Conocer al equipo', link: '#equipo' },
    backgroundImage = '',
    styles = {},
}) {
    const accentColor = styles.accentColor || '#f97316';
    const textColor = styles.textColor || '#111111';

    return (
        <section className="flex flex-col lg:flex-row min-h-[70vh] bg-white">
            <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 lg:py-0">
                <span className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: accentColor }}>
                    {tagline}
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6" style={{ color: textColor }}>
                    {title}
                </h1>
                <p className="text-lg text-zinc-600 mb-10 max-w-xl leading-relaxed">
                    {description}
                </p>
                <div className="flex flex-wrap gap-4">
                    {primaryButton?.label && (
                        <button
                            onClick={() => navigate(primaryButton.link)}
                            className="px-8 py-4 rounded-lg font-bold text-white transition-all hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: accentColor }}
                        >
                            {primaryButton.label}
                        </button>
                    )}
                    {secondaryButton?.label && (
                        <button
                            onClick={() => navigate(secondaryButton.link)}
                            className="px-8 py-4 rounded-lg font-bold transition-all border hover:bg-zinc-50 active:scale-95"
                            style={{ color: textColor, borderColor: 'rgba(0,0,0,0.1)' }}
                        >
                            {secondaryButton.label}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 relative min-h-[400px] lg:min-h-full">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${backgroundImage}')` }}
                />
            </div>
        </section>
    );
}
