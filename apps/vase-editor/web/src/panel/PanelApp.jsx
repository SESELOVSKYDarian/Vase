import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './panel.css';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../context/ToastContext';
import { useEditorState } from '../hooks/admin/useEditorState';
import useNotificationsManager from '../hooks/admin/useNotificationsManager';
import useEvolutionStore from '../store/useEvolutionStore';
import { navigate } from '../utils/navigation';
import { isPiquimTenantIdentity, resolveBrandLogo, resolveTenantBrandName } from '../utils/tenantBranding';
import { ComingSoon, GeneralHelp, SectionHelp, Sidebar, Topbar } from './components/Shell';
import './screens/screens.css';
import Resumen from './screens/Resumen';
import Imagenes from './screens/Imagenes';
import Pedidos from './screens/Pedidos';
import Clientes from './screens/Clientes';
import AjustesPrecios from './screens/AjustesPrecios';
import AjustesSucursales from './screens/AjustesSucursales';
import AjustesPagos from './screens/AjustesPagos';
import AjustesEquipo from './screens/AjustesEquipo';
import { AjustesCorreo, AjustesGestion, AjustesSeo } from './screens/AjustesForms';
import Catalogo from './catalog/Catalogo';
import Envios from './envios/Envios';
import Diseno from './diseno/Diseno';
import Icon from './components/Icon';
import { SECTIONS, SETTINGS_PAGES, panelPath, parsePanelPath } from './sections';

const THEME_KEY = 'vase_panel_theme';
const MINI_KEY = 'vase_panel_mini';

const readStorage = (key) => {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};
const writeStorage = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // sin almacenamiento (modo privado): el panel funciona igual
    }
};

const initialTheme = () => {
    const saved = readStorage(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function useFonts() {
    useEffect(() => {
        const id = 'vp-font-manrope';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
    }, []);
}

export default function PanelApp() {
    useFonts();
    const { user, logout } = useAuth();
    const { tenant } = useTenant();
    const { addToast } = useToast();
    const editor = useEditorState(user);
    const notifications = useNotificationsManager();

    const [path, setPath] = useState(window.location.pathname);
    const [theme, setThemeState] = useState(initialTheme);
    const [mini, setMini] = useState(() => readStorage(MINI_KEY) === '1');
    const [help, setHelp] = useState(null);

    useEffect(() => {
        const sync = () => setPath(window.location.pathname);
        window.addEventListener('popstate', sync);
        window.addEventListener('navigate', sync);
        return () => {
            window.removeEventListener('popstate', sync);
            window.removeEventListener('navigate', sync);
        };
    }, []);

    const { section, sub } = parsePanelPath(path);
    const go = useCallback((nextSection, nextSub = null) => navigate(panelPath(nextSection, nextSub)), []);
    const setTheme = (value) => { setThemeState(value); writeStorage(THEME_KEY, value); };
    const toggleMini = () => setMini((value) => { writeStorage(MINI_KEY, value ? '0' : '1'); return !value; });

    const settings = editor.settings || {};
    const storeName = resolveTenantBrandName({ tenant, settings });
    const store = { name: storeName, initial: storeName.trim().charAt(0).toUpperCase() || 'V', logo: resolveBrandLogo({ tenant, settings }) };

    const badges = {
        payments: notifications.paymentApprovals?.length || 0,
        users: notifications.pendingUsers?.length || 0,
        total: notifications.badgeCount || 0,
    };

    const settingsPage = SETTINGS_PAGES.find((page) => page.id === sub);
    const meta = settingsPage ? { title: settingsPage.label, subtitle: settingsPage.subtitle } : SECTIONS[section];

    useEffect(() => {
        document.title = `${meta.title} · ${storeName} | Vase Business`;
    }, [meta.title, storeName]);

    const openLegacy = (module) => {
        if (module) useEvolutionStore.getState().setActiveModule(module);
        navigate('/admin/anterior');
    };

    const publish = async () => {
        const result = await editor.handleSaveAll();
        if (result?.success) {
            addToast(result.published ? 'Cambios publicados en la tienda' : 'Guardado como borrador', 'success');
        } else {
            addToast(`No se pudo publicar: ${result?.details || result?.error || 'error desconocido'}`, 'error');
        }
    };

    const status = editor.canUndo ? { dirty: true, text: 'Cambios sin publicar' } : { dirty: false, text: 'Todo publicado' };
    const vaseUrl = String(import.meta.env.VITE_VASE_APP_URL || 'https://app.vase.ar').replace(/\/+$/, '');

    // Pantallas que arman su propio diseño (pestañas a todo el ancho y barra lateral derecha).
    let fullScreen = null;
    if (section === 'catalogo' && !editor.loading) {
        fullScreen = (
            <Catalogo
                editor={editor}
                user={user}
                theme={theme}
                toast={addToast}
                openLegacy={openLegacy}
                goSettings={(page) => go('ajustes', page)}
                storeHost={window.location.host}
            />
        );
    } else if (section === 'pedidos') {
        fullScreen = <Pedidos user={user} theme={theme} toast={addToast} onChanged={notifications.refresh} />;
    } else if (section === 'clientes') {
        fullScreen = <Clientes user={user} toast={addToast} onChanged={notifications.refresh} />;
    } else if (section === 'diseno' && !editor.loading) {
        fullScreen = <Diseno editor={editor} isPiquim={isPiquimTenantIdentity({ tenant, settings })} theme={theme} toast={addToast} onPublish={publish} />;
    } else if (section === 'envios' && !editor.loading) {
        fullScreen = <Envios editor={editor} toast={addToast} theme={theme} goSettings={(page) => go('ajustes', page)} />;
    }

    let content;
    if (section === 'resumen') {
        content = (
            <Resumen
                products={editor.products || []}
                orders={notifications.orders || []}
                pendingUsers={notifications.pendingUsers || []}
                paymentApprovals={notifications.paymentApprovals || []}
                loading={editor.loading || notifications.loading}
                go={go}
            />
        );
    } else if (section === 'imagenes') {
        content = <Imagenes editor={editor} toast={addToast} />;
    } else if (section === 'ajustes' && !sub) {
        content = (
            <div className="vp-alist">
                <div className="vp-agrp">Tus ajustes</div>
                {SETTINGS_PAGES.map((page) => (
                    <button key={page.id} type="button" className="vp-arow" onClick={() => go('ajustes', page.id)}>
                        <span className="g"><b>{page.label}</b><span>{page.subtitle}</span></span>
                        <span className="vp-chev">›</span>
                    </button>
                ))}
            </div>
        );
    } else if (sub === 'precios') {
        content = <AjustesPrecios editor={editor} user={user} toast={addToast} onSave={publish} />;
    } else if (sub === 'sucursales') {
        content = <AjustesSucursales editor={editor} toast={addToast} goEnvios={() => go('envios')} />;
    } else if (sub === 'pagos') {
        content = <AjustesPagos editor={editor} toast={addToast} />;
    } else if (sub === 'seo') {
        content = <AjustesSeo editor={editor} onSave={publish} />;
    } else if (sub === 'correo') {
        content = <AjustesCorreo />;
    } else if (sub === 'gestion') {
        content = <AjustesGestion />;
    } else if (sub === 'equipo') {
        content = <AjustesEquipo user={user} toast={addToast} />;
    } else if (settingsPage) {
        content = <ComingSoon title={settingsPage.label} hint={settingsPage.hint} onOpenLegacy={() => openLegacy(settingsPage.legacy)} />;
    } else {
        content = <ComingSoon title={meta.title} hint={meta.hint} onOpenLegacy={() => openLegacy(meta.legacy)} />;
    }

    return (
        <div className="vp" data-theme={theme}>
            <Sidebar
                section={section}
                sub={sub}
                go={go}
                mini={mini}
                onToggleMini={toggleMini}
                theme={theme}
                onTheme={setTheme}
                badges={badges}
                store={store}
                account={{
                    email: user?.email,
                    name: user?.name || user?.full_name || user?.email?.split('@')[0] || 'Tu cuenta',
                    vaseUrl,
                    onLogout: () => { logout(); navigate('/login'); },
                    onHelp: () => setHelp('general'),
                }}
            />
            <main className="vp-main">
                <Topbar
                    title={meta.title}
                    subtitle={meta.subtitle}
                    crumb={settingsPage ? 'Ajustes' : null}
                    onBack={() => go('ajustes')}
                    status={status}
                    onPublish={publish}
                    publishing={editor.saving}
                    badges={badges}
                    onNotifications={() => go(badges.payments ? 'pedidos' : 'clientes')}
                    onHelp={() => setHelp('section')}
                />
                {fullScreen || (
                    <div className="vp-page">
                        <div className="vp-body">
                            {editor.loading && section !== 'resumen' ? (
                                <div className="vp-empty"><Icon name="grid" /> Preparando tus datos…</div>
                            ) : content}
                        </div>
                    </div>
                )}
            </main>
            <SectionHelp
                open={help === 'section'}
                onClose={() => setHelp(null)}
                section={section}
                title={meta.title}
                onAll={() => setHelp('general')}
                theme={theme}
            />
            <GeneralHelp open={help === 'general'} onClose={() => setHelp(null)} theme={theme} />
        </div>
    );
}
