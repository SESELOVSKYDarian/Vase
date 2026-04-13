import React, { useRef } from "react";
import { navigate } from "../../utils/navigation";

export default function HeroGamingSlider({ slides = [], styles = {}, editor = null }) {
    const slide = slides[0] || {};
    const { title = "Level Up Your Setup", subtitle = "Next-gen gear for hardcore gamers.", image = "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop", primaryButtonLabel = "Shop Now" } = slide;
    const {
        titleSize = "text-5xl md:text-7xl",
        titleColor = "text-white",
        overlayColor = "#0f0c29",
        overlayOpacity = "0.9",
    } = styles;

    const editorEnabled = Boolean(editor?.enabled);
    const dragRef = useRef(null);

    const handleDragStart = (event, target) => {
        if (!editorEnabled) return;
        event.preventDefault();
        event.stopPropagation();
        dragRef.current = { target, startX: event.clientX, startY: event.clientY, baseOffset: editor?.getOffset?.(target) || { x: 0, y: 0 } };
        if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleDragMove = (event) => {
        if (!editorEnabled || !dragRef.current) return;
        event.preventDefault();
        const current = dragRef.current;
        const nextX = current.baseOffset.x + (event.clientX - current.startX);
        const nextY = current.baseOffset.y + (event.clientY - current.startY);
        if (editor?.onDragUpdate) editor.onDragUpdate(current.target, Math.round(nextX), Math.round(nextY));
    };
    const handleDragEnd = () => { dragRef.current = null; };

    const tx = editor?.offsets?.text?.x || 0;
    const ty = editor?.offsets?.text?.y || 0;

    return (
        <section className="px-2 py-4 md:px-10 md:py-8 bg-zinc-950">
            <div className="mx-auto max-w-[1408px]">
                <div
                    className="relative flex min-h-[400px] md:min-h-[600px] flex-col justify-center overflow-hidden rounded-xl border border-fuchsia-500/30 bg-cover bg-center p-8 shadow-[0_0_50px_-12px_rgba(217,70,239,0.3)]"
                    style={{ backgroundImage: `linear-gradient(to right, rgba(15,12,41,${overlayOpacity}), rgba(48,43,99,${Number(overlayOpacity) / 2})), url("${image}")` }}
                >
                    <div
                        className={`flex flex-col gap-6 w-full max-w-3xl ${editorEnabled ? 'cursor-move outline outline-fuchsia-500/50 p-4 rounded-xl backdrop-blur-sm' : ''}`}
                        style={{ transform: `translate(${tx}px, ${ty}px)` }}
                        onPointerDown={editorEnabled ? (e) => handleDragStart(e, 'text') : undefined}
                        onPointerMove={editorEnabled ? handleDragMove : undefined}
                        onPointerUp={editorEnabled ? handleDragEnd : undefined}
                        onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                    >
                        <h1 className={`${titleSize} font-black uppercase tracking-tighter ${titleColor} drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]`}>
                            {title}
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-300 font-medium max-w-xl border-l-4 border-cyan-400 pl-4">{subtitle}</p>
                        <div className="pt-4 flex">
                            <button
                                onClick={() => { if (!editorEnabled) navigate(slide.primaryButtonLink || '/catalog'); }}
                                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-transparent overflow-hidden rounded-lg transition-transform active:scale-95"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-cyan-500" />
                                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                                <span className="relative z-10 flex items-center gap-2">
                                    {primaryButtonLabel}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
