import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ToastProvider } from './context/ToastContext';
import { StoreProvider } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { navigate } from './utils/navigation';
import { isEditorHost as resolveIsEditorHost } from './utils/vaseAuth';
import { resolveTenantBrandName } from './utils/tenantBranding';

// Store pages
import HomePage from './pages/store/HomePage';
import CatalogPage from './pages/store/CatalogPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import ProductDetail from './pages/store/ProductDetail';
import AboutPage from './pages/store/AboutPage';
import LoginPage from './pages/store/LoginPage';
import SignupPage from './pages/store/SignupPage';
import ProfilePage from './pages/store/ProfilePage';
import OrderSuccessPage from './pages/store/OrderSuccessPage';
import OrderDetailPage from './pages/store/OrderDetailPage';
import TermsPage from './pages/store/TermsPage';

// Admin pages
import EditorPage from './pages/admin/EditorPage';
import EvolutionAdmin from './pages/admin/evolution/EvolutionAdmin';
import PreviewPage from './pages/admin/evolution/PreviewPage';

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
        document.title = isAdminRoute || isPreviewRoute
            ? `${brandName} | Editor`
            : brandName;
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
                <Component />
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
