import React from 'react';
import { navigate } from '../../utils/navigation';

export default function AboutVideoFocus({
    tagline = 'Conócenos',
    title = 'Detrás de escena',
    description = 'Mirá cómo preparamos cada detalle de tu experiencia.',
    backgroundImage = '',
    styles = {},
}) {
    const accentColor = styles.accentColor || '#f97316';

    return (
        <section className="py-24 bg-zinc-950 px-4 md:px-10">
            <div className="mx-auto max-w-[1408px] text-center mb-12">
                <span className="text-sm font-bold uppercase tracking-[0.3em] mb-4 block" style={{ color: accentColor }}>{tagline}</span>
                <h2 className="text-4xl md:text-6xl font-black text-white mb-6">{title}</h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">{description}</p>
            </div>

            <div className="mx-auto max-w-5xl relative aspect-video rounded-3xl overflow-hidden shadow-2xl group cursor-pointer border border-white/5">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${backgroundImage}')` }} />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-zinc-900 border-b-[10px] border-b-transparent ml-2" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
