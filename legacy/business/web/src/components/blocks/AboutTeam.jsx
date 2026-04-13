import React from 'react';

export default function AboutTeam({
    title = 'Precisión e inspiración en cada detalle.',
    quote = 'Nuestro trabajo no es solo sobre sanitarios, es sobre la seguridad y el confort de cada hogar. Cada unión cuenta.',
    author = 'Julian Sterling',
    role = 'Fundador y jefe de ingeniería',
    avatarImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAea9Hk8KW-uNz2oCLHAOeVLaF4OEuHrLoMYAQ5icf0UpW2MbWEoppeOoK7-_ef46vSPLm9bOZn19yxGPkKgbqwzNxdl8pCXwjX84M0rsOM-14FdHnwu8rzaIZR1UJSvo2LVbbFvgWP_nntPKbU-nmwnPjWuzy9XiXqlmi62Yw8p6R5XWHQoEjxiw4mfhRuljOaKyPWkvPFELxYq8TKyXzDzeOlvj5ntTgVpCWOshfxNK3WLIQvRk7FstFclk10_lOYekLKXyXKEYA',
    backgroundImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDd5sRN9c3Iyg5tub-t6DownNaquR6DBO7x9kWyTXKAhtTfCcSMSUTP3XZGAiL1-Mj-9MbM-m0jm0ijRI13F0_dNFIyToqwNriV9r4akyx6ZAWADgUH407R7Tas-tfzDuwHbfz29pugtdtM3dlMJNOiv20x3Gv8czAs6T9Sq2RN7e0tDp-X78LAcNw4Fz02UVghwohyhXjshm1zUxjj620L3W_ET5Q_zILEvX-EgPT6IDycP7lycSMQhu25nTE1qZeNJUjPddDvAg0',
    styles = {},
}) {
    const backgroundColor = styles.backgroundColor || '#ffffff';
    const overlayColor = styles.overlayColor || '#000000';
    const overlayOpacity = typeof styles.overlayOpacity === 'number' ? styles.overlayOpacity : 0.25;
    const textColor = styles.textColor || '#181411';

    return (
        <section className="py-16 md:py-20">
            <div className="max-w-7xl mx-auto px-4">
                <div className="rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor }}>
                    <div className="grid md:grid-cols-2 items-stretch">
                        <div className="p-8 md:p-12 flex flex-col justify-center" style={{ color: textColor }}>
                            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">{title}</h2>
                            <p className="text-base md:text-lg mb-6 italic" style={{ opacity: 0.9 }}>
                                "{quote}"
                            </p>
                            <div className="flex items-center gap-4">
                                <div
                                    className="size-12 md:size-14 rounded-full border-2 border-white/30 bg-cover bg-center"
                                    style={{ backgroundImage: `url('${avatarImage}')` }}
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-bold text-sm md:text-base">{author}</p>
                                    <p className="text-xs md:text-sm uppercase tracking-tighter" style={{ opacity: 0.7 }}>
                                        {role}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="relative min-h-[220px] md:min-h-[360px]">
                            <img
                                src={backgroundImage}
                                alt="Equipo profesional trabajando"
                                className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-multiply opacity-50"
                            />
                            <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
