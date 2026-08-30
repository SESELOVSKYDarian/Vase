import React from 'react';
import {
    ArrowCounterClockwise,
    ArrowClockwise,
    Desktop,
    DeviceMobile,
    DeviceTablet,
    FileText,
    Plus,
    SquaresFour,
} from '@phosphor-icons/react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { cn } from '../../../utils/cn';

const panelActions = [
    { id: 'pages', label: 'Páginas', icon: FileText },
    { id: 'blocks', label: 'Bloques', icon: SquaresFour },
    { id: 'add', label: 'Agregar', icon: Plus, primary: true },
];

const viewports = [
    { id: 'desktop', label: 'Escritorio', icon: Desktop },
    { id: 'tablet', label: 'Tablet', icon: DeviceTablet },
    { id: 'mobile', label: 'Móvil', icon: DeviceMobile },
];

const EvolutionCommandDock = ({ onUndo, onRedo, canUndo, canRedo }) => {
    const {
        activeDockPanel,
        setActiveDockPanel,
        previewViewport,
        setPreviewViewport,
    } = useEvolutionStore();

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[65] flex justify-center px-3">
            <div className="admin-panel-surface pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--admin-border)] p-1.5 shadow-2xl">
                {panelActions.map(({ id, label, icon: Icon, primary }) => {
                    const active = activeDockPanel === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setActiveDockPanel(id)}
                            className={cn(
                                'flex min-h-11 min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-semibold transition-all',
                                active ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]' : 'admin-hover-surface admin-text-muted',
                                primary && !active && 'bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)]'
                            )}
                        >
                            <Icon size={17} weight="bold" />
                            {label}
                        </button>
                    );
                })}

                <span className="mx-1 h-8 w-px shrink-0 bg-[var(--admin-border-soft)]" />

                <div className="flex items-center rounded-xl bg-[var(--admin-hover)] p-1">
                    {viewports.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            title={label}
                            aria-label={label}
                            aria-pressed={previewViewport === id}
                            onClick={() => setPreviewViewport(id)}
                            className={cn(
                                'flex size-9 items-center justify-center rounded-lg admin-text-muted',
                                previewViewport === id && 'bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-sm'
                            )}
                        >
                            <Icon size={16} weight="bold" />
                        </button>
                    ))}
                </div>

                <span className="mx-1 hidden h-8 w-px shrink-0 bg-[var(--admin-border-soft)] sm:block" />

                <div className="hidden items-center sm:flex">
                    <button type="button" onClick={onUndo} disabled={!canUndo} title="Deshacer" className="admin-hover-surface flex size-9 items-center justify-center rounded-lg admin-text-muted disabled:opacity-35">
                        <ArrowCounterClockwise size={17} />
                    </button>
                    <button type="button" onClick={onRedo} disabled={!canRedo} title="Rehacer" className="admin-hover-surface flex size-9 items-center justify-center rounded-lg admin-text-muted disabled:opacity-35">
                        <ArrowClockwise size={17} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EvolutionCommandDock;
