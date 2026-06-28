import React from 'react';

export default function AboutStats({
    items = [
        { value: '10+', label: 'Años de experiencia', accent: true },
        { value: '5k+', label: 'Clientes satisfechos' },
        { value: '2', label: 'Sucursales' },
        { value: '24/7', label: 'Soporte al cliente' },
    ],
    styles = {},
}) {
    const backgroundColor = styles.backgroundColor || '#181411';
    const accentColor = styles.accentColor || 'var(--color-primary, #f97316)';
    const textColor = styles.textColor || '#ffffff';
    const mutedColor = styles.mutedColor || '#9ca3af';

    return (
        <section className="border-y border-white/5" style={{ backgroundColor, color: textColor }}>
            <div className="max-w-7xl mx-auto py-12 px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {items.map((item, idx) => (
                        <div key={idx} className="text-center md:border-r border-white/10 last:border-0">
                            <div className="text-4xl font-black mb-1" style={{ color: item.accent ? accentColor : textColor }}>
                                {item.value}
                            </div>
                            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: mutedColor }}>
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
