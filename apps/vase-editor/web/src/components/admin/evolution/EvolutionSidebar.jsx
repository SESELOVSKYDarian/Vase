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

const SidebarItem = ({ icon: Icon, label, shortLabel, active, onClick, collapsed }) => (
    <button
        onClick={onClick}
        style={active ? { backgroundColor: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' } : undefined}
        className={cn(
            'admin-hover-surface group relative flex w-full items-center rounded-xl border transition-all duration-200',
            collapsed ? 'min-h-[48px] flex-col justify-center gap-1 px-1.5 py-1.5 text-center' : 'min-h-9 px-2.5 py-1.5',
            active ? 'border-[var(--admin-accent-border)] shadow-sm' : 'border-transparent admin-text-muted'
        )}
        title={collapsed ? label : undefined}
    >
        {active && !collapsed ? (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--admin-accent)]" />
        ) : null}
        <Icon
            size={collapsed ? 18 : 16}
            weight={active ? 'bold' : 'regular'}
            className={cn('shrink-0 transition-transform', active && 'scale-105')}
        />
        {!collapsed ? (
            <span className="ml-2.5 overflow-hidden whitespace-nowrap text-[12px] font-semibold transition-all duration-200 group-hover:translate-x-0.5">
                {label}
            </span>
        ) : (
            <span className="max-w-[58px] overflow-hidden text-ellipsis text-[9px] font-bold leading-tight tracking-tight">
                {shortLabel || label}
            </span>
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

    const moduleGroups = [
        {
            label: 'Sitio',
            items: [
                { id: 'home', label: 'Inicio', shortLabel: 'Inicio', icon: HouseLine },
                { id: 'about', label: 'Sobre nosotros', shortLabel: 'Nosotros', icon: Users },
                { id: 'appearance', label: 'Apariencia', shortLabel: 'Apar.', icon: Palette },
            ],
        },
        {
            label: 'Comercio',
            items: [
                { id: 'catalog', label: 'Catalogo', shortLabel: 'Catalogo', icon: ShoppingBag },
                { id: 'categories', label: 'Categorias', shortLabel: 'Categorias', icon: Tag },
                { id: 'pricing', label: 'Ofertas', shortLabel: 'Ofertas', icon: Percent },
                { id: 'checkout', label: 'Checkout', shortLabel: 'Checkout', icon: CreditCard },
                { id: 'shipping', label: 'Envios', shortLabel: 'Envios', icon: Truck },
            ],
        },
        {
            label: 'Operacion',
            items: [
                { id: 'notifications', label: 'Notificaciones', shortLabel: 'Alertas', icon: Bell },
                { id: 'integrations', label: 'Integraciones', shortLabel: 'Integr.', icon: Plug },
                { id: 'users', label: 'Usuarios', shortLabel: 'Usuarios', icon: Users },
            ],
        },
    ];
    const modules = moduleGroups.flatMap((group) => group.items);

    const panelTitle = branding?.title || 'Panel de administracion';
    const companyName = branding?.companyName || 'Empresa';
    const panelInitial = getPanelInitial(panelTitle);
    const panelLogo = branding?.logo_url || '';

    return (
        <>
            <aside
                className={cn(
                    'admin-sidebar-surface hidden 2xl:flex h-screen flex-col border-r transition-all duration-300 ease-in-out shrink-0',
                    isSidebarCollapsed ? 'w-[76px]' : 'w-[232px]'
                )}
            >
                <div className={cn('flex min-h-14 items-center justify-between border-b p-3', isSidebarCollapsed && 'justify-center px-2')} style={{ borderColor: 'var(--admin-border)' }}>
                    {!isSidebarCollapsed ? (
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div
                                style={{
                                    backgroundColor: panelLogo ? 'rgba(255,255,255,0.96)' : 'var(--admin-accent)',
                                    color: 'var(--admin-accent-contrast)',
                                    boxShadow: '0 0 24px var(--admin-shadow)',
                                }}
                                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                            >
                                {panelLogo ? (
                                    <img src={panelLogo} alt={panelTitle} className="h-7 w-7 object-contain" />
                                ) : (
                                    <span className="text-xs font-black">{panelInitial}</span>
                                )}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] admin-accent-text">
                                    {companyName}
                                </p>
                                <p className="truncate text-[13px] font-semibold tracking-tight admin-text-primary">{panelTitle}</p>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                backgroundColor: panelLogo ? 'rgba(255,255,255,0.96)' : 'var(--admin-accent)',
                                color: 'var(--admin-accent-contrast)',
                                boxShadow: '0 0 24px var(--admin-shadow)',
                            }}
                            className="mx-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl"
                        >
                            {panelLogo ? (
                                <img src={panelLogo} alt={panelTitle} className="h-6 w-6 object-contain" />
                            ) : (
                                <span className="text-xs font-black">{panelInitial}</span>
                            )}
                        </div>
                    )}
                </div>

                <div className={cn('custom-scrollbar flex-1 space-y-3 overflow-y-auto py-3', isSidebarCollapsed ? 'px-1.5' : 'px-2.5')}>
                    {moduleGroups.map((group) => (
                        <div key={group.label} className="space-y-1">
                            {!isSidebarCollapsed ? (
                                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-muted-soft)]">
                                    {group.label}
                                </p>
                            ) : null}
                            {group.items.map((module) => (
                                <SidebarItem
                                    key={module.id}
                                    icon={module.icon}
                                    label={module.label}
                                    shortLabel={module.shortLabel}
                                    active={activeModule === module.id}
                                    onClick={() => setActiveModule(module.id)}
                                    collapsed={isSidebarCollapsed}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                <div className={cn('space-y-1 border-t p-2.5', isSidebarCollapsed && 'px-1.5')} style={{ borderColor: 'var(--admin-border)' }}>
                    <button
                        className={cn(
                            'admin-hover-surface group flex w-full items-center rounded-xl border border-transparent admin-text-muted',
                            isSidebarCollapsed ? 'min-h-[46px] flex-col justify-center gap-1 px-1.5 py-1.5' : 'p-2.5'
                        )}
                        onClick={() => { }}
                        title={isSidebarCollapsed ? 'Comandos' : undefined}
                    >
                        <Command size={18} weight="regular" />
                        {!isSidebarCollapsed ? (
                            <div className="ml-3 flex flex-1 items-center justify-between">
                                <span className="text-[12px] font-medium">Comandos</span>
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
                        ) : (
                            <span className="text-[10px] font-bold leading-tight">Ctrl K</span>
                        )}
                    </button>

                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            'admin-hover-surface flex w-full items-center rounded-xl border border-transparent admin-text-muted',
                            isSidebarCollapsed ? 'min-h-[44px] flex-col justify-center gap-1 px-1.5 py-1.5' : 'p-2.5'
                        )}
                        title={isSidebarCollapsed ? 'Expandir menu' : undefined}
                    >
                        {isSidebarCollapsed ? (
                            <>
                                <CaretRight size={18} />
                                <span className="text-[10px] font-bold leading-tight">Abrir</span>
                            </>
                        ) : (
                            <div className="flex items-center">
                                <CaretLeft size={18} />
                                <span className="ml-2.5 text-[12px]">Contraer</span>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-[70] flex items-center gap-1 overflow-x-auto border-t admin-sidebar-surface px-2 py-1 2xl:hidden hide-scrollbar">
                {modules.map((module) => (
                    <button
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className={cn(
                            'flex min-h-10 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-lg px-1.5 py-1 transition-colors',
                            activeModule === module.id ? 'admin-accent-text bg-[var(--admin-accent-soft)]' : 'admin-text-muted hover:bg-[var(--admin-hover)]'
                        )}
                    >
                        <module.icon size={16} weight={activeModule === module.id ? 'fill' : 'regular'} />
                        <span className="mt-0.5 max-w-[54px] overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-semibold">{module.shortLabel || module.label}</span>
                    </button>
                ))}
            </nav>
        </>
    );
};

export default EvolutionSidebar;
