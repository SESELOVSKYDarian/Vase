import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ToastProvider } from './context/ToastContext';
import { StoreProvider } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { navigate } from './utils/navigation';
import { isEditorHost as resolveIsEditorHost } from './utils/vaseAuth';
import { resolveTenantBrandName } from './utils/tenantBranding';

// Tras un deploy los chunks con hash viejo dejan de existir. Si una pestaña abierta
// pide uno, se recarga para tomar el index.html nuevo en vez de mostrar un error
// (como maximo una vez cada 30s, para no entrar en loop si falla por otro motivo).
const CHUNK_RELOAD_KEY = 'vase:chunk-reload-at';
const lazyPage = (load) => lazy(() => load().catch((error) => {
    try {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        if (Date.now() - lastReload > 30000) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
            window.location.reload();
            return new Promise(() => {});
        }
    } catch {
        // Sin sessionStorage no se puede evitar el loop: se muestra el error.
    }
    throw error;
}));

// Store pages
const HomePage = lazyPage(() => import('./pages/store/HomePage'));
const CatalogPage = lazyPage(() => import('./pages/store/CatalogPage'));
const CartPage = lazyPage(() => import('./pages/store/CartPage'));
const CheckoutPage = lazyPage(() => import('./pages/store/CheckoutPage'));
const ProductDetail = lazyPage(() => import('./pages/store/ProductDetail'));
const AboutPage = lazyPage(() => import('./pages/store/AboutPage'));
const LoginPage = lazyPage(() => import('./pages/store/LoginPage'));
const SignupPage = lazyPage(() => import('./pages/store/SignupPage'));
const ProfilePage = lazyPage(() => import('./pages/store/ProfilePage'));
const OrderSuccessPage = lazyPage(() => import('./pages/store/OrderSuccessPage'));
const OrderDetailPage = lazyPage(() => import('./pages/store/OrderDetailPage'));
const TermsPage = lazyPage(() => import('./pages/store/TermsPage'));

// Admin pages
const EditorPage = lazyPage(() => import('./pages/admin/EditorPage'));
const EvolutionAdmin = lazyPage(() => import('./pages/admin/evolution/EvolutionAdmin'));
const PreviewPage = lazyPage(() => import('./pages/admin/evolution/PreviewPage'));

function PageFallback() {
    return <div className="min-h-screen" aria-busy="true" />;
}

function AppContent() {
    const [route, setRoute] = useState(window.location.pathname);
    const { isAdmin, loading: authLoading, user } = useAuth();
    const { tenant, settings } = useTenant();
    const isEditorHost = resolveIsEditorHost();
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const allowLocalAdmin = isEditorHost || isLocalHost || import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true';
    const isPreviewRoute = route === '/admin/preview';
    const isAdminRoute = route === '/admin' || route === '/admin/evolution' || route === '/admin/legacy';

    useEffect(() => {
        const handleLocationChange = () => setRoute(window.location.pathname);

        // Browser back/forward
        window.addEventListener('popstate', handleLocationChange);
        // Custom navigation events
        window.addEventListener('navigate', handleLocationChange);

        return () => {
            window.removeEventListener('popstate', handleLocationChange);
            window.removeEventListener('navigate', handleLocationChange);
        };
    }, []);

    useEffect(() => {
        if (!isEditorHost) return;
        if (route !== '/') return;
        navigate('/admin/evolution');
    }, [isEditorHost, route]);

    useEffect(() => {
        if (allowLocalAdmin) return;
        if (!isPreviewRoute && !isAdminRoute) return;
        navigate('/');
    }, [allowLocalAdmin, isAdminRoute, isPreviewRoute]);

    useEffect(() => {
        const brandName = resolveTenantBrandName({ tenant, settings });
        if (isAdminRoute || isPreviewRoute) {
            document.title = `${brandName} | Editor`;
        }
    }, [isAdminRoute, isPreviewRoute, settings, tenant]);

    let Component = HomePage;

    if ((isPreviewRoute || isAdminRoute) && !allowLocalAdmin) {
        Component = HomePage;
    } else if (isPreviewRoute) {
        Component = PreviewPage;
    } else if (isAdminRoute) {
        if (authLoading) {
            Component = () => (
                <div className="min-h-screen flex items-center justify-center text-sm text-[#8a7560]">
                    Cargando...
                </div>
            );
        } else if (isAdmin) {
            Component = route === '/admin/legacy' ? EditorPage : EvolutionAdmin;
        } else if (user) {
            Component = ProfilePage;
        } else {
            Component = LoginPage;
        }
    } else if (route === '/profile') Component = ProfilePage;
    else if (route === '/catalog') Component = CatalogPage;
    else if (route === '/about' || route === '/sobre-nosotros') Component = AboutPage;
    else if (route === '/cart') Component = CartPage;
    else if (route === '/checkout') Component = CheckoutPage;
    else if (route === '/order-success') Component = OrderSuccessPage;
    else if (route === '/order-details') Component = OrderDetailPage;
    else if (route === '/terms') Component = TermsPage;
    else if (route.startsWith('/product')) Component = ProductDetail;
    else if (route === '/login') Component = LoginPage;
    else if (route === '/signup' || route === '/register') Component = SignupPage;

    return (
        <div className="w-full min-h-screen bg-gray-50 text-[#181411] transition-colors duration-200 dark:bg-[#090b0f] dark:text-[#e6edf7]">
            <div key={route} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Suspense fallback={<PageFallback />}>
                    <Component />
                </Suspense>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <TenantProvider>
                <ToastProvider>
                    <StoreProvider>
                        <ThemeProvider>
                            <ErrorBoundary>
                                <AppContent />
                            </ErrorBoundary>
                        </ThemeProvider>
                    </StoreProvider>
                </ToastProvider>
            </TenantProvider>
        </AuthProvider>
    );
}

export default App;
