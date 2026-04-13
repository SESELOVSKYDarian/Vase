import React from 'react';
import { Desktop, ArrowLeft } from '@phosphor-icons/react';
import EvolutionSidebar from './EvolutionSidebar';
import EvolutionCanvas from './EvolutionCanvas';
import EvolutionInspector from './EvolutionInspector';
import CommandPalette from './CommandPalette';
import {
    buildAdminPanelCssVars,
    getAdminPanelBranding,
    getAdminPanelTheme,
} from '../../../utils/adminPanelTheme';

const EvolutionLayout = ({
    children,
    settings,
    onDataChange,
    onSave,
    onAddItem,
    isSaving,
    catalogContext,
    usersManager,
    categories,
    brands,
    notificationsManager,
    searchItems,
}) => {
    const adminTheme = getAdminPanelTheme(settings?.theme);
    const adminBranding = getAdminPanelBranding(settings?.branding);
    const shellStyle = buildAdminPanelCssVars(adminTheme);

    return (
        <>
            {/* Mobile / Small Screen Blocker */}
            <div className={`admin-shell admin-${adminTheme.mode || 'dark'} flex lg:hidden flex-col items-center justify-center min-h-[100dvh] p-8 text-center font-sans relative overflow-hidden`} style={shellStyle}>
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, var(--admin-accent), transparent 70%)' }} />
                <div className="relative z-10 flex flex-col items-center max-w-sm">
                    <div className="flex items-center justify-center w-20 h-20 rounded-3xl mb-8 shadow-2xl" style={{ backgroundColor: 'var(--admin-accent)', color: 'var(--admin-accent-contrast)' }}>
                        <Desktop size={40} weight="duotone" />
                    </div>
                    <h1 className="text-2xl font-black mb-3 admin-text-primary tracking-tight">Experiencia de Escritorio</h1>
                    <p className="text-sm admin-text-muted mb-8 leading-relaxed">
                        El <b>Evolution Admin Panel</b> es una herramienta profesional de construcción. Para ofrecerte todas sus características avanzadas, requiere una pantalla más grande (resolución mínima de 1024px).
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] admin-accent-text mb-12">
                        Por favor, accede desde una PC o Laptop.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                        style={{ backgroundColor: 'var(--admin-hover)', color: 'var(--admin-text)' }}
                    >
                        <ArrowLeft size={16} weight="bold" />
                        Volver a la tienda
                    </button>
                </div>
            </div>

            {/* Desktop Layout */}
            <div className={`hidden lg:flex admin-shell admin-${adminTheme.mode || 'dark'} flex-row h-[100dvh] overflow-hidden font-sans`} style={shellStyle}>
                {/* Column 1: Sidebar */}
                <EvolutionSidebar branding={adminBranding} />

                {/* Column 2: Central Infinite Canvas */}
                <EvolutionCanvas
                    branding={adminBranding}
                    notificationsManager={notificationsManager}
                    searchItems={searchItems}
                >
                    {children}
                </EvolutionCanvas>

                {/* Column 3: Contextual Inspector */}
                <EvolutionInspector
                    onDataChange={onDataChange}
                    onSave={onSave}
                    isSaving={isSaving}
                    catalogContext={catalogContext}
                    usersManager={usersManager}
                    categories={categories}
                    brands={brands}
                />

                {/* Global Overlay: Command Palette */}
                <CommandPalette branding={adminBranding} onAddItem={onAddItem} />
            </div>
        </>
    );
};

export default EvolutionLayout;
