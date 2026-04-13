import React from 'react';
import {
    HouseLine,
    ShoppingBag,
    Users,
    Tag,
    CaretLeft,
    CaretRight,
    Palette,
    Command,
    CreditCard,
    Percent,
    Plug,
    Bell,
    Truck,
} from '@phosphor-icons/react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { cn } from '../../../utils/cn';

const getPanelInitial = (title = '') => {
    const safeTitle = title.trim();
    return safeTitle ? safeTitle.charAt(0).toUpperCase() : 'E';
};

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
    <button
        onClick={onClick}
        style={active ? { backgroundColor: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' } : undefined}
        className={cn(
            'admin-hover-surface flex w-full items-center rounded-lg p-3 group relative',
            active ? 'border border-transparent' : 'border border-transparent admin-text-muted'
        )}
    >
        <Icon
            size={20}
            weight={active ? 'bold' : 'regular'}
            className={cn('shrink-0 transition-transform', active && 'scale-110')}
        />
        {!collapsed ? (
            <span className="ml-3 whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-200 group-hover:translate-x-1">
                {label}
            </span>
        ) : (
            <div
                style={{
                    backgroundColor: 'var(--admin-panel-bg)',
                    borderColor: 'var(--admin-border)',
                    color: 'var(--admin-text)',
                }}
                className="pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            >
                {label}
            </div>
        )}
    </button>
);

const EvolutionSidebar = ({ branding }) => {
    const {
        activeModule,
        setActiveModule,
        isSidebarCollapsed,
        toggleSidebar,
    } = useEvolutionStore();

    const modules = [
        { id: 'home', label: 'Inicio', icon: HouseLine },
        { id: 'about', label: 'Sobre nosotros', icon: Users },
        { id: 'appearance', label: 'Apariencia', icon: Palette },
        { id: 'catalog', label: 'Catalogo', icon: ShoppingBag },
        { id: 'categories', label: 'Categorias', icon: Tag },
        { id: 'pricing', label: 'Ofertas', icon: Percent },
        { id: 'checkout', label: 'Checkout', icon: CreditCard },
        { id: 'shipping', label: 'Envios', icon: Truck },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'integrations', label: 'Integraciones', icon: Plug },
        { id: 'users', label: 'Usuarios', icon: Users },
    ];

    const panelTitle = branding?.title || 'Panel de administracion';
    const companyName = branding?.companyName || 'Empresa';
    const panelInitial = getPanelInitial(panelTitle);
    const panelLogo = branding?.logo_url || '';

    return (
        <>
            <aside
                className={cn(
                    'admin-sidebar-surface hidden md:flex h-screen flex-col border-r transition-all duration-300 ease-in-out shrink-0',
                    isSidebarCollapsed ? 'w-[58px]' : 'w-[240px]'
                )}
            >
                <div className="flex items-center justify-between p-4">
                    {!isSidebarCollapsed ? (
                        <div className="flex min-w-0 items-center gap-3">
                            <div
                                style={{
                                    backgroundColor: panelLogo ? 'rgba(255,255,255,0.96)' : 'var(--admin-accent)',
                                    color: 'var(--admin-accent-contrast)',
                                    boxShadow: '0 0 24px var(--admin-shadow)',
                                }}
                                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                            >
                                {panelLogo ? (
                                    <img src={panelLogo} alt={panelTitle} className="h-8 w-8 object-contain" />
                                ) : (
                                    <span className="text-sm font-black">{panelInitial}</span>
                                )}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="truncate text-[11px] font-bold uppercase tracking-[0.22em] admin-accent-text">
                                    {companyName}
                                </p>
                                <p className="truncate text-sm font-semibold admin-text-primary">{panelTitle}</p>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                backgroundColor: panelLogo ? 'rgba(255,255,255,0.96)' : 'var(--admin-accent)',
                                color: 'var(--admin-accent-contrast)',
                                boxShadow: '0 0 24px var(--admin-shadow)',
                            }}
                            className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl"
                        >
                            {panelLogo ? (
                                <img src={panelLogo} alt={panelTitle} className="h-7 w-7 object-contain" />
                            ) : (
                                <span className="text-sm font-black">{panelInitial}</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-1 px-3">
                    {modules.map((module) => (
                        <SidebarItem
                            key={module.id}
                            icon={module.icon}
                            label={module.label}
                            active={activeModule === module.id}
                            onClick={() => setActiveModule(module.id)}
                            collapsed={isSidebarCollapsed}
                        />
                    ))}
                </div>

                <div className="space-y-1 border-t p-3" style={{ borderColor: 'var(--admin-border)' }}>
                    <button
                        className="admin-hover-surface flex w-full items-center rounded-lg p-3 admin-text-muted group"
                        onClick={() => { }}
                    >
                        <Command size={20} weight="regular" />
                        {!isSidebarCollapsed ? (
                            <div className="ml-3 flex flex-1 items-center justify-between">
                                <span className="text-sm font-medium">Comandos</span>
                                <span
                                    style={{
                                        backgroundColor: 'var(--admin-hover)',
                                        borderColor: 'var(--admin-border)',
                                    }}
                                    className="rounded border px-1.5 py-0.5 text-[10px] text-zinc-400"
                                >
                                    Ctrl+K
                                </span>
                            </div>
                        ) : null}
                    </button>

                    <button
                        onClick={toggleSidebar}
                        className="admin-hover-surface flex w-full items-center rounded-lg p-3 admin-text-muted"
                    >
                        {isSidebarCollapsed ? (
                            <CaretRight size={20} className="mx-auto" />
                        ) : (
                            <div className="flex items-center">
                                <CaretLeft size={20} />
                                <span className="ml-3 text-sm">Contraer</span>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden admin-sidebar-surface border-t flex items-center overflow-x-auto snap-x px-2 pb-safe pt-1 w-full shrink-0 z-50 hide-scrollbar order-last">
                {modules.map((module) => (
                    <button
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className={cn(
                            'flex flex-col items-center justify-center p-2 rounded-lg shrink-0 snap-center min-w-[72px] transition-colors',
                            activeModule === module.id ? 'admin-accent-text bg-[var(--admin-accent-soft)]' : 'admin-text-muted hover:bg-white/5'
                        )}
                    >
                        <module.icon size={22} weight={activeModule === module.id ? 'fill' : 'regular'} />
                        <span className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis mt-1">{module.label}</span>
                    </button>
                ))}
            </nav>
        </>
    );
};

export default EvolutionSidebar;
