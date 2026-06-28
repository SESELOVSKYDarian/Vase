import React from 'react';
import Header from './Header';
import Footer from './Footer';
import PiquimFooter from './PiquimFooter';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { normalizeInternalPath } from '../../utils/navigation';
import { isPiquimTenantIdentity } from '../../utils/tenantBranding';

export default function StoreLayout({ children }) {
    const { toast } = useStore();
    const { isWholesalePending } = useAuth();
    const { tenant, settings } = useTenant();
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });

    const defaultNavLinks = [
        { label: 'Inicio', href: '/' },
        { label: 'Catalogo', href: '/catalog' },
        { label: 'Nosotros', href: '/about' },
    ];

    const configuredNavLinks = Array.isArray(settings?.branding?.navbar?.links)
        ? settings.branding.navbar.links
        : [];

    const navSource = configuredNavLinks.length ? configuredNavLinks : defaultNavLinks;

    const navLinks = navSource.map((item) => {
        const label = typeof item === 'string' ? item : item?.label || '';
        const rawHref = typeof item === 'string' ? item : item?.href || item?.path || label;
        return {
            ...(typeof item === 'object' ? item : {}),
            label: label || 'Link',
            href: normalizeInternalPath(rawHref, '/'),
        };
    });
    const navbarConfig = settings?.branding?.navbar || {};

    return (
        <div className="bg-background-light dark:bg-background-dark font-[var(--font-family)] text-[color:var(--color-text,#181411)] dark:text-[#f8f7f5] min-h-screen flex flex-col">
            <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 ease-out ${toast?.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-green-400">
                    <div className="bg-white/20 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                        <p className="font-black text-lg tracking-tight leading-none">Excelente</p>
                        <p className="text-sm font-bold text-green-50 text-nowrap">{toast?.message}</p>
                    </div>
                </div>
            </div>
            <Header
                navLinks={navLinks}
                isPiquimPreset={isPiquim}
                showSearch={navbarConfig.show_search !== false}
                showWishlist={navbarConfig.show_wishlist !== false}
                showCart={navbarConfig.show_cart !== false}
                showAccount={navbarConfig.show_account !== false}
                registerLabel={navbarConfig.register_label || 'Registrarse'}
                registerHref={navbarConfig.register_href || '/signup'}
            />
            {isWholesalePending ? (
                <div className="w-full border-b border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold px-4 md:px-10 py-2 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">
                    Tu cuenta mayorista esta pendiente de aprobacion. Mientras tanto ves precios minoristas.
                </div>
            ) : null}
            <main className="flex-grow">
                {children}
            </main>
            {isPiquim ? <PiquimFooter /> : <Footer />}
        </div>
    );
}
