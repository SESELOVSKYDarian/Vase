import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../../utils/cn';

const VIEWPORT_MARGIN = 8;

const DraggableFloatingPanel = ({
    ariaLabel,
    header,
    children,
    className,
}) => {
    const panelRef = useRef(null);
    const dragRef = useRef(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const [position, setPosition] = useState({ x: 96, y: 96 });

    const clampPosition = (x, y) => {
        const rect = panelRef.current?.getBoundingClientRect();
        const width = rect?.width || 390;
        const height = rect?.height || 420;
        const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
        const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);

        return {
            x: Math.min(Math.max(x, VIEWPORT_MARGIN), maxX),
            y: Math.min(Math.max(y, VIEWPORT_MARGIN), maxY),
        };
    };

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const syncViewport = () => {
            const desktop = media.matches;
            setIsDesktop(desktop);
            if (!desktop) return;

            const rect = panelRef.current?.getBoundingClientRect();
            setPosition((current) => clampPosition(
                current.x,
                rect ? window.innerHeight - rect.height - 96 : current.y
            ));
        };

        syncViewport();
        media.addEventListener?.('change', syncViewport);
        window.addEventListener('resize', syncViewport);

        return () => {
            media.removeEventListener?.('change', syncViewport);
            window.removeEventListener('resize', syncViewport);
        };
    }, []);

    const onPointerDown = (event) => {
        if (!isDesktop || event.button !== 0) return;
        if (event.target.closest('button, a, input, textarea, select, [data-no-drag]')) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
        };
    };

    const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        setPosition(clampPosition(
            drag.originX + event.clientX - drag.startX,
            drag.originY + event.clientY - drag.startY
        ));
    };

    const stopDragging = (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <aside
            ref={panelRef}
            aria-label={ariaLabel}
            style={isDesktop ? { left: position.x, top: position.y } : undefined}
            className={cn(
                'admin-panel-surface fixed bottom-24 left-1/2 z-[60] w-[min(94vw,390px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--admin-border)] shadow-2xl',
                'md:bottom-auto md:left-0 md:translate-x-0',
                className
            )}
        >
            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
                className="border-b border-[var(--admin-border-soft)] p-3 md:cursor-grab md:touch-none md:active:cursor-grabbing"
            >
                {header}
            </div>
            {children}
        </aside>
    );
};

export default DraggableFloatingPanel;
