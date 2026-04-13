import React, { useRef } from 'react';
import AboutSplitImage from './AboutSplitImage';
import AboutTimeline from './AboutTimeline';
import AboutVideoFocus from './AboutVideoFocus';
import { navigate } from '../../utils/navigation';

function ClassicAboutHero({
    tagline = 'Desde 2014',
    title = 'Nuestra historia',
    description = 'Excelencia en soluciones sanitarias premium para hogares y proyectos profesionales.',
    primaryButton = { label: 'Ver colecciones', link: '/catalog' },
    secondaryButton = { label: 'Conocer al equipo', link: '#equipo' },
    backgroundImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXU4BgrC9W5u9X6qi9WU5vv7H941UAvD-VYPk3k9YMvJ6QF9d4dfPigHBmjoGRgXAabQfjZhvwj8bEniRv7PJlqKfUiVrTvgGKiB3jc3UPiRUTFfETrULuzjjwlUJF_ngD-svg2JWO6i--ELVyRiQw8BxwzxIFUoBtLZ96yurT2qPiR2EM74_bN9dMICD1YE0RFyk4MCqlrq5bvG-5OhCNCh4qV0M_0zANXTAfRmeLbBZQrrOeyPxAl9Zys3aCIsE4XLdEPuV-MZs',
    styles = {},
    editor = null,
}) {
    const accentColor = styles.accentColor || 'var(--color-primary, #f97316)';
    const textColor = styles.textColor || '#ffffff';
    const mutedColor = styles.mutedColor || 'rgba(255,255,255,0.75)';
    const overlayColor = styles.overlayColor || '#221910';
    const overlayOpacity = typeof styles.overlayOpacity === 'number' ? styles.overlayOpacity : 0.85;
    const minHeight = styles.minHeight || '70vh';
    const textOffsetX = Number.isFinite(Number(styles.textOffsetX)) ? Number(styles.textOffsetX) : 0;
    const textOffsetY = Number.isFinite(Number(styles.textOffsetY)) ? Number(styles.textOffsetY) : 0;
    const buttonsOffsetX = Number.isFinite(Number(styles.buttonsOffsetX)) ? Number(styles.buttonsOffsetX) : 0;
    const buttonsOffsetY = Number.isFinite(Number(styles.buttonsOffsetY)) ? Number(styles.buttonsOffsetY) : 0;
    const taglineOffsetX = Number.isFinite(Number(styles.taglineOffsetX)) ? Number(styles.taglineOffsetX) : 0;
    const taglineOffsetY = Number.isFinite(Number(styles.taglineOffsetY)) ? Number(styles.taglineOffsetY) : 0;
    const titleOffsetX = Number.isFinite(Number(styles.titleOffsetX)) ? Number(styles.titleOffsetX) : 0;
    const titleOffsetY = Number.isFinite(Number(styles.titleOffsetY)) ? Number(styles.titleOffsetY) : 0;
    const descriptionOffsetX = Number.isFinite(Number(styles.descriptionOffsetX)) ? Number(styles.descriptionOffsetX) : 0;
    const descriptionOffsetY = Number.isFinite(Number(styles.descriptionOffsetY)) ? Number(styles.descriptionOffsetY) : 0;
    const editorEnabled = Boolean(editor?.enabled);
    const textLimitX = Number.isFinite(Number(editor?.textOffsetLimit?.x)) ? Number(editor.textOffsetLimit.x) : 260;
    const textLimitY = Number.isFinite(Number(editor?.textOffsetLimit?.y)) ? Number(editor.textOffsetLimit.y) : 140;
    const buttonLimitX = Number.isFinite(Number(editor?.buttonOffsetLimit?.x)) ? Number(editor.buttonOffsetLimit.x) : 220;
    const buttonLimitY = Number.isFinite(Number(editor?.buttonOffsetLimit?.y)) ? Number(editor.buttonOffsetLimit.y) : 120;
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
            tagline: { x: taglineOffsetX, y: taglineOffsetY },
            title: { x: titleOffsetX, y: titleOffsetY },
            description: { x: descriptionOffsetX, y: descriptionOffsetY },
        };
        const partBase = textPartOffsets[partName] || { x: 0, y: 0 };
        const base = isPartTarget
            ? { x: partBase.x, y: partBase.y, limitX: textLimitX, limitY: textLimitY }
            : target === 'text'
                ? { x: textOffsetX, y: textOffsetY, limitX: textLimitX, limitY: textLimitY }
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
            editor?.onTextPartOffsetChange?.(partName, Math.round(nextX), Math.round(nextY));
            return;
        }
        if (current.target === 'text') {
            editor?.onTextOffsetChange?.(Math.round(nextX), Math.round(nextY));
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

    return (
        <section className="relative w-full flex items-center justify-center overflow-hidden" style={{ minHeight }}>
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${backgroundImage}')` }}
                aria-hidden="true"
            />
            <div
                className="absolute inset-0"
                style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
                aria-hidden="true"
            />
            <div
                className="relative z-10 text-center px-4 max-w-4xl mx-auto"
                style={{
                    color: textColor,
                    transform: `translate(${textOffsetX}px, ${textOffsetY}px)`,
                }}
            >
                <span
                    className={`font-bold tracking-[0.3em] uppercase text-sm mb-4 block ${editorEnabled ? 'cursor-move rounded-md outline outline-2 outline-sky-300/80' : ''}`}
                    style={{
                        color: accentColor,
                        transform: `translate(${taglineOffsetX}px, ${taglineOffsetY}px)`,
                        touchAction: editorEnabled ? 'none' : undefined,
                    }}
                    onPointerDown={editorEnabled ? (event) => handleDragStart(event, 'part:tagline') : undefined}
                    onPointerMove={editorEnabled ? handleDragMove : undefined}
                    onPointerUp={editorEnabled ? handleDragEnd : undefined}
                    onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                >
                    {tagline}
                </span>
                <h1
                    className={`text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 ${editorEnabled ? 'cursor-move rounded-md outline outline-2 outline-sky-300/80' : ''}`}
                    style={{
                        transform: `translate(${titleOffsetX}px, ${titleOffsetY}px)`,
                        touchAction: editorEnabled ? 'none' : undefined,
                    }}
                    onPointerDown={editorEnabled ? (event) => handleDragStart(event, 'part:title') : undefined}
                    onPointerMove={editorEnabled ? handleDragMove : undefined}
                    onPointerUp={editorEnabled ? handleDragEnd : undefined}
                    onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                >
                    {title}
                </h1>
                <p
                    className={`text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto ${editorEnabled ? 'cursor-move rounded-md outline outline-2 outline-sky-300/80' : ''}`}
                    style={{
                        color: mutedColor,
                        transform: `translate(${descriptionOffsetX}px, ${descriptionOffsetY}px)`,
                        touchAction: editorEnabled ? 'none' : undefined,
                    }}
                    onPointerDown={editorEnabled ? (event) => handleDragStart(event, 'part:description') : undefined}
                    onPointerMove={editorEnabled ? handleDragMove : undefined}
                    onPointerUp={editorEnabled ? handleDragEnd : undefined}
                    onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                >
                    {description}
                </p>
                <div
                    className={`mt-10 flex flex-wrap justify-center gap-4 ${editorEnabled ? 'relative rounded-lg outline outline-2 outline-emerald-300/80 p-2 bg-black/10 cursor-move' : ''}`}
                    style={{
                        transform: `translate(${buttonsOffsetX}px, ${buttonsOffsetY}px)`,
                        touchAction: editorEnabled ? 'none' : undefined,
                    }}
                    onPointerDown={editorEnabled ? (event) => handleDragStart(event, 'buttons') : undefined}
                    onPointerMove={editorEnabled ? handleDragMove : undefined}
                    onPointerUp={editorEnabled ? handleDragEnd : undefined}
                    onPointerCancel={editorEnabled ? handleDragEnd : undefined}
                >
                    {editorEnabled ? (
                        <span className="pointer-events-none absolute -top-2 left-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            Botones
                        </span>
                    ) : null}
                    {primaryButton?.label ? (
                        <a
                            href={primaryButton.link || '#'}
                            onClick={(event) => handleNavigate(event, primaryButton.link)}
                            className="px-8 py-4 rounded-lg font-bold transition-all"
                            style={{ backgroundColor: accentColor, color: '#ffffff' }}
                        >
                            {primaryButton.label}
                        </a>
                    ) : null}
                    {secondaryButton?.label ? (
                        <a
                            href={secondaryButton.link || '#'}
                            onClick={(event) => handleNavigate(event, secondaryButton.link)}
                            className="px-8 py-4 rounded-lg font-bold transition-all border"
                            style={{ borderColor: 'rgba(255,255,255,0.3)', color: textColor, backgroundColor: 'rgba(255,255,255,0.08)' }}
                        >
                            {secondaryButton.label}
                        </a>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

export default function AboutHero(props) {
    const variant = props.variant || 'classic';
    if (variant === 'split_image') return <AboutSplitImage {...props} />;
    if (variant === 'timeline') return <AboutTimeline {...props} />;
    if (variant === 'video_focus') return <AboutVideoFocus {...props} />;
    return <ClassicAboutHero {...props} />;
}
