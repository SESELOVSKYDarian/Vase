import React, { useEffect, useMemo, useRef, useState } from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { useAuth } from '../../../context/AuthContext';
import { navigate } from '../../../utils/navigation';
import { cn } from '../../../utils/cn';
import DomainConnectModal from './DomainConnectModal';
import NotificationsPopover from './NotificationsPopover';
import {
    MagnifyingGlass as Search,
    Bell,
    Globe,
    ArrowsOut as FocusOn,
    ArrowsIn as FocusOff,
    CaretDown,
    SignOut,
    Package,
    Tag,
    UsersThree,
    CreditCard,
    SquaresFour,
    WarningCircle,
    RocketLaunch,
    ArrowCounterClockwise,
    ArrowClockwise,
    FloppyDisk,
    Eye,
    Sliders,
} from '@phosphor-icons/react';

const iconButtonStyle = {
    backgroundColor: 'transparent',
    color: 'var(--admin-muted)',
};

const normalizeSearchValue = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const getSearchItemIcon = (kind = '') => {
    switch (kind) {
        case 'product':
            return Package;
        case 'category':
        case 'brand':
            return Tag;
        case 'user':
            return UsersThree;
        case 'payment':
            return CreditCard;
        case 'notification':
            return WarningCircle;
        default:
            return SquaresFour;
    }
};

const MODULE_LABELS = {
    dashboard: 'Dashboard',
    home: 'Inicio',
    about: 'Sobre nosotros',
    appearance: 'Apariencia',
    catalog: 'Catalogo',
    categories: 'Categorias',
    pricing: 'Ofertas',
    users: 'Usuarios',
    customers: 'Usuarios',
    checkout: 'Checkout',
    shipping: 'Envios',
    integrations: 'Integraciones',
    seo: 'SEO',
    notifications: 'Notificaciones',
    tenants: 'Empresas',
    legacy: 'Editor legacy',
    design_live: 'Diseno en vivo',
    catalog_live: 'Catalogo en vivo',
    media: 'Biblioteca',
    settings_live: 'Configuracion',
};

const EvolutionCanvas = ({
    children,
    branding,
    notificationsManager,
    searchItems = [],
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onSave,
    isSaving,
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
    const [domainModalIntent, setDomainModalIntent] = useState('domains');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(0);
    const profileMenuRef = useRef(null);
    const notificationsRef = useRef(null);
    const searchRef = useRef(null);
    const { user, logout } = useAuth();
    const {
        activeModule,
        setActiveModule,
        isSidebarCollapsed,
        isInspectorOpen,
        setSidebarCollapsed,
        setInspectorOpen,
    } = useEvolutionStore();

    const isLegacy = ['legacy'].includes(activeModule);
    const isStorefrontEditing = [
        'home',
        'about',
        'catalog',
        'catalog_live',
        'design_live',
    ].includes(activeModule);
    const isClientFocusMode = isStorefrontEditing && isSidebarCollapsed && !isInspectorOpen;
    const canvasPaddingClass = isLegacy ? 'p-0 pb-14 2xl:pb-0' : (isStorefrontEditing ? 'p-2.5 pb-14 lg:p-3 2xl:pb-3' : 'p-3 pb-14 lg:p-5 2xl:pb-5');
    const contentWidthClass = isLegacy || isStorefrontEditing ? 'mx-0 max-w-none' : 'mx-auto max-w-7xl';
    const adminTitle = branding?.title || 'Panel de administracion';
    const companyName = branding?.companyName || adminTitle;
    const moduleTitle = MODULE_LABELS[activeModule] || activeModule;
    const profileName = user?.name || user?.email || 'Administrador';
    const profileEmail = user?.email || '';
    const profileRole = user?.role === 'master_admin' ? 'Master admin' : 'Admin';
    const notificationsCount = Number(notificationsManager?.badgeCount || 0);
    const normalizedQuery = useMemo(() => normalizeSearchValue(searchQuery), [searchQuery]);
    const profileInitials = useMemo(() => {
        const source = String(profileName || 'A').trim();
        if (!source) return 'A';
        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
        return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }, [profileName]);
    const filteredSearchItems = useMemo(() => {
        const items = Array.isArray(searchItems) ? searchItems : [];
        if (!normalizedQuery) return items.slice(0, 8);

        return items
            .filter((item) => {
                const haystack = normalizeSearchValue(
                    [item.label, item.description, item.keywords].filter(Boolean).join(' ')
                );
                return haystack.includes(normalizedQuery);
            })
            .slice(0, 10);
    }, [normalizedQuery, searchItems]);

    useEffect(() => {
        setHighlightedSearchIndex(0);
    }, [isSearchOpen, normalizedQuery]);

    useEffect(() => {
        if (!isProfileMenuOpen && !isNotificationsOpen && !isSearchOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!profileMenuRef.current?.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
            if (!notificationsRef.current?.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
            if (!searchRef.current?.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsProfileMenuOpen(false);
                setIsNotificationsOpen(false);
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isNotificationsOpen, isProfileMenuOpen, isSearchOpen]);

    const toggleClientFocusMode = () => {
        if (isClientFocusMode) {
            setSidebarCollapsed(false);
            setInspectorOpen(true);
            return;
        }
        setSidebarCollapsed(true);
        setInspectorOpen(false);
    };

    const handleLogout = () => {
        setIsProfileMenuOpen(false);
        logout();
        navigate('/login');
    };

    const handleSearchSelect = (item) => {
        if (!item?.onSelect) return;
        item.onSelect();
        setSearchQuery('');
        setIsSearchOpen(false);
        setHighlightedSearchIndex(0);
    };

    const handleSearchKeyDown = (event) => {
        if (!filteredSearchItems.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsSearchOpen(true);
            setHighlightedSearchIndex((current) => (current + 1) % filteredSearchItems.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setIsSearchOpen(true);
            setHighlightedSearchIndex((current) =>
                current === 0 ? filteredSearchItems.length - 1 : current - 1
            );
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearchSelect(filteredSearchItems[highlightedSearchIndex] || filteredSearchItems[0]);
        }
    };

    const openNotificationsCenter = () => {
        setActiveModule('notifications');
        setIsNotificationsOpen(false);
    };

    const openDomainCenter = (intent = 'domains') => {
        setDomainModalIntent(intent);
        setIsDomainModalOpen(true);
    };

    const openPreview = () => {
        navigate('/admin/preview');
    };

    return (
        <main className="admin-canvas-surface relative flex flex-1 flex-col overflow-hidden">
            <header className="admin-header-surface sticky top-0 z-40 flex min-h-14 flex-col gap-2 border-b px-3 py-2 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between lg:px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">
                            {companyName}
                        </p>
                        <h1 className="truncate text-[15px] font-semibold tracking-tight admin-text-primary">
                            {adminTitle}
                        </h1>
                    </div>
                    <div className="hidden h-7 w-px bg-[var(--admin-border-soft)] 2xl:block" />
                    <div className="hidden min-w-0 2xl:block">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-muted-soft)]">Workspace</p>
                        <p className="truncate text-[13px] font-medium admin-text-primary">{moduleTitle}</p>
                    </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 gap-y-1 md:gap-2">
                    {isStorefrontEditing ? (
                        <button
                            type="button"
                            onClick={toggleClientFocusMode}
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)',
                            }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-90"
                        >
                            {isClientFocusMode ? <FocusOff size={13} weight="bold" /> : <FocusOn size={13} weight="bold" />}
                            {isClientFocusMode ? 'Editar' : 'Ver cliente'}
                        </button>
                    ) : null}

                    <div className="relative hidden 2xl:block" ref={searchRef}>
                        <div
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                            }}
                            className="flex h-8 w-[220px] xl:w-[280px] items-center rounded-full border px-2.5"
                        >
                            <Search className="h-3.5 w-3.5 shrink-0 admin-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => {
                                    setSearchQuery(event.target.value);
                                    setIsSearchOpen(true);
                                }}
                                onFocus={() => setIsSearchOpen(true)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Buscar modulo, producto, usuario o alerta..."
                                className="ml-2 w-full bg-transparent text-[12px] outline-none placeholder:text-zinc-500 admin-text-primary"
                            />
                        </div>

                        {isSearchOpen ? (
                            <div
                                style={{
                                    backgroundColor: 'var(--admin-panel-bg)',
                                    borderColor: 'var(--admin-border)',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
                                }}
                                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] overflow-hidden rounded-2xl border animate-in fade-in zoom-in-95 duration-200"
                            >
                                <div className="border-b border-white/10 px-3 py-2.5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                                        Busqueda global
                                    </p>
                                </div>
                                <div className="custom-scrollbar max-h-[360px] overflow-auto p-1.5">
                                    {filteredSearchItems.length ? (
                                        filteredSearchItems.map((item, index) => {
                                            const Icon = getSearchItemIcon(item.kind);
                                            const isActive = index === highlightedSearchIndex;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleSearchSelect(item)}
                                                    onMouseEnter={() => setHighlightedSearchIndex(index)}
                                                    className={cn(
                                                        'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all',
                                                        isActive ? 'bg-white/10' : 'hover:bg-white/5'
                                                    )}
                                                >
                                                    <div className="rounded-xl bg-white/10 p-1.5 text-zinc-200">
                                                        <Icon size={14} weight="bold" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-semibold text-white">{item.label}</p>
                                                        <p className="mt-0.5 text-[11px] text-zinc-400">{item.description || 'Sin descripcion'}</p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="px-4 py-10 text-center text-sm text-zinc-500">
                                            No se encontraron resultados para esta busqueda.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onUndo}
                            disabled={!canUndo}
                            style={iconButtonStyle}
                            className="admin-hover-surface flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                            title="Deshacer"
                        >
                            <ArrowCounterClockwise className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onRedo}
                            disabled={!canRedo}
                            style={iconButtonStyle}
                            className="admin-hover-surface flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                            title="Rehacer"
                        >
                            <ArrowClockwise className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                            className="admin-accent-button inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                        <FloppyDisk size={13} weight="bold" className={cn(isSaving && 'animate-pulse')} />
                        <span className="hidden sm:inline">{isSaving ? 'Guardando' : 'Guardar'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={openPreview}
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border)',
                            color: 'var(--admin-text)',
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-90"
                    >
                        <Eye size={13} weight="bold" />
                        <span className="hidden 2xl:inline">Previsualizar</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setInspectorOpen(true)}
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border)',
                            color: 'var(--admin-text)',
                        }}
                        className={cn(
                            'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-90 2xl:hidden',
                            isInspectorOpen && 'hidden'
                        )}
                    >
                        <Sliders size={13} weight="bold" />
                        <span className="hidden sm:inline">Inspector</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => openDomainCenter('publish')}
                        className="admin-accent-button hidden 2xl:inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-90"
                    >
                        <RocketLaunch size={13} weight="bold" />
                        Publicar
                    </button>

                    <button
                        type="button"
                        onClick={() => openDomainCenter('domains')}
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border)',
                            color: 'var(--admin-text)',
                        }}
                        className="hidden 2xl:inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-90"
                    >
                        <Globe size={13} weight="bold" />
                        Dominios
                    </button>

                    <div className="relative" ref={notificationsRef}>
                        <button
                            type="button"
                            onClick={() => {
                                const nextOpen = !isNotificationsOpen;
                                setIsNotificationsOpen(nextOpen);
                                if (nextOpen) {
                                    notificationsManager?.refresh?.();
                                }
                            }}
                            style={iconButtonStyle}
                            className="admin-hover-surface relative flex h-8 w-8 items-center justify-center rounded-full"
                        >
                            <Bell className="h-4 w-4" />
                            {notificationsCount > 0 ? (
                                <span
                                    className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                                    style={{ backgroundColor: 'var(--admin-accent)', boxShadow: '0 0 12px var(--admin-shadow)' }}
                                >
                                    {notificationsCount > 9 ? '9+' : notificationsCount}
                                </span>
                            ) : null}
                        </button>

                        {isNotificationsOpen ? (
                            <NotificationsPopover
                                manager={notificationsManager}
                                onOpenCenter={openNotificationsCenter}
                                onClose={() => setIsNotificationsOpen(false)}
                            />
                        ) : null}
                    </div>

                    <div className="relative" ref={profileMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsProfileMenuOpen((current) => !current)}
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)',
                            }}
                            className="flex h-8 items-center gap-1.5 rounded-full border pl-1 pr-1.5 transition-colors hover:opacity-90"
                        >
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, var(--admin-panel-bg), var(--admin-sidebar-bg))',
                                    borderColor: 'var(--admin-border)',
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold"
                            >
                                {profileInitials}
                            </div>
                            <CaretDown
                                size={12}
                                weight="bold"
                                className={`transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isProfileMenuOpen ? (
                            <div
                                style={{
                                    backgroundColor: 'var(--admin-panel-bg)',
                                    borderColor: 'var(--admin-border)',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
                                }}
                                className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border p-2"
                            >
                                <div
                                    style={{ backgroundColor: 'var(--admin-hover)' }}
                                    className="rounded-xl px-3 py-3"
                                >
                                    <p className="truncate text-sm font-semibold admin-text-primary">{profileName}</p>
                                    {profileEmail ? (
                                        <p className="mt-0.5 truncate text-xs admin-text-muted">{profileEmail}</p>
                                    ) : null}
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] admin-accent-text">
                                        {profileRole}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
                                >
                                    <SignOut size={16} weight="bold" />
                                    Cerrar sesion
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className={`evolution-canvas custom-scrollbar flex-1 overflow-auto ${canvasPaddingClass}`}>
                <div className={`${contentWidthClass} min-h-full transition-all duration-300`}>
                    {children}
                </div>
            </div>

            <div
                className="pointer-events-none absolute left-0 top-0 h-32 w-full"
                style={{ background: 'var(--admin-overlay-top)' }}
            />
            <div
                className="pointer-events-none absolute bottom-0 left-0 h-32 w-full"
                style={{ background: 'var(--admin-overlay-bottom)' }}
            />

            <DomainConnectModal
                open={isDomainModalOpen}
                onClose={() => setIsDomainModalOpen(false)}
                initialIntent={domainModalIntent}
            />
        </main>
    );
};

export default EvolutionCanvas;
