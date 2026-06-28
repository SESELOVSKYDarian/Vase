import React, { useMemo, useRef } from 'react';
import BrandMarqueeGlass from "./BrandMarqueeGlass";
import BrandMarqueeMonochrome from "./BrandMarqueeMonochrome";
import BrandMarqueeGrid from "./BrandMarqueeGrid";
import { navigate } from '../../utils/navigation';
import {
    getDefaultBrandMarqueeProps,
    normalizeBrandMarqueeItems,
    normalizeBrandMarqueeSpeed,
} from '../../data/brandMarqueeDefaults';

const SPEED_SECONDS = {
    static: 0,
    slow: 36,
    medium: 30,
    fast: 22,
};

const safeExternalLink = (value) => {
    const link = String(value || '').trim();
    if (!link) return '';
    if (/^https?:\/\//i.test(link)) return link;
    return `https://${link.replace(/^\/+/, '')}`;
};

function ClassicBrandMarquee({
    eyebrow,
    title,
    subtitle,
    primaryButton,
    items,
    speed,
    styles = {},
    editor = null,
}) {
    const defaults = useMemo(() => getDefaultBrandMarqueeProps(), []);
    const marqueeItems = useMemo(() => normalizeBrandMarqueeItems(items), [items]);
    const animationSpeed = normalizeBrandMarqueeSpeed(speed || defaults.speed);

    // Adjusted speeds for double track (double width means we need more time to keep same visual speed)
    const SPEED_SECONDS = { static: 0, slow: 60, medium: 40, fast: 25 };
    const animationSeconds = SPEED_SECONDS[animationSpeed] || SPEED_SECONDS.medium;
    const shouldAnimate = animationSpeed !== 'static';

    // Ensure we have enough items to overflow the screen so the marquee works seamlessly
    const baseItems = marqueeItems.length > 0 ? marqueeItems : [];
    const minItemsNeeded = 12;
    const railItems = baseItems.length > 0 && baseItems.length < minItemsNeeded
        ? Array(Math.ceil(minItemsNeeded / baseItems.length)).fill(baseItems).flat()
        : baseItems;

    const backgroundColor = styles.backgroundColor || defaults.styles.backgroundColor;
    const borderColor = styles.cardBorderColor || defaults.styles.cardBorderColor;
    const eyebrowColor = styles.subtitleColor || defaults.styles.subtitleColor;
    const titleColor = styles.titleColor || defaults.styles.titleColor;
    const railTextColor = styles.badgeTextColor || 'rgba(156, 163, 175, 0.7)';
    const accentColor = styles.accentColor || 'var(--color-primary, #f97316)';

    // Drag and Drop Editor Logic
    const editorEnabled = Boolean(editor?.enabled);
    const eyebrowOffsetX = Number.isFinite(Number(styles.eyebrowOffsetX)) ? Number(styles.eyebrowOffsetX) : 0;
    const eyebrowOffsetY = Number.isFinite(Number(styles.eyebrowOffsetY)) ? Number(styles.eyebrowOffsetY) : 0;
    const titleOffsetX = Number.isFinite(Number(styles.titleOffsetX)) ? Number(styles.titleOffsetX) : 0;
    const titleOffsetY = Number.isFinite(Number(styles.titleOffsetY)) ? Number(styles.titleOffsetY) : 0;
    const subtitleOffsetX = Number.isFinite(Number(styles.subtitleOffsetX)) ? Number(styles.subtitleOffsetX) : 0;
    const subtitleOffsetY = Number.isFinite(Number(styles.subtitleOffsetY)) ? Number(styles.subtitleOffsetY) : 0;
    const buttonsOffsetX = Number.isFinite(Number(styles.buttonsOffsetX)) ? Number(styles.buttonsOffsetX) : 0;
    const buttonsOffsetY = Number.isFinite(Number(styles.buttonsOffsetY)) ? Number(styles.buttonsOffsetY) : 0;

    const textLimitX = Number.isFinite(Number(editor?.textOffsetLimit?.x)) ? Number(editor.textOffsetLimit.x) : 600;
    const textLimitY = Number.isFinite(Number(editor?.textOffsetLimit?.y)) ? Number(editor.textOffsetLimit.y) : 300;
    const buttonLimitX = Number.isFinite(Number(editor?.buttonOffsetLimit?.x)) ? Number(editor.buttonOffsetLimit.x) : 600;
    const buttonLimitY = Number.isFinite(Number(editor?.buttonOffsetLimit?.y)) ? Number(editor.buttonOffsetLimit.y) : 300;
    const dragRef = useRef(null);

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const handleDragStart = (event, target) => {
        if (!editorEnabled) return;
        if (event.button !== undefined && event.button !== 0 && event.pointerType !== 'touch') return;
        event.preventDefault();
        event.stopPropagation();

        const isPartTarget = target.startsWith('part:');
        const partName = isPartTarget ? target.replace('part:', '') : '';
        const textPartOffsets = {
            eyebrow: { x: eyebrowOffsetX, y: eyebrowOffsetY },
            title: { x: titleOffsetX, y: titleOffsetY },
            subtitle: { x: subtitleOffsetX, y: subtitleOffsetY },
        };
        const partBase = textPartOffsets[partName] || { x: 0, y: 0 };
        const base = isPartTarget
            ? { x: partBase.x, y: partBase.y, limitX: textLimitX, limitY: textLimitY }
            : { x: buttonsOffsetX, y: buttonsOffsetY, limitX: buttonLimitX, limitY: buttonLimitY };

        dragRef.current = {
            target,
            startClientX: event.clientX,
            startClientY: event.clientY,
            baseX: base.x,
            baseY: base.y,
            limitX: base.limitX,
            limitY: base.limitY,
        };

        if (typeof event.currentTarget.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    };

    const handleDragMove = (event) => {
        if (!editorEnabled || !dragRef.current) return;
        event.preventDefault();
        const current = dragRef.current;
        const nextX = clamp(current.baseX + (event.clientX - current.startClientX), -current.limitX, current.limitX);
        const nextY = clamp(current.baseY + (event.clientY - current.startClientY), -current.limitY, current.limitY);

        if (current.target.startsWith('part:')) {
            const partName = current.target.replace('part:', '');
            // In PageBuilder, if it uses generic onTextPartOffsetChange
            editor?.onTextPartOffsetChange?.(partName, Math.round(nextX), Math.round(nextY));
            return;
        }
        editor?.onButtonsOffsetChange?.(Math.round(nextX), Math.round(nextY));
    };

    const handleDragEnd = () => {
        dragRef.current = null;
    };

    const handleNavigate = (event, link) => {
        if (editorEnabled) {
            event.preventDefault();
            return;
        }
        if (!link) return;
        event.preventDefault();
        navigate(link);
    };

    const finalEyebrow = String(eyebrow ?? defaults.eyebrow ?? '').trim();
    const finalTitle = String(title ?? defaults.title ?? '').trim();
    const finalSubtitle = String(subtitle ?? defaults.subtitle ?? '').trim();

    return (
        <section
            className="mt-16 overflow-hidden border-y py-16 md:py-24"
            style={{ backgroundColor, borderColor }}
        >
            <style>{`
                @keyframes brand-marquee-infinite {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .mask-fade-edges {
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }
                .pause-on-hover:hover .animate-track {
                    animation-play-state: paused !important;
                }
            `}</style>

            <div className="mx-auto w-full max-w-[1500px]">
                <div className="mb-12 px-4 flex flex-col items-center relative z-10 w-full">
                    {finalEyebrow ? (
                        <span
                            className={`mb-6 inline-block text-[11px] font-bold uppercase tracking-[0.3em] ${editorEnabled ? 'cursor-move rounded-md outline outline-2 outline-sky-300/80 p-1' : ''}`}
                            style={{
                                color: eyebrowColor,
                                transform: `translate(${eyebrowOffsetX}px, ${eyebrowOffsetY}px)`,
                                touchAction: editorEnabled ? 'none' : undefined,
                            }}
                            onPointerDown={editorEnabled ? (e) => handleDragStart(e, 'part:eyebrow') : undefined}
                            onPointerMove={editorEnabled ? handleDragMove : undefined}
                            onPointerUp={editorEnabled ? handleDragEnd : undefined}
                            onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                        >
                            {finalEyebrow}
                        </span>
                    ) : null}

                    {finalTitle ? (
                        <h2
                            className={`text-center text-3xl font-black tracking-tight md:text-5xl ${editorEnabled ? 'cursor-move rounded-md outline outline-2 outline-sky-300/80 p-1' : ''}`}
                            style={{
                                color: titleColor,
                                transform: `translate(${titleOffsetX}px, ${titleOffsetY}px)`,
                                touchAction: editorEnabled ? 'none' : undefined,
                            }}
                            onPointerDown={editorEnabled ? (e) => handleDragStart(e, 'part:title') : undefined}
                            onPointerMove={editorEnabled ? handleDragMove : undefined}
                            onPointerUp={editorEnabled ? handleDragEnd : undefined}
                            onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                        >
                            {finalTitle}
                        </h2>
                    ) : null}

                    {finalSubtitle ? (
                        <p
                            className={`mx-auto mt-4 max-w-2xl text-center text-base md:text-lg ${editorEnabled ? 'cursor-move rounded-md outline outline-2 outline-sky-300/80 p-1' : ''}`}
                            style={{
                                color: eyebrowColor,
                                transform: `translate(${subtitleOffsetX}px, ${subtitleOffsetY}px)`,
                                touchAction: editorEnabled ? 'none' : undefined,
                            }}
                            onPointerDown={editorEnabled ? (e) => handleDragStart(e, 'part:subtitle') : undefined}
                            onPointerMove={editorEnabled ? handleDragMove : undefined}
                            onPointerUp={editorEnabled ? handleDragEnd : undefined}
                            onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                        >
                            {finalSubtitle}
                        </p>
                    ) : null}

                    {/* Draggable Optional Buttons Box */}
                    {primaryButton?.label || editorEnabled ? (
                        <div
                            className={`mt-8 flex flex-wrap justify-center gap-4 ${editorEnabled ? 'relative rounded-lg outline outline-2 outline-emerald-300/80 p-2 bg-black/5 cursor-move' : ''}`}
                            style={{
                                transform: `translate(${buttonsOffsetX}px, ${buttonsOffsetY}px)`,
                                touchAction: editorEnabled ? 'none' : undefined,
                            }}
                            onPointerDown={editorEnabled ? (e) => handleDragStart(e, 'buttons') : undefined}
                            onPointerMove={editorEnabled ? handleDragMove : undefined}
                            onPointerUp={editorEnabled ? handleDragEnd : undefined}
                            onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                        >
                            {editorEnabled ? (
                                <span className="pointer-events-none absolute -top-3 left-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                                    Botones
                                </span>
                            ) : null}

                            {primaryButton?.label ? (
                                <a
                                    href={primaryButton.link || '#'}
                                    onClick={(event) => handleNavigate(event, primaryButton.link)}
                                    className="px-8 py-3 rounded-full font-bold transition-transform hover:scale-105"
                                    style={{ backgroundColor: accentColor, color: '#ffffff' }}
                                >
                                    {primaryButton.label}
                                </a>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="pause-on-hover group relative flex overflow-hidden mask-fade-edges w-full">
                    {/* Track 1 */}
                    <div
                        className="animate-track flex w-max shrink-0 items-center justify-around gap-16 pr-16 md:gap-24 md:pr-24 py-8"
                        style={shouldAnimate ? { animation: `brand-marquee-infinite ${animationSeconds}s linear infinite` } : undefined}
                    >
                        {railItems.map((item, index) => {
                            const label = item.name || `Marca ${index + 1}`;
                            const link = safeExternalLink(item.link);
                            const content = item.image ? (
                                <img
                                    src={item.image}
                                    alt={label}
                                    className="h-10 max-w-[160px] md:h-14 md:max-w-[200px] object-contain opacity-50 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 hover:scale-105"
                                    loading="lazy"
                                />
                            ) : (
                                <span
                                    className="text-xl font-black uppercase tracking-tighter md:text-3xl opacity-60 transition-all duration-500 hover:opacity-100"
                                    style={{ color: railTextColor }}
                                >
                                    {label}
                                </span>
                            );

                            if (!link) {
                                return <div key={`t1-${item.id}-${index}`}>{content}</div>;
                            }

                            return (
                                <a
                                    key={`t1-${item.id}-${index}`}
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="outline-none"
                                >
                                    {content}
                                </a>
                            );
                        })}
                    </div>

                    {/* Track 2 (Duplicate for infinite seamless loop) */}
                    <div
                        className="animate-track flex w-max shrink-0 items-center justify-around gap-16 pr-16 md:gap-24 md:pr-24 py-8"
                        style={shouldAnimate ? { animation: `brand-marquee-infinite ${animationSeconds}s linear infinite` } : undefined}
                        aria-hidden="true"
                    >
                        {railItems.map((item, index) => {
                            const label = item.name || `Marca ${index + 1}`;
                            const link = safeExternalLink(item.link);
                            const content = item.image ? (
                                <img
                                    src={item.image}
                                    alt={label}
                                    className="h-10 max-w-[160px] md:h-14 md:max-w-[200px] object-contain opacity-50 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 hover:scale-105"
                                    loading="lazy"
                                />
                            ) : (
                                <span
                                    className="text-xl font-black uppercase tracking-tighter md:text-3xl opacity-60 transition-all duration-500 hover:opacity-100"
                                    style={{ color: railTextColor }}
                                >
                                    {label}
                                </span>
                            );

                            if (!link) {
                                return <div key={`t2-${item.id}-${index}`}>{content}</div>;
                            }

                            return (
                                <a
                                    key={`t2-${item.id}-${index}`}
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="outline-none"
                                >
                                    {content}
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function BrandMarquee(props) {
    const variant = props.variant || 'classic';
    if (variant === 'glass') return <BrandMarqueeGlass {...props} />;
    if (variant === 'monochrome') return <BrandMarqueeMonochrome {...props} />;
    if (variant === 'grid_static') return <BrandMarqueeGrid {...props} />;
    return <ClassicBrandMarquee {...props} />;
}
