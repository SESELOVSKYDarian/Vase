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

const EvolutionCanvas = ({ children, branding, notificationsManager, searchItems = [] }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
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
    const canvasPaddingClass = isLegacy ? 'p-0' : (isStorefrontEditing ? 'p-3 md:p-4' : 'p-8');
    const contentWidthClass = isLegacy || isStorefrontEditing ? 'mx-0 max-w-none' : 'mx-auto max-w-7xl';
    const adminTitle = branding?.title || 'Panel de administracion';
    const companyName = branding?.companyName || adminTitle;
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

    return (
        <main className="admin-canvas-surface relative flex flex-1 flex-col overflow-hidden">
            <header className="admin-header-surface sticky top-0 z-40 flex h-14 items-center justify-between border-b px-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">
                            {companyName}
                        </p>
                        <h1 className="text-sm font-medium capitalize tracking-wide admin-text-primary">
                            {activeModule}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isStorefrontEditing ? (
                        <button
                            type="button"
                            onClick={toggleClientFocusMode}
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)',
                            }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:opacity-90"
                        >
                            {isClientFocusMode ? <FocusOff size={14} weight="bold" /> : <FocusOn size={14} weight="bold" />}
                            {isClientFocusMode ? 'Editar' : 'Ver cliente'}
                        </button>
                    ) : null}

                    <div className="relative" ref={searchRef}>
                        <div
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                            }}
                            className="flex h-9 w-[320px] items-center rounded-full border px-3"
                        >
                            <Search className="h-4 w-4 shrink-0 admin-text-muted" />
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
                                className="ml-2 w-full bg-transparent text-[13px] outline-none placeholder:text-zinc-500 admin-text-primary"
                            />
                        </div>

                        {isSearchOpen ? (
                            <div
                                style={{
                                    backgroundColor: 'var(--admin-panel-bg)',
                                    borderColor: 'var(--admin-border)',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
                                }}
                                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[420px] overflow-hidden rounded-3xl border animate-in fade-in zoom-in-95 duration-200"
                            >
                                <div className="border-b border-white/10 px-4 py-3">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                                        Busqueda global
                                    </p>
                                </div>
                                <div className="custom-scrollbar max-h-[420px] overflow-auto p-2">
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
                                                        'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all',
                                                        isActive ? 'bg-white/10' : 'hover:bg-white/5'
                                                    )}
                                                >
                                                    <div className="rounded-2xl bg-white/10 p-2 text-zinc-200">
                                                        <Icon size={16} weight="bold" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-white">{item.label}</p>
                                                        <p className="mt-1 text-xs text-zinc-400">{item.description || 'Sin descripcion'}</p>
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

                    <button
                        type="button"
                        onClick={() => setIsDomainModalOpen(true)}
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border)',
                            color: 'var(--admin-text)',
                        }}
                        className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-90"
                    >
                        <Globe size={14} weight="bold" />
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
                            className="flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-2 transition-colors hover:opacity-90"
                        >
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, var(--admin-panel-bg), var(--admin-sidebar-bg))',
                                    borderColor: 'var(--admin-border)',
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold"
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
            />
        </main>
    );
};

export default EvolutionCanvas;

