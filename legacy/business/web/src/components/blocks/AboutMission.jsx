import React from 'react';

const ICONS = {
    verified: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
        </svg>
    ),
    eco: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8a8 8 0 0 1-10 10Z"></path>
            <path d="M7 21a4 4 0 0 1-4-4"></path>
        </svg>
    ),
};

export default function AboutMission({
    eyebrow = 'Nuestro propósito',
    title = 'La misión',
    paragraphs = [
        'Creemos que la base de cada proyecto está en los detalles que no se ven. Combinamos ingeniería avanzada y materiales premium para soluciones que duran.',
        'Desde reformas residenciales hasta desarrollos comerciales, ofrecemos sanitarios que equilibran diseño y resistencia.',
    ],
    highlights = [
        { icon: 'verified', title: 'Calidad certificada', text: 'Procesos con estándares ISO 9001.' },
        { icon: 'eco', title: 'Eco innovación', text: 'Tecnología para ahorro de agua.' },
    ],
    image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaDIcmwXvGopChH4z2NtypzPKEOIJB5DIz-cix6aLVUAg6015AqowjMQbKKJ273hv-K-Mdeeq78GFd-8Wt2hah0kOFgDkEGW24otJ-Yqrdn019S_zxUM4qMhyJ0sXG12Fr-Nk9EA4ZnVoQXzs0ZTjGJtuHBj_cdqJ4Z-i7TOx-wRo3JuBOyDsruX5utjj00tVbmE0sUIiRoPxHOH4_ohJ25dVPm0jFLFwKMx0fn7DC6IGRbByTaUUBATc5XDKzCDFZBcDdlv3kpB4',
    imageAlt = 'Equipo técnico revisando piezas sanitarias',
    styles = {},
}) {
    const accentColor = styles.accentColor || 'var(--color-primary, #f97316)';
    const backgroundColor = styles.backgroundColor || 'transparent';
    const textColor = styles.textColor || '#181411';
    const mutedColor = styles.mutedColor || '#6b7280';

    return (
        <section className="py-12 lg:py-24" style={{ backgroundColor }}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    <div className="space-y-6 lg:space-y-8">
                        <div>
                            <h3 className="font-bold uppercase tracking-widest text-sm mb-2" style={{ color: accentColor }}>
                                {eyebrow}
                            </h3>
                            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: textColor }}>
                                {title}
                            </h2>
                        </div>
                        <div className="space-y-6">
                            {paragraphs.map((text, idx) => (
                                <p key={idx} className="text-lg leading-relaxed" style={{ color: mutedColor }}>
                                    {text}
                                </p>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                            {highlights.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <span style={{ color: accentColor }}>{ICONS[item.icon] || ICONS.verified}</span>
                                    <div>
                                        <h4 className="font-bold" style={{ color: textColor }}>{item.title}</h4>
                                        <p className="text-sm" style={{ color: mutedColor }}>{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative group">
                        <div
                            className="absolute -inset-4 rounded-xl transition-all duration-500"
                            style={{ backgroundColor: accentColor, opacity: 0.15 }}
                            aria-hidden="true"
                        />
                        <img
                            src={image}
                            alt={imageAlt}
                            className="relative rounded-lg shadow-2xl w-full h-[300px] lg:h-[500px] object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
