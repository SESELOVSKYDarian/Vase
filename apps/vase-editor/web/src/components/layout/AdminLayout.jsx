import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../utils/navigation';

const PAGE_LABELS = {
    home: 'Inicio',
    about: 'Nosotros',
    catalog: 'Catalogo',
    users: 'Clientes',
    checkout: 'Carrito',
    appearance: 'Diseno',
    pricing: 'Precios',
};

const RAIL_ITEMS = [
    { key: 'home', title: 'Inicio', icon: 'home', color: 'text-blue-600 bg-blue-50' },
    { key: 'about', title: 'Nosotros', icon: 'info', color: 'text-purple-600 bg-purple-50' },
    { key: 'catalog', title: 'Catalogo', icon: 'box', color: 'text-indigo-600 bg-indigo-50' },
    { key: 'users', title: 'Clientes', icon: 'users', color: 'text-pink-600 bg-pink-50' },
    { key: 'checkout', title: 'Carrito', icon: 'cart', color: 'text-cyan-600 bg-cyan-50' },
    { key: 'appearance', title: 'Diseno', icon: 'palette', color: 'text-amber-600 bg-amber-50' },
    { key: 'pricing', title: 'Precios', icon: 'tag', color: 'text-emerald-600 bg-emerald-50' },
];

function RailIcon({ name, className = 'w-4 h-4' }) {
    if (name === 'home') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10.5L12 3l9 7.5" />
                <path d="M5 9.8V21h14V9.8" />
            </svg>
        );
    }
    if (name === 'info') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 10v6" />
                <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
            </svg>
        );
    }
    if (name === 'box') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M3 7v10l9 4 9-4V7" />
                <path d="M12 11v10" />
            </svg>
        );
    }
    if (name === 'users') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20a6 6 0 0 1 12 0" />
                <circle cx="18" cy="9" r="2" />
                <path d="M16 20a5 5 0 0 1 5-5" />
            </svg>
        );
    }
    if (name === 'cart') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h2l2 11h11l2-8H7" />
                <circle cx="10" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
            </svg>
        );
    }
    if (name === 'palette') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3C7 3 3 7 3 12s4 9 9 9h1a2 2 0 0 0 0-4h-1a1 1 0 0 1 0-2h2c4.4 0 8-3.6 8-8 0-2.2-1-4.2-2.6-5.5" />
                <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
                <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
                <circle cx="14.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
                <circle cx="17.5" cy="10" r="1" fill="currentColor" stroke="none" />
            </svg>
        );
    }
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12l8 8 8-8-8-8-8 8z" />
            <path d="M8 12h8" />
        </svg>
    );
}

export default function AdminLayout({
    children,
    activeSection = 'home',
    onSectionChange,
    hideSidebar = false,
    hideHeader = false,
    contentClassName = '',
}) {
    const { logout } = useAuth();

    const handleSectionChange = (section) => {
        if (typeof onSectionChange === 'function') onSectionChange(section);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const currentPageLabel = PAGE_LABELS[activeSection] || 'Inicio';

    return (
        <div className="flex h-screen bg-[#d7d8db]">
            {!hideHeader ? (
                <header className="fixed inset-x-0 top-0 z-40 h-12 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-[#3d2f21] dark:bg-[#1a130c]/95">
                    <div className="h-full px-3 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#667085]">Pagina</span>
                            <button
                                type="button"
                                onClick={() => handleSectionChange(activeSection === 'home' ? 'about' : 'home')}
                                className="px-3 py-1 rounded-md border border-gray-200 text-xs font-semibold text-[#1f2937] hover:border-primary hover:text-primary dark:border-[#3d2f21] dark:text-white"
                            >
                                {currentPageLabel}
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="h-8 rounded-full border border-gray-200 bg-[#f7f8fa] px-4 text-xs text-[#667085] flex items-center dark:border-[#3d2f21] dark:bg-[#241b13]">
                                https://mi-negocio.vase.ar
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#667085]">
                            <span className="px-2 py-1 rounded border border-gray-200 dark:border-[#3d2f21]">100%</span>
                            <button type="button" className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2c2116]">Herramientas</button>
                            <button type="button" className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2c2116]">Buscar</button>
                        </div>
                    </div>
                </header>
            ) : null}

            <div className={`flex flex-1 w-full ${hideHeader ? '' : 'pt-12'}`}>
                {!hideSidebar ? (
                    <aside className="w-14 border-r border-gray-200 bg-white dark:border-[#3d2f21] dark:bg-[#1a130c] flex flex-col items-center py-3 gap-2">
                        {RAIL_ITEMS.map((item) => {
                            const isActive = activeSection === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    title={item.title}
                                    onClick={() => handleSectionChange(item.key)}
                                    className={`w-9 h-9 rounded-xl grid place-items-center transition-all ${
                                        isActive
                                            ? `${item.color} ring-2 ring-primary/40`
                                            : 'text-[#667085] hover:bg-gray-100 dark:hover:bg-[#2c2116]'
                                    }`}
                                >
                                    <RailIcon name={item.icon} />
                                </button>
                            );
                        })}
                        <div className="flex-1" />
                        <button
                            type="button"
                            title="Salir"
                            onClick={handleLogout}
                            className="w-9 h-9 rounded-xl grid place-items-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 17l5-5-5-5" />
                                <path d="M20 12H9" />
                                <path d="M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                            </svg>
                        </button>
                    </aside>
                ) : null}

                <main className="flex-1 overflow-hidden flex flex-col relative">
                    <div className={`flex-1 overflow-auto ${contentClassName || 'bg-[#909296] p-4'}`}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
