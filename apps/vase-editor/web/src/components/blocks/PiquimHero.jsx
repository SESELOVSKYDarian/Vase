import React, { useCallback, useEffect, useState } from 'react';
import { navigate } from '../../utils/navigation';
import { ArrowRight } from 'lucide-react';

const DEFAULT_PROPS = {
    badgeText: 'Heladeria | Panaderia/Confiteria',
    preTitle: 'Materia prima',
    titleHighlight: 'que inspira',
    postTitle: 'cada receta.',
    primaryLabel: 'Comprar ahora',
    primaryHref: '/catalog',
    secondaryLabel: 'Ver catalogo',
    secondaryHref: '/catalog',
    statProducts: '+200',
    statCategories: '2',
    statYears: '+30',
    mediaType: 'video',
    image: '',
    videoUrl: '',
    videoUrlDesktop: '',
    videoUrlMobile: '',
    videoPoster: '',
    videoAutoplay: true,
    videoLoop: true,
    videoMuted: true,
    videoControls: false,
    videoObjectPosition: 'center center',
};

export default function PiquimHero(props) {
    const data = { ...DEFAULT_PROPS, ...(props || {}) };
    const preTitle = data.preTitle || data.title || DEFAULT_PROPS.preTitle;
    const titleHighlight = data.titleHighlight || DEFAULT_PROPS.titleHighlight;
    const postTitle = data.postTitle || data.subtitle || DEFAULT_PROPS.postTitle;
    const desktopVideoUrl = data.videoUrlDesktop || data.videoUrl || '';
    const mobileVideoUrl = data.videoUrlMobile || data.videoUrl || desktopVideoUrl || '';
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
    const [videoReady, setVideoReady] = useState(false);
    const [videoFailed, setVideoFailed] = useState(false);
    const videoSource = isMobile ? mobileVideoUrl : desktopVideoUrl;
    const markVideoReady = useCallback(() => setVideoReady(true), []);

    useEffect(() => {
        setVideoReady(false);
        setVideoFailed(false);
    }, [videoSource]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const update = () => setIsMobile(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    return (
        <section className="relative isolate overflow-hidden bg-[#1a1614]">
            <div className="relative min-h-screen min-h-[100svh] w-full bg-[#1a1614]">
                {!videoReady && !videoFailed ? <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#2c2522_8%,#463b36_18%,#2c2522_33%)] bg-[length:200%_100%] transition-opacity duration-[400ms] motion-reduce:animate-none" /> : null}
                {videoSource ? (
                    <video
                        key={videoSource}
                        src={videoSource}
                        poster={data.videoPoster || undefined}
                        autoPlay={data.videoAutoplay !== false}
                        loop={data.videoLoop !== false}
                        muted={data.videoMuted !== false}
                        controls={Boolean(data.videoControls)}
                        playsInline
                        preload="auto"
                        onLoadedData={markVideoReady}
                        onCanPlay={markVideoReady}
                        onError={() => setVideoFailed(true)}
                        style={{ objectPosition: data.videoObjectPosition || 'center center' }}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[400ms] ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                    />
                ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#8a3a17,#f28a46_52%,#4a2216)]" />
                )}
                {videoFailed ? <div className="absolute inset-0 bg-cover bg-center bg-[linear-gradient(135deg,#8a3a17,#f28a46_52%,#4a2216)]" style={data.videoPoster ? { backgroundImage: `url(${data.videoPoster})` } : undefined} aria-label="No se pudo cargar el video" /> : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,22,20,0.10),rgba(26,22,20,0.20)_48%,rgba(26,22,20,0.48))]" />

            <div className="absolute inset-0 z-10 mx-auto flex max-w-[1438px] flex-col justify-center px-4 pb-8 pt-32 md:px-[60px] md:pb-10 md:pt-40 lg:pt-44">
                <div className="space-y-6 text-center md:text-right lg:ml-auto lg:max-w-[640px]">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0e8] px-[14px] py-[8px]">
                        <span className="h-2 w-2 rounded-full bg-[#ff4d00]" />
                        <p className="text-[11px] tracking-[1.98px] text-[#ff4d00]">{data.badgeText}</p>
                    </div>

                    <div className="leading-[0.89]">
                        <p className="text-[40px] font-black tracking-[-1.6px] text-[#fff0e8] md:text-[76px]">{preTitle}</p>
                        <p className="text-[40px] font-black tracking-[-1.6px] text-[#ff4d00] md:text-[76px]">{titleHighlight}</p>
                        <p className="text-[40px] font-black tracking-[-1.6px] text-[#fff0e8] md:text-[76px]">{postTitle}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
                        <button
                            type="button"
                            onClick={() => navigate(data.primaryHref || '/catalog')}
                            className="inline-flex items-center rounded-full bg-[#ff4d00] px-[28px] py-[16px] text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(255,77,0,0.45)]"
                        >
                            {data.primaryLabel} <ArrowRight className="ml-2 size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(data.secondaryHref || '/catalog')}
                            className="inline-flex items-center py-[16px] text-[15px] font-semibold text-[#fff0e8]"
                        >
                            {data.secondaryLabel} <ArrowRight className="ml-2 size-4" />
                        </button>
                    </div>

                    <div className="mx-auto flex w-full max-w-[420px] items-start justify-between border-t border-[#e8dfd8]/50 pt-6 text-center md:ml-auto md:mr-0">
                        <div className="w-[100px]">
                            <p className="text-[30px] font-black text-white">{data.statProducts}</p>
                            <p className="text-[11px] tracking-[1.1px] text-[#fff0e8]">productos</p>
                        </div>
                        <div className="w-[100px]">
                            <p className="text-[30px] font-black text-white">{data.statCategories}</p>
                            <p className="text-[11px] tracking-[1.1px] text-[#fff0e8]">categorias</p>
                        </div>
                        <div className="w-[100px]">
                            <p className="text-[30px] font-black text-white">{data.statYears}</p>
                            <p className="text-[11px] tracking-[1.1px] text-[#fff0e8]">anos de oficio</p>
                        </div>
                    </div>
                </div>
            </div></div>
        </section>
    );
}
