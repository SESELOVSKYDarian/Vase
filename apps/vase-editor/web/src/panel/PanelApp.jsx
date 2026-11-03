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
import Notifications from './components/Notifications';
import AjustesDominio from './screens/AjustesDominio';
import { SECTIONS, SETTINGS_PAGES, panelPath, parsePanelPath } from './sections';
// Último: los ajustes para celular le ganan a los estilos de cada pantalla.
import './mobile.css';

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

// El panel es de Vase Business: en la pestaña va el ícono de Vase, no el de la tienda. Al salir se deja como estaba.
const PANEL_ICONS = [['icon', '/brand/vase-favicon.png', 'image/png'], ['apple-touch-icon', '/brand/vase-touch-icon.png', 'image/png']];
function usePanelFavicon() {
    useEffect(() => {
        const restore = PANEL_ICONS.map(([rel, href, type]) => {
            let link = document.head.querySelector(`link[rel="${rel}"]`);
            const created = !link;
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', rel);
                document.head.appendChild(link);
            }
            const before = { href: link.getAttribute('href'), type: link.getAttribute('type') };
            link.setAttribute('href', href);
            link.setAttribute('type', type);
            return () => {
                if (created) { link.remove(); return; }
                if (before.href) link.setAttribute('href', before.href); else link.removeAttribute('href');
                if (before.type) link.setAttribute('type', before.type); else link.removeAttribute('type');
            };
        });
        return () => restore.forEach((undo) => undo());
    }, []);
}

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

// Celular o tablet vertical (hasta 900 px): el menú pasa a abrirse con un botón.
function useIsPhone() {
    const query = '(max-width: 900px)';
    const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const update = () => setPhone(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    return phone;
}

export default function PanelApp() {
    useFonts();
    usePanelFavicon();
    const { user, logout } = useAuth();
    const { tenant } = useTenant();
    const { addToast } = useToast();
    const editor = useEditorState(user);
    const notifications = useNotificationsManager();

    const [path, setPath] = useState(window.location.pathname);
    const [theme, setThemeState] = useState(initialTheme);
    const [mini, setMini] = useState(() => readStorage(MINI_KEY) === '1');
    const isPhone = useIsPhone();
    const [navOpen, setNavOpen] = useState(false);
    const [help, setHelp] = useState(null);
    const [notesOpen, setNotesOpen] = useState(false);

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
    const go = useCallback((nextSection, nextSub = null) => { setNavOpen(false); navigate(panelPath(nextSection, nextSub)); }, []);
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

    const openNotifications = () => { setNotesOpen(true); notifications.refresh?.(); };
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
        fullScreen = (
            <Diseno
                editor={editor}
                isPiquim={isPiquimTenantIdentity({ tenant, settings })}
                theme={theme}
                toast={addToast}
                status={status}
                onPublish={publish}
                publishing={editor.saving}
                badges={badges}
                onNotifications={openNotifications}
                onHelp={() => setHelp('section')}
                onMenu={isPhone ? () => setNavOpen(true) : undefined}
                phone={isPhone}
            />
        );
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
                        <span className="vp-chev" aria-hidden="true"><Icon name="chevron" size={16} /></span>
                    </button>
                ))}
            </div>
        );
    } else if (sub === 'precios') {
        content = <AjustesPrecios editor={editor} user={user} toast={addToast} onSave={publish} goClients={() => go('clientes')} />;
    } else if (sub === 'sucursales') {
        content = <AjustesSucursales editor={editor} toast={addToast} goEnvios={() => go('envios')} />;
    } else if (sub === 'pagos') {
        content = <AjustesPagos editor={editor} toast={addToast} onSave={publish} storeName={storeName} />;
    } else if (sub === 'seo') {
        content = <AjustesSeo editor={editor} onSave={publish} storeName={storeName} domain={tenant?.domain || tenant?.primary_domain || window.location.host} />;
    } else if (sub === 'correo') {
        content = <AjustesCorreo toast={addToast} goPagos={() => go('ajustes', 'pagos')} />;
    } else if (sub === 'gestion') {
        content = <AjustesGestion editor={editor} toast={addToast} />;
    } else if (sub === 'dominio') {
        content = <AjustesDominio user={user} toast={addToast} theme={theme} />;
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
                mini={mini && !isPhone}
                onToggleMini={toggleMini}
                phone={isPhone}
                mobileOpen={navOpen}
                onCloseMobile={() => setNavOpen(false)}
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
                {section === 'diseno' ? null : (
                    <Topbar
                        title={meta.title}
                        subtitle={meta.subtitle}
                        crumb={settingsPage ? 'Ajustes' : null}
                        onBack={() => go('ajustes')}
                        status={status}
                        onPublish={publish}
                        publishing={editor.saving}
                        badges={badges}
                        onNotifications={openNotifications}
                        onHelp={() => setHelp('section')}
                        onMenu={isPhone ? () => setNavOpen(true) : undefined}
                    />
                )}
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
            <Notifications open={notesOpen} onClose={() => setNotesOpen(false)} theme={theme} notifications={notifications} go={go} />
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
