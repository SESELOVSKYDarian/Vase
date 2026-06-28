import React from 'react';
import { navigate } from '../../utils/navigation';

export default function AboutCTA({
    title = 'Listo para tu próximo proyecto?',
    primaryLink = { label: 'Ver productos', link: '/catalog' },
    secondaryLink = { label: 'Contactar ventas', link: '/#contacto' },
    styles = {},
}) {
    const backgroundColor = styles.backgroundColor || 'transparent';
    const accentColor = styles.accentColor || 'var(--color-primary, #f97316)';
    const textColor = styles.textColor || '#181411';
    const mutedColor = styles.mutedColor || '#6b7280';

    const handleNavigate = (event, link) => {
        if (!link) return;
        event.preventDefault();
        navigate(link);
    };

    return (
        <section className="py-16 md:py-24 text-center px-4" style={{ backgroundColor }}>
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-black mb-8" style={{ color: textColor }}>{title}</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    {primaryLink?.label ? (
                        <a
                            href={primaryLink.link || '#'}
                            onClick={(event) => handleNavigate(event, primaryLink.link)}
                            className="font-bold border-b-2 transition-all"
                            style={{ color: accentColor, borderColor: accentColor }}
                        >
                            {primaryLink.label}
                        </a>
                    ) : null}
                    {secondaryLink?.label ? (
                        <a
                            href={secondaryLink.link || '#'}
                            onClick={(event) => handleNavigate(event, secondaryLink.link)}
                            className="font-bold transition-all"
                            style={{ color: mutedColor }}
                        >
                            {secondaryLink.label}
                        </a>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
