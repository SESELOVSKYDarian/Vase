import React, { useEffect, useMemo } from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { useEditorState } from '../../../hooks/admin/useEditorState';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import EvolutionLayout from '../../../components/admin/evolution/EvolutionLayout';
import DesignEditor from '../../../components/admin/evolution/DesignEditor';
import CatalogEditor from '../../../components/admin/evolution/CatalogEditor';
import CategoriesEditor from '../../../components/admin/evolution/CategoriesEditor';
import PageSectionsEditor from '../../../components/admin/evolution/PageSectionsEditor';
import UsersEditor from '../../../components/admin/evolution/UsersEditor';
import PricingEditor from '../../../components/admin/evolution/PricingEditor';
import CheckoutEditor from '../../../components/admin/evolution/CheckoutEditor';
import ShippingEditor from '../../../components/admin/evolution/ShippingEditor';
import IntegrationsEditor from '../../../components/admin/evolution/IntegrationsEditor';
import NotificationsEditor from '../../../components/admin/evolution/NotificationsEditor';
import TenantsEditor from '../../../components/admin/evolution/TenantsEditor';
import AppearanceEditor from '../../../components/admin/evolution/AppearanceEditor';
import MediaLibrary from '../../../components/admin/evolution/MediaLibrary';
import EvolutionInput from '../../../components/admin/evolution/EvolutionInput';
import LegacyAdminFrame from '../../../components/admin/evolution/LegacyAdminFrame';
import { useCatalogManager } from '../../../hooks/admin/useCatalogManager';
import { useUsersManager } from '../../../hooks/admin/useUsersManager';
import { useOffersManager } from '../../../hooks/admin/useOffersManager';
import { useTenantsManager } from '../../../hooks/admin/useTenantsManager';
import useIntegrationManager from '../../../hooks/admin/useIntegrationManager';
import useNotificationsManager from '../../../hooks/admin/useNotificationsManager';
import {
    ArrowUpRight,
    TrendUp,
    Package,
    Users,
    ShoppingBag,
    Pulse as Activity,
    Globe,
    CreditCard,
} from '@phosphor-icons/react';

const StatCard = ({ label, value, trend, icon: Icon, color }) => (
    <div className="p-6 rounded-2xl bg-zinc-dark border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg bg-evolution-indigo/10 text-evolution-indigo`}>
                <Icon size={20} weight="bold" />
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                    <TrendUp size={12} weight="bold" />
                    {trend}
                </div>
            )}
        </div>
        <div className="space-y-1">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        </div>
        <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-evolution-indigo/5 blur-3xl rounded-full group-hover:bg-evolution-indigo/10 transition-colors pointer-events-none`} />
    </div>
);

const Dashboard = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">Bienvenido de nuevo.</h2>
                <p className="text-sm text-zinc-500 font-medium">Aquí tienes un resumen de tu tienda hoy.</p>
            </div>
            <button className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/5 flex items-center gap-2 transition-all">
                Descargar Informe
                <ArrowUpRight size={14} weight="bold" />
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Ventas Totales" value="$428,500" trend="+12.5%" icon={ShoppingBag} />
            <StatCard label="Pedidos Nuevos" value="24" trend="+3.2%" icon={Activity} />
            <StatCard label="Clientes Activos" value="1,204" trend="+8.1%" icon={Users} />
            <StatCard label="Productos" value="482" icon={Package} />
        </div>
    </div>
);

const SettingsEditor = ({ settings, setSettings }) => {
    const updateBranding = (field, value) => {
        setSettings(prev => ({
            ...prev,
            branding: { ...prev.branding, [field]: value }
        }));
    };

    const updateCommerce = (field, value) => {
        setSettings(prev => ({
            ...prev,
            commerce: { ...prev.commerce, [field]: value }
        }));
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">Configuración Global</h2>
                <p className="text-sm text-zinc-500 font-medium">Gestiona el branding y los parámetros del sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Branding Card */}
                <div className="p-8 rounded-3xl bg-zinc-dark border border-white/5 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                            <Globe size={20} weight="bold" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Branding</h3>
                    </div>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Nombre de la Tienda"
                            value={settings.branding.name}
                            onChange={(e) => updateBranding('name', e.target.value)}
                        />
                        <EvolutionInput
                            label="Logo URL"
                            value={settings.branding.logo_url}
                            onChange={(e) => updateBranding('logo_url', e.target.value)}
                        />
                    </div>
                </div>

                {/* Commerce Card */}
                <div className="p-8 rounded-3xl bg-zinc-dark border border-white/5 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <CreditCard size={20} weight="bold" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Comercio</h3>
                    </div>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="WhatsApp de Contacto"
                            value={settings.commerce.whatsapp_number}
                            onChange={(e) => updateCommerce('whatsapp_number', e.target.value)}
                        />
                        <EvolutionInput
                            label="Email de la Tienda"
                            value={settings.commerce.email}
                            onChange={(e) => updateCommerce('email', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const EvolutionAdmin = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const {
        activeModule,
        setActiveModule,
        selectionType,
        updateSelectionData,
        selectItem,
        clearSelection,
        setInspectorOpen,
    } = useEvolutionStore();
    const editor = useEditorState(user);
    const usersManager = useUsersManager();
    const offersManager = useOffersManager();
    const tenantsManager = useTenantsManager();
    const integrationManager = useIntegrationManager();
    const notificationsManager = useNotificationsManager();
    const catalog = useCatalogManager({
        setProducts: editor.setProducts,
        categories: editor.categories,
        setCategories: editor.setCategories,
        brands: editor.brands,
        setBrands: editor.setBrands
    });

    useEffect(() => {
        if (activeModule === 'users' || activeModule === 'customers') {
            usersManager.loadUsers();
            usersManager.loadPriceLists();
            offersManager.loadOffers();
        }
    }, [
        activeModule,
        usersManager.usersPage,
        usersManager.loadPriceLists,
        usersManager.loadUsers,
        offersManager.loadOffers,
    ]);

    useEffect(() => {
        if (activeModule === 'pricing') {
            offersManager.loadOffers();
            if (!usersManager.usersList.length) {
                usersManager.loadUsers(1);
            }
        }
    }, [
        activeModule,
        offersManager.loadOffers,
        usersManager.loadUsers,
        usersManager.usersList.length,
    ]);

    useEffect(() => {
        if (activeModule === 'tenants') {
            tenantsManager.loadTenants();
        }
    }, [activeModule, tenantsManager.loadTenants]);

    const searchItems = useMemo(() => {
        const moduleItems = [
            {
                id: 'module-dashboard',
                kind: 'module',
                label: 'Dashboard',
                description: 'Resumen general del panel',
                keywords: 'inicio dashboard resumen panel',
                onSelect: () => setActiveModule('dashboard'),
            },
            {
                id: 'module-home',
                kind: 'module',
                label: 'Inicio',
                description: 'Editar pagina principal',
                keywords: 'home portada inicio',
                onSelect: () => setActiveModule('home'),
            },
            {
                id: 'module-catalog',
                kind: 'module',
                label: 'Catalogo',
                description: 'Gestion de productos',
                keywords: 'catalogo productos inventario',
                onSelect: () => setActiveModule('catalog'),
            },
            {
                id: 'module-categories',
                kind: 'module',
                label: 'Categorias y marcas',
                description: 'Organiza categorias y marcas',
                keywords: 'categorias marcas filtros',
                onSelect: () => setActiveModule('categories'),
            },
            {
                id: 'module-notifications',
                kind: 'module',
                label: 'Notificaciones',
                description: 'Centro de aprobaciones y pagos pendientes',
                keywords: 'notificaciones campana pendientes pagos aprobaciones',
                onSelect: () => setActiveModule('notifications'),
            },
            {
                id: 'module-users',
                kind: 'module',
                label: 'Usuarios',
                description: 'Gestion de clientes y permisos',
                keywords: 'usuarios clientes aprobacion mayorista',
                onSelect: () => setActiveModule('users'),
            },
            {
                id: 'module-checkout',
                kind: 'module',
                label: 'Checkout',
                description: 'Cobros, mensajes e impuestos',
                keywords: 'checkout pagos impuestos transferencia',
                onSelect: () => setActiveModule('checkout'),
            },
            {
                id: 'module-shipping',
                kind: 'module',
                label: 'Envios',
                description: 'Zonas, radios y sucursales',
                keywords: 'envios zonas sucursales delivery mapa',
                onSelect: () => setActiveModule('shipping'),
            },
            {
                id: 'module-integrations',
                kind: 'module',
                label: 'Integraciones',
                description: 'ERP, dominios y conectividad',
                keywords: 'integraciones erp dominios',
                onSelect: () => setActiveModule('integrations'),
            },
        ];

        const productItems = (Array.isArray(editor.products) ? editor.products : []).map((product) => ({
            id: `product-${product.id}`,
            kind: 'product',
            label: product.name || 'Producto',
            description: `Producto${product.sku ? ` · SKU ${product.sku}` : ''}${product.brand ? ` · ${product.brand}` : ''}`,
            keywords: `producto ${product.sku || ''} ${product.brand || ''}`,
            onSelect: () => {
                setActiveModule('catalog');
                catalog.handleEditProduct(product);
                setInspectorOpen(true);
            },
        }));

        const categoryItems = (Array.isArray(editor.categories) ? editor.categories : []).map((category) => ({
            id: `category-${category.id}`,
            kind: 'category',
            label: category.name || 'Categoria',
            description: category.parent_id ? 'Subcategoria' : 'Categoria raiz',
            keywords: `categoria ${category.slug || ''}`,
            onSelect: () => {
                setActiveModule('categories');
                selectItem(category.id, 'category', category);
                setInspectorOpen(true);
            },
        }));

        const brandItems = (Array.isArray(editor.brands) ? editor.brands : []).map((brandName) => ({
            id: `brand-${brandName}`,
            kind: 'brand',
            label: brandName,
            description: 'Marca',
            keywords: `marca ${brandName}`,
            onSelect: () => {
                setActiveModule('categories');
                selectItem(`brand-${brandName}`, 'brand', { id: `brand-${brandName}`, name: brandName });
                setInspectorOpen(true);
            },
        }));

        const userItems = (Array.isArray(notificationsManager.allUsers) ? notificationsManager.allUsers : []).map((userItem) => ({
            id: `user-${userItem.id}`,
            kind: 'user',
            label: userItem.email || 'Usuario',
            description: `Usuario · ${userItem.role || 'retail'} · ${userItem.status || 'active'}`,
            keywords: `usuario ${userItem.email || ''} ${userItem.role || ''} ${userItem.status || ''}`,
            onSelect: () => {
                setActiveModule('users');
                usersManager.setSelectedUser(userItem);
                setInspectorOpen(true);
            },
        }));

        const paymentItems = notificationsManager.paymentApprovals.map((item) => ({
            id: `payment-${item.orderId}`,
            kind: 'payment',
            label: item.title,
            description: `${item.subtitle} · ${item.customerEmail || 'Sin email'}`,
            keywords: `pago pedido ${item.customerEmail || ''} ${item.customerName || ''}`,
            onSelect: () => setActiveModule('notifications'),
        }));

        const alertItems = notificationsManager.pendingUsers.map((item) => ({
            id: `alert-user-${item.userId}`,
            kind: 'notification',
            label: item.title,
            description: item.subtitle,
            keywords: `notificacion pendiente usuario aprobacion ${item.email || ''}`,
            onSelect: () => {
                setActiveModule('users');
                const selectedUser = (notificationsManager.allUsers || []).find((entry) => entry.id === item.userId);
                if (selectedUser) {
                    usersManager.setSelectedUser(selectedUser);
                    setInspectorOpen(true);
                }
            },
        }));

        return [
            ...moduleItems,
            ...paymentItems,
            ...alertItems,
            ...userItems,
            ...productItems,
            ...categoryItems,
            ...brandItems,
        ];
    }, [
        catalog,
        editor.brands,
        editor.categories,
        editor.products,
        notificationsManager.allUsers,
        notificationsManager.paymentApprovals,
        notificationsManager.pendingUsers,
        selectItem,
        setActiveModule,
        setInspectorOpen,
        usersManager,
    ]);

    const handleDataChange = (id, nextData) => {
        updateSelectionData(nextData);

        if (selectionType === 'block') {
            const pageKey = activeModule === 'about' ? 'about' : 'home';
            editor.setPageSections(prev => ({
                ...prev,
                [pageKey]: (prev[pageKey] || []).map(s => s.id === id ? nextData : s)
            }));
        } else if (selectionType === 'product') {
            editor.setProducts(prev => prev.map(p => p.id === id ? nextData : p));
        } else if (selectionType === 'category') {
            editor.setCategories(prev => prev.map(c => c.id === id ? nextData : c));
        } else if (selectionType === 'brand') {
            editor.setBrands(prev => prev.map(b => b.id === id ? nextData : b));
        }
    };

    const handleAddItem = (type) => {
        if (type === 'product') {
            catalog.resetProductForm();
            clearSelection();
            setInspectorOpen(true);
            addToast('Completa el formulario del inspector para crear el producto', 'success');
            return;
        }

        const id = `new-${Date.now()}`;
        let newItem = { id, name: `Nuevo ${type.charAt(0).toUpperCase() + type.slice(1)}`, active: true };

        if (type === 'category') {
            editor.setCategories(prev => [newItem, ...prev]);
        } else if (type === 'brand') {
            editor.setBrands(prev => [newItem, ...prev]);
        }

        selectItem(id, type, newItem);
        addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} creado (borrador)`, 'success');
    };

    const handleReorder = (pageKey, nextSections) => {
        editor.setPageSections(prev => ({
            ...prev,
            [pageKey]: nextSections
        }));
    };

    const handlePageSectionsChange = (pageKey, nextSections) => {
        editor.setPageSections(prev => ({
            ...prev,
            [pageKey]: nextSections
        }));
    };

    const handleSave = async () => {
        const result =
            activeModule === 'checkout' || activeModule === 'shipping'
                ? await editor.saveCheckoutSettings()
                : await editor.handleSaveAll();

        if (result.success) {
            if (activeModule === 'checkout' || activeModule === 'shipping') {
                addToast(activeModule === 'shipping' ? 'Envios guardados' : 'Checkout guardado', 'success');
            } else {
                addToast(result.published ? 'Cambios guardados y publicados' : 'Guardado como borrador', 'success');
            }
        } else {
            addToast('Error al guardar los cambios', 'error');
        }
    };

    const renderContent = () => {
        if (editor.loading) {
            return (
                <div className="flex flex-col items-center justify-center p-20 text-zinc-500 animate-pulse">
                    <Activity size={32} weight="bold" className="mb-4 animate-spin" />
                    <span className="text-xs font-bold tracking-widest uppercase">Cargando Datos...</span>
                </div>
            );
        }

        switch (activeModule) {
            case 'home':
                return (
                    <PageSectionsEditor
                        pageKey="home"
                        sections={editor.pageSections?.home || []}
                        products={editor.products}
                        onChangeSections={(nextSections) => handlePageSectionsChange('home', nextSections)}
                        onSave={handleSave}
                        isSaving={editor.saving}
                    />
                );
            case 'about':
                return (
                    <PageSectionsEditor
                        pageKey="about"
                        sections={editor.pageSections?.about || []}
                        products={editor.products}
                        onChangeSections={(nextSections) => handlePageSectionsChange('about', nextSections)}
                        onSave={handleSave}
                        isSaving={editor.saving}
                    />
                );
            case 'appearance':
                return (
                    <AppearanceEditor
                        settings={editor.settings}
                        setSettings={editor.setSettings}
                        onSave={handleSave}
                        isSaving={editor.saving}
                    />
                );
            case 'catalog':
                return (
                    <CatalogEditor
                        products={editor.products}
                        onAddItem={handleAddItem}
                        onEditProduct={catalog.handleEditProduct}
                    />
                );
            case 'categories':
                return (
                    <CategoriesEditor
                        manager={catalog}
                        categories={editor.categories}
                        brands={editor.brands}
                    />
                );
            case 'pricing':
                return (
                    <PricingEditor
                        settings={editor.settings}
                        setSettings={editor.setSettings}
                        offersManager={offersManager}
                        usersManager={usersManager}
                        categories={editor.categories}
                        onSave={handleSave}
                        isSaving={editor.saving}
                    />
                );
            case 'customers':
            case 'users':
                return <UsersEditor manager={usersManager} offersManager={offersManager} />;
            case 'checkout':
                return (
                    <CheckoutEditor
                        settings={editor.settings}
                        setSettings={editor.setSettings}
                        onSave={handleSave}
                        isSaving={editor.saving}
                    />
                );
            case 'shipping':
                return (
                    <ShippingEditor
                        settings={editor.settings}
                        setSettings={editor.setSettings}
                        onSave={handleSave}
                        isSaving={editor.saving}
                    />
                );
            case 'integrations':
                return (
                    <IntegrationsEditor
                        manager={integrationManager}
                    />
                );
            case 'notifications':
                return (
                    <NotificationsEditor
                        manager={notificationsManager}
                    />
                );
            case 'tenants':
                return <TenantsEditor manager={tenantsManager} />;
            case 'legacy':
                return <LegacyAdminFrame />;
            case 'design_live':
                return (
                    <DesignEditor
                        pageSections={editor.pageSections}
                        settings={editor.settings}
                        onReorder={(nextSections) => handleReorder('home', nextSections)}
                    />
                );
            case 'catalog_live':
                return (
                    <CatalogEditor
                        products={editor.products}
                        categories={editor.categories}
                        brands={editor.brands}
                        onAddItem={handleAddItem}
                        onEditProduct={catalog.handleEditProduct}
                    />
                );
            case 'media':
                return (
                    <MediaLibrary />
                );
            case 'settings_live':
                return (
                    <SettingsEditor
                        settings={editor.settings}
                        setSettings={editor.setSettings}
                    />
                );
            case 'dashboard':
                return <Dashboard />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center shadow-glow">
                            <Activity size={40} weight="bold" className="text-evolution-indigo animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white tracking-tight capitalize">{activeModule}</h3>
                            <p className="text-sm text-zinc-500 font-medium max-w-xs mx-auto leading-relaxed">
                                Estamos migrando este módulo a la nueva arquitectura. Estará disponible en breve.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <EvolutionLayout
            settings={editor.settings}
            onDataChange={handleDataChange}
            onSave={handleSave}
            onAddItem={handleAddItem}
            isSaving={editor.saving}
            catalogContext={catalog}
            usersManager={usersManager}
            categories={editor.categories}
            brands={editor.brands}
            notificationsManager={notificationsManager}
            searchItems={searchItems}
        >
            {renderContent()}
        </EvolutionLayout>
    );
};

export default EvolutionAdmin;
