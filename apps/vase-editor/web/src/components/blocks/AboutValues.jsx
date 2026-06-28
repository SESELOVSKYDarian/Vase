import React from 'react';

const ICONS = {
    quality: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    commitment: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
        </svg>
    ),
    innovation: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z"></path>
            <path d="M9 18h6"></path>
            <path d="M10 22h4"></path>
        </svg>
    ),
};

export default function AboutValues({
    title = 'Nuestros valores',
    items = [
        {
            icon: 'quality',
            title: 'Calidad',
            description: 'Procesos rigurosos y materiales premium para cada componente.',
        },
        {
            icon: 'commitment',
            title: 'Compromiso',
            description: 'Acompañamos cada proyecto con soporte real y cercano.',
        },
        {
            icon: 'innovation',
            title: 'Innovación',
            description: 'Buscamos nuevas soluciones para diseños modernos y eficientes.',
        },
    ],
    styles = {},
}) {
    const backgroundColor = styles.backgroundColor || '#f8f7f5';
    const cardBackground = styles.cardBackground || '#ffffff';
    const accentColor = styles.accentColor || 'var(--color-primary, #f97316)';
    const textColor = styles.textColor || '#181411';
    const mutedColor = styles.mutedColor || '#6b7280';

    return (
        <section className="py-12 lg:py-24" style={{ backgroundColor }}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-10 lg:mb-16">
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4" style={{ color: textColor }}>
                        {title}
                    </h2>
                    <div className="h-1.5 w-24 mx-auto rounded-full" style={{ backgroundColor: accentColor }}></div>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="p-6 lg:p-10 rounded-xl border border-slate-200/80 hover:border-primary/50 transition-colors group"
                            style={{ backgroundColor: cardBackground }}
                        >
                            <div className="p-4 rounded-full w-fit mb-6 transition-transform group-hover:scale-110" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: accentColor }}>
                                {ICONS[item.icon] || ICONS.quality}
                            </div>
                            <h3 className="text-2xl font-bold mb-4" style={{ color: textColor }}>
                                {item.title}
                            </h3>
                            <p className="leading-relaxed" style={{ color: mutedColor }}>
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
