import React from 'react';
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
    onUndo,
    onRedo,
    canUndo,
    canRedo,
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
        <div className={`admin-shell admin-density-compact admin-${adminTheme.mode || 'dark'} flex h-[100dvh] flex-row overflow-hidden font-sans`} style={shellStyle}>
            {/* Column 1: Sidebar */}
            <EvolutionSidebar branding={adminBranding} />

            {/* Column 2: Central workspace */}
            <EvolutionCanvas
                branding={adminBranding}
                notificationsManager={notificationsManager}
                searchItems={searchItems}
                onUndo={onUndo}
                onRedo={onRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onSave={onSave}
                isSaving={isSaving}
            >
                {children}
            </EvolutionCanvas>

            {/* Column 3: Contextual Inspector */}
            <EvolutionInspector
                onDataChange={onDataChange}
                onSave={onSave}
                onUndo={onUndo}
                onRedo={onRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                isSaving={isSaving}
                catalogContext={catalogContext}
                usersManager={usersManager}
                categories={categories}
                brands={brands}
            />

            {/* Global Overlay: Command Palette */}
            <CommandPalette branding={adminBranding} onAddItem={onAddItem} searchItems={searchItems} />
        </div>
    );
};

export default EvolutionLayout;
