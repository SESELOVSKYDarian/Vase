import React from 'react';
import {
    ArrowsOut,
    Eye,
    FloppyDisk,
    Globe,
    RocketLaunch,
} from '@phosphor-icons/react';

const EvolutionActionsMenu = ({
    open,
    onClose,
    onSave,
    onPreview,
    onPublish,
    onDomains,
    onViewClient,
    isSaving,
}) => {
    if (!open) return null;

    const actions = [
        { label: isSaving ? 'Guardando...' : 'Guardar', icon: FloppyDisk, onClick: onSave, disabled: isSaving },
        { label: 'Previsualizar', icon: Eye, onClick: onPreview },
        { label: 'Publicar', icon: RocketLaunch, onClick: onPublish },
        { label: 'Dominios', icon: Globe, onClick: onDomains },
        { label: 'Ver cliente', icon: ArrowsOut, onClick: onViewClient },
    ];

    return (
        <div
            role="menu"
            aria-label="Acciones del editor"
            className="admin-panel-surface absolute right-0 top-[calc(100%+8px)] z-[90] w-52 rounded-2xl border border-[var(--admin-border)] p-1.5 shadow-2xl"
        >
            {actions.map(({ label, icon: Icon, onClick, disabled }) => (
                <button
                    key={label}
                    role="menuitem"
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        onClick?.();
                        onClose?.();
                    }}
                    className="admin-hover-surface flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[12px] font-semibold admin-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Icon size={16} weight="bold" className="admin-text-muted" />
                    {label}
                </button>
            ))}
        </div>
    );
};

export default EvolutionActionsMenu;
