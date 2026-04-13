import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageBuilder from '../../components/PageBuilder';
import Footer from '../../components/layout/Footer';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { navigate } from '../../utils/navigation';
import { DEFAULT_ABOUT_SECTIONS, DEFAULT_HOME_SECTIONS } from '../../data/defaultSections';
import {
    HERO_COLOR_FIELDS,
    HERO_VARIANT_OPTIONS,
    createEmptyHeroSlide,
    getDefaultHeroSlides,
    getDefaultHeroStyles,
    normalizeHeroSlides,
    normalizeHeroStyles,
    normalizeHeroVariant,
} from '../../data/heroSliderTemplates';
import {
    FEATURED_COLOR_FIELDS,
    FEATURED_VARIANT_OPTIONS,
    getDefaultFeaturedStyles,
    normalizeFeaturedStyles,
    normalizeFeaturedVariant,
} from '../../data/featuredProductsTemplates';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

const EMPTY_OFFER_FORM = {
    name: '',
    label: 'Oferta',
    percent: 0,
    enabled: true,
    user_ids: [],
    category_ids: [],
};

const CHECKOUT_METHOD_OPTIONS = [
    { key: 'transfer', label: 'Transferencia' },
    { key: 'cash_on_pickup', label: 'Pago en local' },
];

const EMPTY_PRODUCT_FORM = () => ({
    name: '',
    sku: '',
    price: '',
    stock: 0,
    brand: '',
    description: '',
    images: [],
    is_featured: false,
    category_id: '',
    category_ids: [],
    features: [],
    specifications: {},
    collection: '',
    delivery_time: '',
    warranty: ''
});

const createLocalId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const EMPTY_BRANCH = () => ({
    id: createLocalId(),
    name: '',
    address: '',
            brands: [],
    hours: '',
    phone: '',
    pickup_fee: 0,
    enabled: true,
});

const EMPTY_SHIPPING_ZONE = () => ({
    id: createLocalId(),
    name: '',
    description: '',
    price: 0,
    enabled: true,
});

const HERO_BUTTON_X_LIMIT = 2400;
const HERO_BUTTON_Y_LIMIT = 1600;
const HERO_TEXT_X_LIMIT = 2400;
const HERO_TEXT_Y_LIMIT = 1600;
const SECTION_TEXT_PART_STYLE_MAP = {
    HeroSlider: {
        tag: 'tagOffset',
        title: 'titleOffset',
        subtitle: 'subtitleOffset',
    },
    AboutHero: {
        tagline: 'taglineOffset',
        title: 'titleOffset',
        description: 'descriptionOffset',
    },
};
const HERO_CLASSIC_COLOR_FIELDS = [
    { key: 'overlayColor', label: 'Overlay', defaultColor: '#000000' },
    { key: 'titleHexColor', label: 'Titulo', defaultColor: '#ffffff' },
    { key: 'subtitleHexColor', label: 'Subtitulo', defaultColor: '#ffffff' },
    { key: 'tagTextColor', label: 'Etiqueta (texto)', defaultColor: '#f27f0d' },
    { key: 'tagBgColor', label: 'Etiqueta (fondo)', defaultColor: '#2b1b08' },
    { key: 'tagBorderColor', label: 'Etiqueta (borde)', defaultColor: '#f27f0d' },
    { key: 'primaryButtonBgColor', label: 'Primario (fondo)', defaultColor: '#f27f0d' },
    { key: 'primaryButtonTextColor', label: 'Primario (texto)', defaultColor: '#ffffff' },
    { key: 'secondaryButtonBgColor', label: 'Secundario (fondo)', defaultColor: '#ffffff' },
    { key: 'secondaryButtonTextColor', label: 'Secundario (texto)', defaultColor: '#111111' },
    { key: 'secondaryButtonBorderColor', label: 'Secundario (borde)', defaultColor: '#ffffff' },
];
const clampHeroOffset = (value, limit) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(-limit, Math.min(limit, Math.round(numeric)));
};
const normalizeColorInputValue = (value, fallback = '#000000') => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (/^#[\da-f]{6}$/i.test(trimmed)) return trimmed;
    if (/^#[\da-f]{3}$/i.test(trimmed)) {
        const raw = trimmed.slice(1);
        return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
    }
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgbMatch) return fallback;
    const channelToHex = (channel) => {
        const clamped = Math.max(0, Math.min(255, Number(channel)));
        return clamped.toString(16).padStart(2, '0');
    };
    return `#${channelToHex(rgbMatch[1])}${channelToHex(rgbMatch[2])}${channelToHex(rgbMatch[3])}`;
};

export default function EditorPage() {
    const getInitialTab = () => {
        if (typeof window === 'undefined') return 'home';
        try {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            const allowedTabs = new Set([
                'home',
                'about',
                'appearance',
                'catalog',
                'pricing',
                'checkout',
                'users',
                'tenants',
            ]);
            return allowedTabs.has(tab) ? tab : 'home';
        } catch (err) {
            return 'home';
        }
    };
    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryParentId, setNewCategoryParentId] = useState('');
    const [newBrandName, setNewBrandName] = useState('');
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryDeletingId, setCategoryDeletingId] = useState(null);
    const [brandSaving, setBrandSaving] = useState(false);
    const [brandDeletingName, setBrandDeletingName] = useState('');
    const [stockEdits, setStockEdits] = useState({});
    const [stockSavingId, setStockSavingId] = useState(null);
    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [serviceIconUploading, setServiceIconUploading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [clearingFeatured, setClearingFeatured] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [newProduct, setNewProduct] = useState(() => EMPTY_PRODUCT_FORM());
    const [uploading, setUploading] = useState(false);
    const [heroUploading, setHeroUploading] = useState(false);
    const [settings, setSettings] = useState({
        branding: {
            name: '',
            logo_url: '',
            navbar: {
                links: [
                    { label: 'Inicio', href: '/' },
                    { label: 'Catálogo', href: '/catalog' }
                ]
            },
            footer: {
                description: '',
                whatsapp_enabled: true,
                socials: { facebook: '', instagram: '', whatsapp: '' },
                contact: { address: '', phone: '', email: '' },
                quickLinks: [
                    { label: 'Sobre nosotros', href: '#' },
                    { label: 'Contacto', href: '#' }
                ]
            }
        },
        theme: { primary: '#f97316', secondary: '#181411', font_family: 'Inter' },
        commerce: {
            whatsapp_number: '',
            email: '',
            address: '',
            brands: [],
            reviews_enabled: true,
            tax_rate: 0.21,
            payment_methods: ['transfer', 'cash_on_pickup'],
            default_delivery: 'zone:arg-general',
            shipping_zones: [
                {
                    id: 'arg-general',
                    name: 'Argentina',
                    description: 'Cobertura nacional',
                    price: 1500,
                    enabled: true,
                },
            ],
            branches: [
                {
                    id: 'branch-mdq',
                    name: 'Sucursal Mar del Plata',
                    address: 'Av. Independencia 1234, Mar del Plata',
                    hours: 'Lun a Sab 9:00-18:00',
                    phone: '',
                    pickup_fee: 0,
                    enabled: true,
                },
            ],
            bank_transfer: {
                cbu: '',
                alias: '',
                bank: '',
                holder: '',
            },
            price_adjustments: {
                retail_percent: 0,
                wholesale_percent: 0,
                promo_enabled: false,
                promo_percent: 0,
                promo_scope: 'both',
                promo_label: 'Oferta',
            },
        }
    });
    const [pageSections, setPageSections] = useState({
        home: DEFAULT_HOME_SECTIONS,
        about: DEFAULT_ABOUT_SECTIONS,
    });
    const [editingSection, setEditingSection] = useState(null);
    const [showAddSection, setShowAddSection] = useState(false);
    const [moveAnimations, setMoveAnimations] = useState({});
    const moveAnimationTimeout = useRef(null);
    const catalogEditorRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [tenants, setTenants] = useState([]);
    const [tenantsLoading, setTenantsLoading] = useState(false);
    const [tenantsError, setTenantsError] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [usersPage, setUsersPage] = useState(1);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState('');
    const [priceLists, setPriceLists] = useState([]);
    const [priceListsLoading, setPriceListsLoading] = useState(false);
    const [priceListsError, setPriceListsError] = useState('');
    const [userDrafts, setUserDrafts] = useState({});
    const [userSavingId, setUserSavingId] = useState(null);
    const [userDeletingId, setUserDeletingId] = useState(null);
    const [offers, setOffers] = useState([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [offersError, setOffersError] = useState('');
    const [offerForm, setOfferForm] = useState(EMPTY_OFFER_FORM);
    const [offerFormSaving, setOfferFormSaving] = useState(false);
    const [editingOfferId, setEditingOfferId] = useState(null);
    const [offerDeleteId, setOfferDeleteId] = useState(null);
    const USERS_LIMIT = 10;
    const [selectedUser, setSelectedUser] = useState(null);
    const [userOrders, setUserOrders] = useState([]);
    const [userOrdersLoading, setUserOrdersLoading] = useState(false);
    const [userOrdersError, setUserOrdersError] = useState('');
    const [orderUpdatingId, setOrderUpdatingId] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [userOrdersFilter, setUserOrdersFilter] = useState('all');
    const [clientPreviewMode, setClientPreviewMode] = useState(false);
    const { user } = useAuth();
    const { refreshTenantSettings } = useTenant();
    const sectionPageKey = activeTab === 'about' ? 'about' : 'home';
    const sections = pageSections[sectionPageKey] || [];
    const priceAdjustments = settings.commerce?.price_adjustments || {
        retail_percent: 0,
        wholesale_percent: 0,
        promo_enabled: false,
        promo_percent: 0,
        promo_scope: 'both',
        promo_label: 'Oferta',
    };
    const checkoutMethods = Array.isArray(settings.commerce?.payment_methods)
        ? settings.commerce.payment_methods
        : ['transfer', 'cash_on_pickup'];
    const shippingZones = Array.isArray(settings.commerce?.shipping_zones)
        ? settings.commerce.shipping_zones
        : [];
    const branches = Array.isArray(settings.commerce?.branches) ? settings.commerce.branches : [];
    const bankTransferSettings = settings.commerce?.bank_transfer || {};
    const usersTotalPages = Math.max(1, Math.ceil(usersTotal / USERS_LIMIT));
    const canPrevUsers = usersPage > 1;
    const canNextUsers = usersPage < usersTotalPages;
    const ORDER_STATUS_OPTIONS = [
        { value: 'draft', label: 'Borrador' },
        { value: 'pending_payment', label: 'Pendiente' },
        { value: 'processing', label: 'En proceso' },
        { value: 'paid', label: 'Pagado' },
        { value: 'unpaid', label: 'Impaga' },
        { value: 'submitted', label: 'Recibido' },
        { value: 'cancelled', label: 'Cancelado' },
    ];
    const USER_ROLE_OPTIONS = [
        { value: 'retail', label: 'Minorista' },
        { value: 'wholesale', label: 'Mayorista' },
        { value: 'tenant_admin', label: 'Admin' },
    ];
    const USER_STATUS_OPTIONS = [
        { value: 'pending', label: 'Pendiente' },
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
    ];
    const formatOrderTotal = (value, currency = 'ARS') => {
        const amount = Number(value || 0);
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
        } catch (err) {
            return `$${amount.toFixed(2)}`;
        }
    };
    const formatCustomerName = (customer = {}) => {
        return (
            customer.full_name ||
            customer.fullName ||
            customer.name ||
            customer.customer_name ||
            ''
        );
    };
    const formatCustomerPhone = (customer = {}) => {
        return customer.phone || customer.phone_number || customer.whatsapp || '';
    };
    const formatCustomerEmail = (customer = {}) => {
        return customer.email || '';
    };
    const formatCustomerAddress = (customer = {}) => {
        if (customer.fullAddress) return customer.fullAddress;
        if (customer.address) return customer.address;
        const shipping = customer.shipping || customer.shipping_address || {};
        const parts = [
            customer.line1 || shipping.line1 || customer.address_line1,
            customer.line2 || shipping.line2 || customer.address_line2,
            customer.city || shipping.city,
            customer.state || shipping.state,
            customer.zip || shipping.zip || customer.postal_code,
            customer.country || shipping.country,
        ].filter(Boolean);
        return parts.join(', ');
    };
    const formatDeliveryMethod = (customer = {}) => {
        if (customer.delivery_label) return customer.delivery_label;
        const method = customer.delivery_method || customer.deliveryMethod || '';
        if (method === 'home') return 'Entrega a domicilio';
        if (method === 'mdp') return 'Retiro: Mar del Plata';
        if (method === 'necochea') return 'Retiro: Necochea';
        if (method.startsWith('zone:')) return `Envio (${method.replace('zone:', '')})`;
        if (method.startsWith('branch:')) return `Retiro (${method.replace('branch:', '')})`;
        return method || '-';
    };
    const formatCheckoutModeLabel = (mode = '') => {
        const normalized = String(mode || '').toLowerCase();
        if (normalized === 'whatsapp') return 'WhatsApp';
        if (normalized === 'transfer') return 'Transferencia';
        if (normalized === 'stripe') return 'Pago online';
        if (normalized === 'cash_on_pickup') return 'Pago en local';
        return normalized || '-';
    };
    const formatPaymentDetail = (order) => {
        const customer = order?.customer || {};
        const method = (customer.payment_method || customer.payment || '').toString().toLowerCase();
        if (method === 'stripe') return 'Pago online';
        if (method === 'cash_on_pickup' || method === 'cash' || method === 'local') return 'Pago en local';
        if (order.checkout_mode === 'transfer') {
            return method.includes('efectivo') ? 'Transferencia / Efectivo' : 'Transferencia';
        }
        if (order.checkout_mode === 'whatsapp') {
            return method || 'WhatsApp (efectivo o transferencia)';
        }
        if (order.checkout_mode === 'stripe') {
            return 'Pago online';
        }
        if (order.checkout_mode === 'cash_on_pickup') {
            return 'Pago en local';
        }
        return method || order.checkout_mode || '-';
    };
    const getPaymentProof = (customer = {}) => {
        return (
            customer.payment_proof_url ||
            customer.paymentProofUrl ||
            customer.receipt_url ||
            customer.receiptUrl ||
            customer.proof_url ||
            customer.proofUrl ||
            customer.payment_proof ||
            ''
        );
    };
    const isImageUrl = (value) => {
        if (!value) return false;
        const clean = value.split('?')[0];
        return /\.(png|jpe?g|gif|webp)$/i.test(clean);
    };
    const isPdfUrl = (value) => {
        if (!value) return false;
        const clean = value.split('?')[0];
        return /\.pdf$/i.test(clean);
    };
    const getProductPreviewImage = (product) => {
        const data = product?.data || {};
        const rawDataImages = Array.isArray(data.images) ? data.images : [];
        const rawDirectImages = Array.isArray(product?.images) ? product.images : [];
        const rawImages = [...rawDataImages, ...rawDirectImages];

        const primaryImage = rawImages.find((item) => {
            if (!item || typeof item !== 'object') return false;
            return item.primary && (item.url || item.src);
        });

        const firstImage = primaryImage || rawImages[0] || data.image || product?.image || '';
        if (typeof firstImage === 'string') return firstImage;
        if (firstImage && typeof firstImage === 'object') {
            return firstImage.url || firstImage.src || '';
        }
        return '';
    };
    const buildFeaturedPreviewProduct = (product) => {
        const priceValue = Number(product?.price || 0);
        const stockValue = Number(product?.stock ?? 0);
        const hasStock = Number.isFinite(stockValue) ? stockValue > 0 : true;

        return {
            id: product?.id,
            sku: product?.sku || product?.erp_id || '',
            name: product?.name || 'Producto',
            price: Number.isFinite(priceValue) ? priceValue : 0,
            image: getProductPreviewImage(product) || 'https://via.placeholder.com/600x600?text=Producto',
            alt: product?.name || 'Producto',
            stock: Number.isFinite(stockValue) ? stockValue : 0,
            badge: hasStock ? null : { text: 'Sin stock', className: 'bg-zinc-400' },
        };
    };
        const buildProductFormFromProduct = useCallback((product) => {
        const data = product?.data && typeof product.data === 'object' ? product.data : {};
        const rawImages = Array.isArray(data.images) ? data.images : [];
        const images = rawImages
            .map((item, index) => {
                if (typeof item === 'string') {
                    return { url: item, alt: product?.name || 'Producto', primary: index === 0 };
                }
                if (!item || typeof item !== 'object') return null;
                const url = item.url || item.src || '';
                if (!url) return null;
                return {
                    url,
                    alt: item.alt || product?.name || 'Producto',
                    primary: item.primary === true || index === 0,
                };
            })
            .filter(Boolean);

        if (images.length && !images.some((item) => item.primary)) {
            images[0] = { ...images[0], primary: true };
        }

        const categoryIds = Array.isArray(product?.category_ids)
            ? product.category_ids.filter(Boolean)
            : [];

        return {
            name: product?.name || '',
            sku: product?.sku || '',
            price: product?.price ?? '',
            stock: Number(product?.stock ?? 0),
            brand: product?.brand || '',
            description: product?.description || '',
            images,
            is_featured: Boolean(product?.is_featured),
            category_id: categoryIds[0] || '',
            category_ids: categoryIds,
            features: Array.isArray(data.features) ? data.features : [],
            specifications: data.specifications && typeof data.specifications === 'object' ? data.specifications : {},
            collection: data.collection || '',
            delivery_time: data.delivery_time || '',
            warranty: data.warranty || '',
        };
    }, []);

    const resetProductForm = useCallback(() => {
        setEditingProductId(null);
        setNewProduct(EMPTY_PRODUCT_FORM());
    }, []);

const setSections = (nextValue) => {
        setPageSections((prev) => {
            const current = prev[sectionPageKey] || [];
            const resolved = typeof nextValue === 'function' ? nextValue(current) : nextValue;
            return { ...prev, [sectionPageKey]: resolved };
        });
    };
    const updatePriceAdjustments = (patch) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                price_adjustments: {
                    ...(prev.commerce?.price_adjustments || {}),
                    ...patch,
                },
            },
        }));
    };
    const toggleCheckoutMethod = (method) => {
        if (!CHECKOUT_METHOD_OPTIONS.some((opt) => opt.key === method)) return;
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.payment_methods)
                ? prev.commerce.payment_methods
                : [];
            const exists = current.includes(method);
            if (exists && current.length <= 1) {
                return prev;
            }
            const next = exists ? current.filter((item) => item !== method) : [...current, method];
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    payment_methods: next,
                },
            };
        });
    };
    const updateCommerceField = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                [field]: value,
            },
        }));
    };
    const updateBankTransferField = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                bank_transfer: {
                    ...(prev.commerce?.bank_transfer || {}),
                    [field]: value,
                },
            },
        }));
    };
    const addShippingZone = () => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                shipping_zones: [...(Array.isArray(prev.commerce?.shipping_zones) ? prev.commerce.shipping_zones : []), EMPTY_SHIPPING_ZONE()],
            },
        }));
    };
    const updateShippingZone = (index, field, value) => {
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.shipping_zones) ? [...prev.commerce.shipping_zones] : [];
            if (!current[index]) return prev;
            current[index] = { ...current[index], [field]: value };
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    shipping_zones: current,
                },
            };
        });
    };
    const removeShippingZone = (index) => {
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.shipping_zones) ? [...prev.commerce.shipping_zones] : [];
            if (!current[index]) return prev;
            current.splice(index, 1);
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    shipping_zones: current,
                },
            };
        });
    };
    const addBranch = () => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                branches: [...(Array.isArray(prev.commerce?.branches) ? prev.commerce.branches : []), EMPTY_BRANCH()],
            },
        }));
    };
    const updateBranch = (index, field, value) => {
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.branches) ? [...prev.commerce.branches] : [];
            if (!current[index]) return prev;
            current[index] = { ...current[index], [field]: value };
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    branches: current,
                },
            };
        });
    };
    const removeBranch = (index) => {
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.branches) ? [...prev.commerce.branches] : [];
            if (!current[index]) return prev;
            current.splice(index, 1);
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    branches: current,
                },
            };
        });
    };

    const showSuccess = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };
    const showRefreshHint = (baseMessage) => {
        showSuccess(`${baseMessage}. Si no lo ves en la tienda, recarga la pagina del cliente.`);
    };

    const getUserDraft = useCallback((item) => {
        if (!item?.id) return null;
        return userDrafts[item.id] || {
            role: item.role || 'retail',
            status: item.status || 'active',
            price_list_id: item.price_list_id || 'auto',
        };
    }, [userDrafts]);

    const hasUserDraftChanges = useCallback((item) => {
        const draft = getUserDraft(item);
        if (!draft || !item) return false;
        const roleChanged = (draft.role || 'retail') !== (item.role || 'retail');
        const statusChanged = (draft.status || 'active') !== (item.status || 'active');
        const currentPriceList = item.price_list_id || 'auto';
        const draftPriceList = draft.price_list_id || 'auto';
        const priceListChanged = draftPriceList !== currentPriceList;
        return roleChanged || statusChanged || priceListChanged;
    }, [getUserDraft]);
    const offerUsers = usersList;
    const normalizeOffer = useCallback((raw = {}) => ({
        id: raw.id || '',
        name: raw.name || '',
        label: raw.label || 'Oferta',
        percent: Number(raw.percent || 0),
        enabled: raw.enabled !== false,
        user_ids: Array.isArray(raw.user_ids) ? raw.user_ids.filter(Boolean) : [],
        category_ids: Array.isArray(raw.category_ids) ? raw.category_ids.filter(Boolean) : [],
    }), []);
    const resetOfferForm = useCallback(() => {
        setEditingOfferId(null);
        setOfferForm(EMPTY_OFFER_FORM);
    }, []);
    const loadOffers = useCallback(async () => {
        setOffersLoading(true);
        setOffersError('');
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            };
            const res = await fetch(`${getApiBase()}/tenant/offers`, { headers });
            if (!res.ok) {
                if (res.status === 404) {
                    setOffers([]);
                    setOffersError('Modulo de ofertas no disponible en backend.');
                    return;
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudieron cargar las ofertas');
            }
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
            setOffers(items.map(normalizeOffer));
        } catch (err) {
            console.error('Failed to load offers', err);
            setOffers([]);
            setOffersError('No se pudieron cargar las ofertas.');
        } finally {
            setOffersLoading(false);
        }
    }, [normalizeOffer]);
    const toggleOfferUser = useCallback((userId) => {
        setOfferForm((prev) => {
            const current = Array.isArray(prev.user_ids) ? prev.user_ids : [];
            const next = current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId];
            return { ...prev, user_ids: next };
        });
    }, []);
    const editOffer = useCallback((offerItem) => {
        const next = normalizeOffer(offerItem);
        setEditingOfferId(next.id || null);
        setOfferForm({
            name: next.name,
            label: next.label,
            percent: next.percent,
            enabled: next.enabled,
            user_ids: next.user_ids,
            category_ids: next.category_ids,
        });
    }, [normalizeOffer]);
    const submitOffer = useCallback(async () => {
        const name = String(offerForm?.name || '').trim();
        const percent = Number(offerForm?.percent || 0);
        if (!name) {
            alert('Ingresá un nombre para la oferta.');
            return;
        }
        if (!Number.isFinite(percent) || percent <= 0) {
            alert('Ingresá un porcentaje mayor a 0.');
            return;
        }

        setOfferFormSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            };
            const payload = {
                name,
                label: String(offerForm?.label || 'Oferta').trim() || 'Oferta',
                percent,
                enabled: !!offerForm?.enabled,
                user_ids: Array.isArray(offerForm?.user_ids) ? offerForm.user_ids : [],
                category_ids: Array.isArray(offerForm?.category_ids) ? offerForm.category_ids : [],
            };
            const isEdit = !!editingOfferId;
            const url = isEdit
                ? `${getApiBase()}/tenant/offers/${editingOfferId}`
                : `${getApiBase()}/tenant/offers`;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('El backend no tiene habilitado /tenant/offers.');
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudo guardar la oferta');
            }
            await loadOffers();
            resetOfferForm();
            showSuccess(isEdit ? 'Oferta actualizada' : 'Oferta creada');
        } catch (err) {
            console.error('Failed to save offer', err);
            alert(err.message || 'No se pudo guardar la oferta');
        } finally {
            setOfferFormSaving(false);
        }
    }, [editingOfferId, loadOffers, offerForm, resetOfferForm]);
    const removeOffer = useCallback(async (offerId) => {
        if (!offerId) return;
        if (!window.confirm('¿Eliminar esta oferta?')) return;
        setOfferDeleteId(offerId);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            };
            const res = await fetch(`${getApiBase()}/tenant/offers/${offerId}`, {
                method: 'DELETE',
                headers,
            });
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('El backend no tiene habilitado /tenant/offers.');
                }
                const msg = await res.text();
                throw new Error(msg || 'No se pudo eliminar la oferta');
            }
            await loadOffers();
            if (editingOfferId === offerId) {
                resetOfferForm();
            }
            showSuccess('Oferta eliminada');
        } catch (err) {
            console.error('Failed to delete offer', err);
            alert(err.message || 'No se pudo eliminar la oferta');
        } finally {
            setOfferDeleteId(null);
        }
    }, [editingOfferId, loadOffers, resetOfferForm]);

    const loadTenants = useCallback(async () => {
        if (user?.role !== 'master_admin') {
            setTenants([]);
            setTenantsError('Solo el usuario master admin puede ver empresas.');
            return;
        }
        setTenantsLoading(true);
        setTenantsError('');
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };
            const res = await fetch(`${getApiBase()}/admin/tenants`, { headers });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar empresas');
            }
            const data = await res.json();
            setTenants(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error('Failed to load tenants', err);
            setTenantsError('No se pudieron cargar las empresas.');
        } finally {
            setTenantsLoading(false);
        }
    }, [user]);

    const loadUsers = useCallback(async (pageOverride) => {
        setUsersLoading(true);
        setUsersError('');
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Authorization': `Bearer ${token}`,
            };
            const pageToLoad = pageOverride ?? usersPage;
            const url = new URL(`${getApiBase()}/tenant/users`);
            url.searchParams.set('page', String(pageToLoad));
            url.searchParams.set('limit', String(USERS_LIMIT));
            const res = await fetch(url.toString(), { headers });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar usuarios');
            }
            const data = await res.json();
            setUsersList(Array.isArray(data.items) ? data.items : []);
            setUsersTotal(data.total || 0);
        } catch (err) {
            console.error('Failed to load users', err);
            setUsersError('No se pudieron cargar los usuarios.');
            setUsersList([]);
            setUsersTotal(0);
        } finally {
            setUsersLoading(false);
        }
    }, [USERS_LIMIT, usersPage]);

    const loadPriceLists = useCallback(async () => {
        setPriceListsLoading(true);
        setPriceListsError('');
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Authorization': `Bearer ${token}`,
            };
            const res = await fetch(`${getApiBase()}/tenant/price-lists`, { headers });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar listas de precios');
            }
            const data = await res.json();
            setPriceLists(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error('Failed to load price lists', err);
            setPriceLists([]);
            setPriceListsError('No se pudieron cargar las listas de precios.');
        } finally {
            setPriceListsLoading(false);
        }
    }, []);

    const patchUserMembership = useCallback(async (userId, payload) => {
        const token = localStorage.getItem('teflon_token');
        const headers = {
            ...getTenantHeaders(),
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
        const res = await fetch(`${getApiBase()}/tenant/users/${userId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'No se pudo actualizar el usuario');
        }
        const data = await res.json();
        return data?.user || null;
    }, []);

    const assignUserPriceList = useCallback(async (userId, priceListId) => {
        const token = localStorage.getItem('teflon_token');
        const headers = {
            ...getTenantHeaders(),
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
        const res = await fetch(`${getApiBase()}/tenant/users/${userId}/price-list`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                price_list_id: !priceListId || priceListId === 'auto' ? null : priceListId,
            }),
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'No se pudo asignar la lista de precios');
        }
        const data = await res.json();
        return data?.price_list || null;
    }, []);

    const deleteUserMembership = useCallback(async (userId) => {
        const token = localStorage.getItem('teflon_token');
        const headers = {
            ...getTenantHeaders(),
            'Authorization': `Bearer ${token}`,
        };
        const res = await fetch(`${getApiBase()}/tenant/users/${userId}`, {
            method: 'DELETE',
            headers,
        });
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            const fallback = await res.text().catch(() => '');
            throw new Error(body?.error || fallback || 'No se pudo eliminar el usuario');
        }
        return res.json();
    }, []);

    const saveUserSetup = useCallback(async (item) => {
        if (!item?.id) return;
        const draft = getUserDraft(item);
        if (!draft) return;
        const role = draft.role || 'retail';
        const status = draft.status || 'active';
        const selectedPriceList = draft.price_list_id || 'auto';
        const hasRoleOrStatusChanges =
            role !== (item.role || 'retail') ||
            status !== (item.status || 'active');
        const hasPriceListChanges =
            selectedPriceList !== (item.price_list_id || 'auto');
        if (!hasRoleOrStatusChanges && !hasPriceListChanges) {
            return;
        }

        setUserSavingId(item.id);
        try {
            let nextUser = item;
            if (hasRoleOrStatusChanges) {
                const patched = await patchUserMembership(item.id, { role, status });
                if (patched) {
                    nextUser = {
                        ...nextUser,
                        ...patched,
                    };
                } else {
                    nextUser = {
                        ...nextUser,
                        role,
                        status,
                    };
                }
            }

            if (hasPriceListChanges) {
                const assigned = await assignUserPriceList(item.id, selectedPriceList);
                nextUser = {
                    ...nextUser,
                    price_list_id: assigned?.id || null,
                    price_list_name: assigned?.name || null,
                    price_list_type: assigned?.type || null,
                };
            }

            setUsersList((prev) =>
                prev.map((current) => (current.id === item.id ? nextUser : current))
            );
            setSelectedUser((prev) => (prev?.id === item.id ? nextUser : prev));
            setUserDrafts((prev) => ({
                ...prev,
                [item.id]: {
                    role: nextUser.role || role,
                    status: nextUser.status || status,
                    price_list_id: nextUser.price_list_id || 'auto',
                },
            }));
            showSuccess('Usuario actualizado');
        } catch (err) {
            console.error('Failed to update user setup', err);
            alert('No se pudo guardar la configuracion del usuario');
        } finally {
            setUserSavingId(null);
        }
    }, [assignUserPriceList, getUserDraft, patchUserMembership]);

    const approveWholesaleUser = useCallback(async (item) => {
        if (!item?.id) return;
        setUserSavingId(item.id);
        try {
            const patched = await patchUserMembership(item.id, {
                role: 'wholesale',
                status: 'active',
            });
            const nextUser = patched
                ? { ...item, ...patched }
                : { ...item, role: 'wholesale', status: 'active' };
            setUsersList((prev) =>
                prev.map((current) => (current.id === item.id ? nextUser : current))
            );
            setSelectedUser((prev) => (prev?.id === item.id ? nextUser : prev));
            setUserDrafts((prev) => ({
                ...prev,
                [item.id]: {
                    role: nextUser.role || 'wholesale',
                    status: nextUser.status || 'active',
                    price_list_id: nextUser.price_list_id || 'auto',
                },
            }));
            showSuccess('Mayorista aprobado');
        } catch (err) {
            console.error('Failed to approve wholesale user', err);
            alert('No se pudo aprobar el mayorista');
        } finally {
            setUserSavingId(null);
        }
    }, [patchUserMembership]);

    const removeUser = useCallback(async (item) => {
        if (!item?.id) return;
        const confirmed = window.confirm(`Se eliminara el usuario ${item.email}. Esta accion no se puede deshacer.`);
        if (!confirmed) return;

        setUserDeletingId(item.id);
        try {
            await deleteUserMembership(item.id);
            setUsersList((prev) => prev.filter((current) => current.id !== item.id));
            setUsersTotal((prev) => Math.max(0, prev - 1));
            setUserDrafts((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
            if (selectedUser?.id === item.id) {
                setSelectedUser(null);
                setUserOrders([]);
                setUserOrdersError('');
            }

            showSuccess('Usuario eliminado');

            if (usersList.length === 1 && usersPage > 1) {
                setUsersPage((prev) => Math.max(prev - 1, 1));
            } else {
                loadUsers();
            }
        } catch (err) {
            console.error('Failed to remove user', err);
            const code = String(err?.message || '');
            if (code.includes('cannot_delete_current_user')) {
                alert('No puedes eliminar tu propio usuario.');
                return;
            }
            if (code.includes('cannot_delete_master_admin')) {
                alert('No puedes eliminar un usuario master admin.');
                return;
            }
            alert('No se pudo eliminar el usuario');
        } finally {
            setUserDeletingId(null);
        }
    }, [deleteUserMembership, loadUsers, selectedUser, usersList.length, usersPage]);

    const loadUserOrders = useCallback(async (userId) => {
        if (!userId) return;
        setUserOrdersLoading(true);
        setUserOrdersError('');
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Authorization': `Bearer ${token}`,
            };
            const url = new URL(`${getApiBase()}/api/admin/orders`);
            url.searchParams.set('user_id', userId);
            const res = await fetch(url.toString(), { headers });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar pedidos');
            }
            const data = await res.json();
            setUserOrders(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error('Failed to load user orders', err);
            setUserOrdersError('No se pudieron cargar las compras del usuario.');
            setUserOrders([]);
        } finally {
            setUserOrdersLoading(false);
        }
    }, []);

    const updateOrderStatus = useCallback(async (orderId, nextStatus) => {
        if (!orderId || !nextStatus) return;
        setOrderUpdatingId(orderId);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };
            const res = await fetch(`${getApiBase()}/api/admin/orders/${orderId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: nextStatus }),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo actualizar el estado');
            }
            const data = await res.json();
            if (data?.order?.status) {
                setUserOrders((prev) => prev.map((order) =>
                    order.id === orderId ? { ...order, status: data.order.status } : order
                ));
                showSuccess('Estado actualizado');
            }
        } catch (err) {
            console.error('Failed to update order status', err);
            alert('No se pudo actualizar el estado');
        } finally {
            setOrderUpdatingId(null);
        }
    }, []);

    useEffect(() => () => {
        if (moveAnimationTimeout.current) {
            clearTimeout(moveAnimationTimeout.current);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'tenants') {
            loadTenants();
        }
    }, [activeTab, loadTenants]);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
            loadPriceLists();
        }
    }, [activeTab, usersPage, loadUsers, loadPriceLists]);

    useEffect(() => {
        if (activeTab === 'pricing') {
            loadOffers();
            if (!usersList.length) {
                loadUsers(1);
            }
        }
    }, [activeTab, loadOffers, loadUsers, usersList.length]);

    useEffect(() => {
        if (activeTab === 'users' && selectedUser?.id) {
            loadUserOrders(selectedUser.id);
        }
    }, [activeTab, selectedUser, loadUserOrders]);

    useEffect(() => {
        if (activeTab === 'users') {
            setUserOrdersFilter('all');
        }
    }, [activeTab, selectedUser]);

    useEffect(() => {
        if (!usersList.length) {
            setUserDrafts({});
            return;
        }
        setUserDrafts((prev) => {
            const next = {};
            usersList.forEach((item) => {
                const current = prev[item.id];
                next[item.id] = {
                    role: current?.role || item.role || 'retail',
                    status: current?.status || item.status || 'active',
                    price_list_id: current?.price_list_id || item.price_list_id || 'auto',
                };
            });
            return next;
        });
        setSelectedUser((prev) => {
            if (!prev?.id) return prev;
            const updated = usersList.find((item) => item.id === prev.id);
            return updated || prev;
        });
    }, [usersList]);

    const isImageIcon = (value) =>
        typeof value === 'string' &&
        (value.startsWith('http://') ||
            value.startsWith('https://') ||
            value.startsWith('/uploads/') ||
            value.startsWith('data:'));

    const loadCategories = useCallback(async () => {
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = { ...getTenantHeaders(), 'Authorization': `Bearer ${token}` };
            const res = await fetch(`${getApiBase()}/tenant/categories`, { headers });
            if (res.ok) {
                const data = await res.json();
                setCategories(data || []);
            }
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    }, []);

        const loadBrands = useCallback(async () => {
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = { ...getTenantHeaders(), 'Authorization': `Bearer ${token}` };
            const res = await fetch(`${getApiBase()}/tenant/brands`, { headers });
            if (res.ok) {
                const data = await res.json();
                setBrands(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to load brands', err);
        }
    }, []);
useEffect(() => {
        const loadData = async () => {
            try {
                const token = localStorage.getItem('teflon_token');
                const headers = { ...getTenantHeaders(), 'Authorization': `Bearer ${token}` };

                const [settingsRes, homeRes, aboutRes, productsRes] = await Promise.all([
                    fetch(`${getApiBase()}/tenant/settings`, { headers }),
                    fetch(`${getApiBase()}/tenant/pages/home`, { headers }),
                    fetch(`${getApiBase()}/tenant/pages/about`, { headers }),
                    fetch(`${getApiBase()}/tenant/products`, { headers })
                ]);

                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    const mergedSettings = {
                        ...settings,
                        ...data.settings,
                        branding: {
                            ...settings.branding,
                            ...(data.settings?.branding || {}),
                            navbar: {
                                ...settings.branding.navbar,
                                ...(data.settings?.branding?.navbar || {})
                            },
                            footer: {
                                ...settings.branding.footer,
                                ...(data.settings?.branding?.footer || {})
                            }
                        },
                        commerce: {
                            ...settings.commerce,
                            ...(data.settings?.commerce || {})
                        },
                    };
                    setSettings(mergedSettings);
                }
                let nextHomeSections = DEFAULT_HOME_SECTIONS;
                let nextAboutSections = DEFAULT_ABOUT_SECTIONS;

                if (homeRes.ok) {
                    const data = await homeRes.json();
                    if (Array.isArray(data.sections)) {
                        nextHomeSections = data.sections;
                    }
                }
                if (aboutRes.ok) {
                    const data = await aboutRes.json();
                    if (Array.isArray(data.sections)) {
                        nextAboutSections = data.sections;
                    }
                }

                setPageSections({
                    home: nextHomeSections,
                    about: nextAboutSections,
                });
                if (productsRes.ok) {
                    const data = await productsRes.json();
                    setProducts(data.items || []);
                }
            } catch (err) {
                console.error("Failed to load editor data", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        loadCategories();
        loadBrands();
    }, [loadCategories, loadBrands]);

    const categoryHierarchy = useMemo(() => {
        if (!Array.isArray(categories) || !categories.length) return [];

        const byId = new Map();
        categories.forEach((item) => {
            if (!item?.id || !item?.name) return;
            byId.set(item.id, {
                id: item.id,
                name: item.name,
                slug: item.slug || '',
                parent_id: item.parent_id || null,
                children: [],
            });
        });

        const roots = [];
        byId.forEach((node) => {
            if (node.parent_id && byId.has(node.parent_id)) {
                byId.get(node.parent_id).children.push(node);
            } else {
                roots.push(node);
            }
        });

        const sorter = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });
        roots.sort(sorter);
        roots.forEach((root) => root.children.sort(sorter));

        return roots.map((parent) => ({ parent, children: parent.children }));
    }, [categories]);

    const parentCategories = useMemo(
        () => categoryHierarchy.map((group) => group.parent),
        [categoryHierarchy]
    );

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const settingsRes = await fetch(`${getApiBase()}/tenant/settings`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(settings)
            });

            const savePage = async (slug, sectionsData) => {
                const saveRes = await fetch(`${getApiBase()}/tenant/pages/${slug}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ sections: sectionsData || [] })
                });
                if (!saveRes.ok) {
                    return { ok: false, published: false };
                }

                const publishRes = await fetch(`${getApiBase()}/tenant/pages/${slug}/publish`, {
                    method: 'POST',
                    headers
                });

                return { ok: true, published: publishRes.ok };
            };

            const [homeRes, aboutRes] = await Promise.all([
                savePage('home', pageSections.home),
                savePage('about', pageSections.about),
            ]);

            if (settingsRes.ok) {
                await refreshTenantSettings();
            }

            if (settingsRes.ok && homeRes.ok && aboutRes.ok) {
                if (homeRes.published && aboutRes.published) {
                    showRefreshHint('Cambios guardados y publicados con exito');
                } else {
                    showRefreshHint('Guardado como borrador (error al publicar)');
                }
            } else {
                alert('Error al guardar algunos cambios');
            }
        } catch (err) {
            console.error('Save all failed', err);
            alert('Error crítico al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSection = (type) => {
        const newSection = {
            id: crypto.randomUUID(),
            type,
            enabled: true,
            props: { styles: {} }
        };

        if (activeTab === 'about') {
            if (type === 'AboutHero') {
                newSection.props = DEFAULT_ABOUT_SECTIONS.find((section) => section.type === 'AboutHero')?.props || {};
            } else if (type === 'AboutMission') {
                newSection.props = DEFAULT_ABOUT_SECTIONS.find((section) => section.type === 'AboutMission')?.props || {};
            } else if (type === 'AboutStats') {
                newSection.props = DEFAULT_ABOUT_SECTIONS.find((section) => section.type === 'AboutStats')?.props || {};
            } else if (type === 'AboutValues') {
                newSection.props = DEFAULT_ABOUT_SECTIONS.find((section) => section.type === 'AboutValues')?.props || {};
            } else if (type === 'AboutTeam') {
                newSection.props = DEFAULT_ABOUT_SECTIONS.find((section) => section.type === 'AboutTeam')?.props || {};
            } else if (type === 'AboutCTA') {
                newSection.props = DEFAULT_ABOUT_SECTIONS.find((section) => section.type === 'AboutCTA')?.props || {};
            }
        } else {
            if (type === 'HeroSlider') {
                newSection.props = {
                    variant: 'classic',
                    title: 'Nuevo Hero',
                    subtitle: 'Descripcion aqui',
                    tag: 'Novedad',
                    primaryButton: { label: 'Ver mas', link: '/catalog' },
                    secondaryButton: { label: 'Ver catalogo', link: '/catalog' },
                    styles: { alignment: 'center', overlayOpacity: '0.6' }
                };
            } else if (type === 'Services') {
                newSection.props = {
                    title: 'Nuestros Servicios',
                    subtitle: 'Descripcion de servicios',
                    items: [
                        { icon: 'package', title: 'Envio Gratis', text: 'En compras mayores a $50.000' },
                        { icon: 'shield', title: 'Garantia', text: '6 meses de garantia oficial' }
                    ]
                };
            } else if (type === 'FeaturedProducts') {
                newSection.props = {
                    variant: 'classic',
                    title: 'Destacados',
                    subtitle: 'Lo mejor de nuestra tienda',
                    ctaLabel: 'Ver catalogo',
                    ctaLink: '/catalog',
                    styles: { alignment: 'items-end justify-between' }
                };
            }
        }

        setSections([...sections, newSection]);
        setShowAddSection(false);
        showSuccess('Sección añadida');
    };

    const handleDeleteSection = (index) => {
        if (!window.confirm('¿Borrar esta sección?')) return;
        const newSections = [...sections];
        newSections.splice(index, 1);
        setSections(newSections);
        setEditingSection(null);
        showSuccess('Sección eliminada');
    };

    const handleMoveSection = (index, direction) => {
        const newSections = [...sections];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sections.length) return;

        const movingId = newSections[index].id;
        const swapId = newSections[targetIndex].id;
        const temp = newSections[index];
        newSections[index] = newSections[targetIndex];
        newSections[targetIndex] = temp;
        setSections(newSections);
        setMoveAnimations({ [movingId]: direction, [swapId]: -direction });
        if (moveAnimationTimeout.current) {
            clearTimeout(moveAnimationTimeout.current);
        }
        moveAnimationTimeout.current = setTimeout(() => {
            setMoveAnimations({});
        }, 320);
    };

    const handleCreateCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        setCategorySaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const res = await fetch(`${getApiBase()}/tenant/categories`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name,
                    parent_id: newCategoryParentId || null,
                })
            });

            if (res.ok) {
                setNewCategoryName('');
                setNewCategoryParentId('');
                await loadCategories();
                showSuccess('Categoria creada con exito');
            } else {
                alert('Error al crear categoria');
            }
        } catch (err) {
            console.error('Failed to create category', err);
            alert('Error al crear categoria');
        } finally {
            setCategorySaving(false);
        }
    };
    const handleDeleteCategory = async (categoryId, categoryName) => {
        if (!categoryId) return;
        const label = categoryName || 'esta categoria';
        if (!window.confirm(`Eliminar ${label}?`)) return;

        setCategoryDeletingId(categoryId);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const res = await fetch(`${getApiBase()}/tenant/categories/${categoryId}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) {
                let message = 'No se pudo eliminar la categoria';
                const raw = await res.text();
                let payload = null;
                if (raw) {
                    try {
                        payload = JSON.parse(raw);
                    } catch {
                        payload = null;
                    }
                }

                if (payload?.error === 'category_has_children') {
                    message = payload?.message || 'Esta categoria tiene subcategorias. Elimina primero las subcategorias.';
                } else if (typeof payload?.error === 'string' && payload.error.trim()) {
                    message = payload.error;
                } else if (raw) {
                    message = raw;
                }

                throw new Error(message);
            }

            setCategories((prev) => prev.filter((item) => item.id !== categoryId));
            setNewCategoryParentId((prev) => (prev === categoryId ? '' : prev));
            setNewProduct((prev) => ({
                ...prev,
                category_ids: (prev.category_ids || []).filter((id) => id !== categoryId),
                category_id: prev.category_id === categoryId ? '' : prev.category_id,
            }));
            setOfferForm((prev) => ({
                ...prev,
                category_ids: (prev.category_ids || []).filter((id) => id !== categoryId),
            }));
            setOffers((prev) => prev.map((offerItem) => ({
                ...offerItem,
                category_ids: (offerItem.category_ids || []).filter((id) => id !== categoryId),
            })));
            showSuccess('Categoria eliminada');
        } catch (err) {
            console.error('Failed to delete category', err);
            alert(err?.message || 'Error al eliminar categoria');
        } finally {
            setCategoryDeletingId(null);
        }
    };

    const handleCreateBrand = async () => {
        const name = newBrandName.trim();
        if (!name) return;
        setBrandSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const res = await fetch(`${getApiBase()}/tenant/brands`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name,
                })
            });

            if (res.ok) {
                const data = await res.json();
                setBrands(Array.isArray(data.items) ? data.items : []);
                setNewBrandName('');
                showSuccess('Marca creada con exito');
            } else {
                alert('Error al crear marca');
            }
        } catch (err) {
            console.error('Failed to create brand', err);
            alert('Error al crear marca');
        } finally {
            setBrandSaving(false);
        }
    };

    const handleDeleteBrand = async (brandName) => {
        const value = String(brandName || '').trim();
        if (!value) return;
        if (!window.confirm(`Eliminar marca ${value}?`)) return;

        setBrandDeletingName(value);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const res = await fetch(`${getApiBase()}/tenant/brands/${encodeURIComponent(value)}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo eliminar la marca');
            }

            const data = await res.json();
            if (Array.isArray(data.items)) {
                setBrands(data.items);
            } else {
                setBrands((prev) => prev.filter((item) => item !== value));
            }
            setNewProduct((prev) => ({
                ...prev,
                brand: prev.brand === value ? '' : prev.brand,
            }));
            showSuccess('Marca eliminada');
        } catch (err) {
            console.error('Failed to delete brand', err);
            alert('Error al eliminar marca');
        } finally {
            setBrandDeletingName('');
        }
    };
    const toggleOfferCategorySelection = useCallback((categoryId) => {
        setOfferForm((prev) => {
            const current = Array.isArray(prev.category_ids) ? prev.category_ids : [];
            const next = current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId];
            return { ...prev, category_ids: next };
        });
    }, []);
    const toggleProductCategorySelection = useCallback((categoryId) => {
        setNewProduct((prev) => {
            const current = Array.isArray(prev.category_ids) ? prev.category_ids : [];
            const next = current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId];
            return {
                ...prev,
                category_ids: next,
                category_id: next[0] || '',
            };
        });
    }, []);

    const handleCreateProduct = async () => {
        if (!newProduct.name) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            const categoryIds = Array.from(new Set(
                (Array.isArray(newProduct.category_ids) ? newProduct.category_ids : [])
                    .filter(Boolean)
            ));

            const res = await fetch(`${getApiBase()}/tenant/products`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...newProduct,
                    category_id: categoryIds[0] || '',
                    category_ids: categoryIds,
                    stock: Number(newProduct.stock || 0),
                })
            });

            if (res.ok) {
                const created = await res.json();
                setProducts((prev) => [
                    ...prev,
                    {
                        ...newProduct,
                        id: created.id,
                        stock: Number(newProduct.stock || 0),
                        is_featured: newProduct.is_featured,
                        category_ids: categoryIds,
                        category_id: categoryIds[0] || '',
                    },
                ]);
                resetProductForm();
                showRefreshHint('Producto creado con exito');
            }
        } catch (err) {
            console.error('Failed to create product', err);
        } finally {
            setSaving(false);
        }
    };

    const handleEditProduct = useCallback((product) => {
        if (!product?.id) return;
        setEditingProductId(product.id);
        setNewProduct(buildProductFormFromProduct(product));
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => {
                catalogEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }, [buildProductFormFromProduct]);

    const handleCancelEditProduct = useCallback(() => {
        resetProductForm();
    }, [resetProductForm]);

    const handleUpdateProduct = async () => {
        if (!editingProductId) return;
        if (!newProduct.name) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const categoryIds = Array.from(new Set(
                (Array.isArray(newProduct.category_ids) ? newProduct.category_ids : [])
                    .filter(Boolean)
            ));

            const payload = {
                ...newProduct,
                category_id: categoryIds[0] || '',
                category_ids: categoryIds,
                stock: Number(newProduct.stock || 0),
            };

            const res = await fetch(`${getApiBase()}/tenant/products/${editingProductId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setProducts((prev) => prev.map((item) => {
                    if (item.id !== editingProductId) return item;
                    return {
                        ...item,
                        sku: payload.sku || null,
                        name: payload.name,
                        description: payload.description || null,
                        price: Number(payload.price || 0),
                        stock: Number(payload.stock || 0),
                        brand: payload.brand || null,
                        category_id: categoryIds[0] || '',
                        category_ids: categoryIds,
                        is_featured: Boolean(payload.is_featured),
                        data: {
                            ...(item.data || {}),
                            images: Array.isArray(payload.images) ? payload.images : [],
                            features: Array.isArray(payload.features) ? payload.features : [],
                            specifications: payload.specifications && typeof payload.specifications === 'object' ? payload.specifications : {},
                            collection: payload.collection || null,
                            delivery_time: payload.delivery_time || null,
                            warranty: payload.warranty || null,
                        },
                    };
                }));
                resetProductForm();
                showRefreshHint('Producto actualizado con exito');
            } else {
                const errorMsg = await res.text();
                alert(errorMsg || 'Error al actualizar producto');
            }
        } catch (err) {
            console.error('Failed to update product', err);
            alert('Error al actualizar producto');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleFeatured = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const res = await fetch(`${getApiBase()}/tenant/products/${id}/featured`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ featured: !currentStatus })
            });

            if (res.ok) {
                setProducts((prev) => prev.map(p => p.id === id ? { ...p, is_featured: !currentStatus } : p));
                showRefreshHint(`Producto ${!currentStatus ? 'destacado' : 'quitado de destacados'}`);
            }
        } catch (err) {
            console.error('Failed to toggle featured', err);
        }
    };

    const handleAddStock = async (id) => {
        const raw = stockEdits[id];
        if (raw === undefined || raw === null || String(raw).trim() === '') return;
        const delta = Number(raw);
        if (Number.isNaN(delta) || delta === 0) return;

        setStockSavingId(id);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const res = await fetch(`${getApiBase()}/tenant/products/${id}/stock`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ delta })
            });

            if (res.ok) {
                const data = await res.json();
                setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: data.stock } : p));
                setStockEdits(prev => ({ ...prev, [id]: '' }));
                showSuccess('Stock actualizado');
            } else {
                alert('Error al actualizar stock');
            }
        } catch (err) {
            console.error('Failed to update stock', err);
            alert('Error al actualizar stock');
        } finally {
            setStockSavingId(null);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Eliminar este producto?')) return;
        setDeleteLoadingId(id);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const res = await fetch(`${getApiBase()}/tenant/products/${id}`, {
                method: 'DELETE',
                headers
            });

            if (res.ok) {
                setProducts(prev => prev.filter(p => p.id !== id));
                if (editingProductId === id) {
                    resetProductForm();
                }
                showRefreshHint('Producto eliminado');
            } else {
                alert('Error al eliminar producto');
            }
        } catch (err) {
            console.error('Failed to delete product', err);
            alert('Error al eliminar producto');
        } finally {
            setDeleteLoadingId(null);
        }
    };

    const handleClearFeatured = async () => {
        if (!window.confirm('Quitar todos los destacados?')) return;
        setClearingFeatured(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const res = await fetch(`${getApiBase()}/tenant/products/featured/clear`, {
                method: 'PUT',
                headers
            });

            if (res.ok) {
                setProducts(prev => prev.map(p => ({ ...p, is_featured: false })));
                showRefreshHint('Destacados limpiados');
            } else {
                alert('Error al limpiar destacados');
            }
        } catch (err) {
            console.error('Failed to clear featured', err);
            alert('Error al limpiar destacados');
        } finally {
            setClearingFeatured(false);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                alert('No se pudo leer la imagen');
                return;
            }
            setNewProduct((prev) => {
                const currentImages = Array.isArray(prev.images) ? prev.images : [];
                return {
                    ...prev,
                    images: [
                        ...currentImages,
                        {
                            url: dataUrl,
                            alt: prev.name || 'Producto',
                            primary: currentImages.length === 0
                        }
                    ]
                };
            });
            showSuccess('Imagen cargada');
        } catch (err) {
            console.error('Image read failed', err);
            alert('Error al leer la imagen');
        } finally {
            setUploading(false);
            // Reset file input
            event.target.value = '';
        }
    };


    const handleHeroImageUpload = async (event, index) => {
        const file = event.target.files[0];
        if (!file) return;
        if (typeof index !== 'number') return;

        setHeroUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                alert('No se pudo leer la imagen');
                return;
            }
            const newSections = [...sections];
            const currentProps = newSections[index].props || {};
            newSections[index].props = { ...currentProps, image: dataUrl };
            setSections(newSections);
            showSuccess('Imagen cargada');
        } catch (err) {
            console.error('Image read failed', err);
            alert('Error al leer la imagen');
        } finally {
            setHeroUploading(false);
            event.target.value = '';
        }
    };
    const updateHeroVariant = (index, nextVariant) => {
        const normalizedVariant = normalizeHeroVariant(nextVariant);
        updateSectionProps(index, (currentProps) => {
            const currentVariant = normalizeHeroVariant(currentProps?.variant);
            if (normalizedVariant === currentVariant) return { variant: normalizedVariant };
            if (normalizedVariant === 'classic') {
                return { variant: 'classic' };
            }
            const hasSlides = Array.isArray(currentProps?.slides) && currentProps.slides.length > 0;
            return {
                variant: normalizedVariant,
                slides: hasSlides
                    ? normalizeHeroSlides(normalizedVariant, currentProps.slides)
                    : getDefaultHeroSlides(normalizedVariant),
                styles: normalizeHeroStyles(normalizedVariant, currentProps?.styles),
            };
        });
    };

    const updateHeroVariantStyle = (sectionIndex, key, value) => {
        updateSectionProps(sectionIndex, (currentProps) => {
            const variant = normalizeHeroVariant(currentProps?.variant);
            if (variant === 'classic') return {};
            const defaults = getDefaultHeroStyles(variant);
            if (!Object.prototype.hasOwnProperty.call(defaults, key)) return {};
            return {
                styles: {
                    ...(currentProps?.styles || {}),
                    [key]: value,
                },
            };
        });
    };
    const updateFeaturedVariant = (index, nextVariant) => {
        const normalizedVariant = normalizeFeaturedVariant(nextVariant);
        updateSectionProps(index, (currentProps) => {
            if (normalizedVariant === 'classic') {
                return { variant: 'classic' };
            }
            return {
                variant: normalizedVariant,
                styles: normalizeFeaturedStyles(normalizedVariant, currentProps?.styles),
            };
        });
    };

    const updateFeaturedVariantStyle = (sectionIndex, key, value) => {
        updateSectionProps(sectionIndex, (currentProps) => {
            const variant = normalizeFeaturedVariant(currentProps?.variant);
            if (variant === 'classic') return {};
            const defaults = getDefaultFeaturedStyles(variant);
            if (!Object.prototype.hasOwnProperty.call(defaults, key)) return {};
            return {
                styles: {
                    ...(currentProps?.styles || {}),
                    [key]: value,
                },
            };
        });
    };

    const updateHeroSlide = (sectionIndex, slideIndex, patch) => {
        updateSectionProps(sectionIndex, (currentProps) => {
            const variant = normalizeHeroVariant(currentProps?.variant);
            const currentSlides = normalizeHeroSlides(variant, currentProps?.slides);
            if (!currentSlides[slideIndex]) return {};
            currentSlides[slideIndex] = { ...currentSlides[slideIndex], ...patch };
            return { slides: currentSlides };
        });
    };

    const addHeroSlide = (sectionIndex) => {
        updateSectionProps(sectionIndex, (currentProps) => {
            const variant = normalizeHeroVariant(currentProps?.variant);
            if (variant === 'classic') return {};
            const currentSlides = normalizeHeroSlides(variant, currentProps?.slides);
            return { slides: [...currentSlides, createEmptyHeroSlide(variant)] };
        });
    };

    const removeHeroSlide = (sectionIndex, slideIndex) => {
        updateSectionProps(sectionIndex, (currentProps) => {
            const variant = normalizeHeroVariant(currentProps?.variant);
            if (variant === 'classic') return {};
            const currentSlides = normalizeHeroSlides(variant, currentProps?.slides);
            if (!currentSlides[slideIndex] || currentSlides.length <= 1) return {};
            const nextSlides = currentSlides.filter((_, idx) => idx !== slideIndex);
            return { slides: nextSlides };
        });
    };

    const handleHeroSlideImageUpload = async (event, sectionIndex, slideIndex) => {
        const file = event.target.files[0];
        if (!file) return;
        if (typeof sectionIndex !== 'number') return;
        if (typeof slideIndex !== 'number') return;

        setHeroUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                alert('No se pudo leer la imagen');
                return;
            }
            updateHeroSlide(sectionIndex, slideIndex, { image: dataUrl });
            showSuccess('Imagen del slide cargada');
        } catch (err) {
            console.error('Hero slide image read failed', err);
            alert('Error al leer la imagen del slide');
        } finally {
            setHeroUploading(false);
            event.target.value = '';
        }
    };

    function readImageAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    const handleSectionImageUpload = async (event, index, field) => {
        const file = event.target.files[0];
        if (!file) return;
        if (typeof index !== 'number') return;
        if (!field) return;

        setHeroUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                alert('No se pudo leer la imagen');
                return;
            }
            const newSections = [...sections];
            const currentProps = newSections[index].props || {};
            newSections[index].props = { ...currentProps, [field]: dataUrl };
            setSections(newSections);
            showSuccess('Imagen cargada');
        } catch (err) {
            console.error('Image read failed', err);
            alert('Error al leer la imagen');
        } finally {
            setHeroUploading(false);
            event.target.value = '';
        }
    };

    const handleServiceIconUpload = async (event, sectionIndex, itemIndex) => {
        const file = event.target.files[0];
        if (!file) return;
        if (typeof sectionIndex !== 'number') return;
        if (typeof itemIndex !== 'number') return;

        setServiceIconUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                alert('No se pudo leer el icono');
                return;
            }
            const newSections = [...sections];
            const currentProps = newSections[sectionIndex].props || {};
            const currentItems = Array.isArray(currentProps.items) ? [...currentProps.items] : [];
            const currentItem = currentItems[itemIndex] || {};
            currentItems[itemIndex] = { ...currentItem, icon: dataUrl };
            newSections[sectionIndex].props = { ...currentProps, items: currentItems };
            setSections(newSections);
            showSuccess('Icono cargado');
        } catch (err) {
            console.error('Image read failed', err);
            alert('Error al leer el icono');
        } finally {
            setServiceIconUploading(false);
            event.target.value = '';
        }
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLogoUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                alert('No se pudo leer el logo');
                return;
            }
            setSettings((prev) => ({
                ...prev,
                branding: {
                    ...prev.branding,
                    logo_url: dataUrl
                }
            }));
            showSuccess('Logo cargado');
        } catch (err) {
            console.error('Image read failed', err);
            alert('Error al leer el logo');
        } finally {
            setLogoUploading(false);
            event.target.value = '';
        }
    };

    const updateSectionProps = (index, nextProps) => {
        const newSections = [...sections];
        const currentProps = newSections[index].props || {};
        const resolved = typeof nextProps === 'function' ? nextProps(currentProps) : nextProps;
        newSections[index].props = { ...currentProps, ...resolved };
        setSections(newSections);
    };

    const updateSectionStyles = (index, nextStyles) => {
        updateSectionProps(index, (currentProps) => {
            const currentStyles = currentProps.styles || {};
            const resolved = typeof nextStyles === 'function' ? nextStyles(currentStyles) : nextStyles;
            return { styles: { ...currentStyles, ...resolved } };
        });
    };
    const getHeroButtonOffsets = (index) => {
        const styleData = sections[index]?.props?.styles || {};
        return {
            x: clampHeroOffset(styleData.buttonsOffsetX ?? 0, HERO_BUTTON_X_LIMIT),
            y: clampHeroOffset(styleData.buttonsOffsetY ?? 0, HERO_BUTTON_Y_LIMIT),
        };
    };
    const getHeroTextOffsets = (index) => {
        const styleData = sections[index]?.props?.styles || {};
        return {
            x: clampHeroOffset(styleData.textOffsetX ?? 0, HERO_TEXT_X_LIMIT),
            y: clampHeroOffset(styleData.textOffsetY ?? 0, HERO_TEXT_Y_LIMIT),
        };
    };
    const updateHeroButtonOffsets = (index, nextX, nextY) => {
        updateSectionStyles(index, {
            buttonsOffsetX: clampHeroOffset(nextX, HERO_BUTTON_X_LIMIT),
            buttonsOffsetY: clampHeroOffset(nextY, HERO_BUTTON_Y_LIMIT),
        });
    };
    const updateHeroTextOffsets = (index, nextX, nextY) => {
        updateSectionStyles(index, {
            textOffsetX: clampHeroOffset(nextX, HERO_TEXT_X_LIMIT),
            textOffsetY: clampHeroOffset(nextY, HERO_TEXT_Y_LIMIT),
        });
    };
    const updateSectionTextPartOffsets = (index, sectionType, part, nextX, nextY) => {
        const baseKey = SECTION_TEXT_PART_STYLE_MAP?.[sectionType]?.[part];
        if (!baseKey) return;
        updateSectionStyles(index, {
            [`${baseKey}X`]: clampHeroOffset(nextX, HERO_TEXT_X_LIMIT),
            [`${baseKey}Y`]: clampHeroOffset(nextY, HERO_TEXT_Y_LIMIT),
        });
    };
    const getOffsetsFromPadEvent = (event, limitX, limitY) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return {
            x: clampHeroOffset(event.clientX - centerX, limitX),
            y: clampHeroOffset(event.clientY - centerY, limitY),
        };
    };
    const handleHeroButtonsPadPointerDown = (event, sectionIndex) => {
        if (event.button !== undefined && event.button !== 0 && event.pointerType !== 'touch') return;
        const { x, y } = getOffsetsFromPadEvent(event, HERO_BUTTON_X_LIMIT, HERO_BUTTON_Y_LIMIT);
        updateHeroButtonOffsets(sectionIndex, x, y);
        if (typeof event.currentTarget.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    };
    const handleHeroButtonsPadPointerMove = (event, sectionIndex) => {
        const pointerActive = event.pointerType === 'touch' || event.buttons === 1;
        if (!pointerActive) return;
        const { x, y } = getOffsetsFromPadEvent(event, HERO_BUTTON_X_LIMIT, HERO_BUTTON_Y_LIMIT);
        updateHeroButtonOffsets(sectionIndex, x, y);
    };
    const handleHeroTextPadPointerDown = (event, sectionIndex) => {
        if (event.button !== undefined && event.button !== 0 && event.pointerType !== 'touch') return;
        const { x, y } = getOffsetsFromPadEvent(event, HERO_TEXT_X_LIMIT, HERO_TEXT_Y_LIMIT);
        updateHeroTextOffsets(sectionIndex, x, y);
        if (typeof event.currentTarget.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    };
    const handleHeroTextPadPointerMove = (event, sectionIndex) => {
        const pointerActive = event.pointerType === 'touch' || event.buttons === 1;
        if (!pointerActive) return;
        const { x, y } = getOffsetsFromPadEvent(event, HERO_TEXT_X_LIMIT, HERO_TEXT_Y_LIMIT);
        updateHeroTextOffsets(sectionIndex, x, y);
    };

    const handleSectionChange = (section) => {
        if (section === activeTab) return;
        if (clientPreviewMode && section !== 'home' && section !== 'about') {
            setClientPreviewMode(false);
        }
        setActiveTab(section);
        setEditingSection(null);
        setShowAddSection(false);
    };
    const enterClientPreviewMode = () => {
        if (activeTab === 'catalog') {
            navigate('/catalog');
            return;
        }
        if (activeTab !== 'home' && activeTab !== 'about') {
            setActiveTab('home');
        }
        setEditingSection(null);
        setShowAddSection(false);
        setClientPreviewMode(true);
    };
    const exitClientPreviewMode = () => {
        setClientPreviewMode(false);
    };
    const handleClientPreviewPage = (page) => {
        const nextPage = page === 'about' ? 'about' : 'home';
        setActiveTab(nextPage);
        setEditingSection(null);
        setShowAddSection(false);
    };
    const sidebarWidthClass = activeTab === 'catalog' ? 'w-[590px]' : 'w-[440px]';
    const editingHeroVariant = Number.isInteger(editingSection?.index) && editingSection?.type === 'HeroSlider'
        ? normalizeHeroVariant(sections[editingSection.index]?.props?.variant)
        : 'classic';
    const isHeroClassicEditing = editingSection?.type === 'HeroSlider' && editingHeroVariant === 'classic';
    const isDirectCanvasEdit = Boolean(
        (activeTab === 'home' || activeTab === 'about') &&
        Number.isInteger(editingSection?.index) &&
        (isHeroClassicEditing || editingSection?.type === 'AboutHero')
    );
    const previewCanvasPointerClass = isDirectCanvasEdit ? 'pointer-events-auto' : 'pointer-events-none';
    const featuredPreviewProducts = products
        .filter((product) => Boolean(product?.is_featured))
        .slice(0, 8)
        .map(buildFeaturedPreviewProduct);
    const previewSections = sections
        .map((section, index) => {
            if (!section?.enabled) return null;
            const baseSection =
                section.type === 'FeaturedProducts'
                    ? {
                        ...section,
                        props: {
                            ...(section.props || {}),
                            products: featuredPreviewProducts,
                        },
                    }
                    : section;
            if (!isDirectCanvasEdit || index !== editingSection.index) {
                return baseSection;
            }
            const currentProps = baseSection.props || {};
            if (baseSection.type !== 'HeroSlider' && baseSection.type !== 'AboutHero') {
                return baseSection;
            }
            if (baseSection.type === 'HeroSlider' && normalizeHeroVariant(currentProps?.variant) !== 'classic') {
                return baseSection;
            }
            return {
                ...baseSection,
                props: {
                    ...currentProps,
                    editor: {
                        enabled: true,
                        textOffsetLimit: { x: HERO_TEXT_X_LIMIT, y: HERO_TEXT_Y_LIMIT },
                        buttonOffsetLimit: { x: HERO_BUTTON_X_LIMIT, y: HERO_BUTTON_Y_LIMIT },
                        onTextOffsetChange: (nextX, nextY) => updateHeroTextOffsets(index, nextX, nextY),
                        onButtonsOffsetChange: (nextX, nextY) => updateHeroButtonOffsets(index, nextX, nextY),
                        onTextPartOffsetChange: (part, nextX, nextY) =>
                            updateSectionTextPartOffsets(index, baseSection.type, part, nextX, nextY),
                    },
                },
            };
        })
        .filter(Boolean);
    const effectivePreviewPointerClass = clientPreviewMode ? 'pointer-events-auto' : previewCanvasPointerClass;
    const editingHeroProps = Number.isInteger(editingSection?.index) && editingSection?.type === 'HeroSlider'
        ? sections[editingSection.index]?.props || {}
        : {};
    const editingHeroSlides = editingSection?.type === 'HeroSlider' && editingHeroVariant !== 'classic'
        ? normalizeHeroSlides(editingHeroVariant, editingHeroProps?.slides)
        : [];
    const editingHeroStyles = editingSection?.type === 'HeroSlider' && editingHeroVariant !== 'classic'
        ? normalizeHeroStyles(editingHeroVariant, editingHeroProps?.styles)
        : {};
    const editingHeroColorFields = editingSection?.type === 'HeroSlider' && editingHeroVariant !== 'classic'
        ? HERO_COLOR_FIELDS[editingHeroVariant] || []
        : [];
    const editingFeaturedVariant = Number.isInteger(editingSection?.index) && editingSection?.type === 'FeaturedProducts'
        ? normalizeFeaturedVariant(sections[editingSection.index]?.props?.variant)
        : 'classic';
    const editingFeaturedStyles = editingSection?.type === 'FeaturedProducts' && editingFeaturedVariant !== 'classic'
        ? normalizeFeaturedStyles(editingFeaturedVariant, sections[editingSection.index]?.props?.styles)
        : {};
    const editingFeaturedColorFields = editingSection?.type === 'FeaturedProducts' && editingFeaturedVariant !== 'classic'
        ? FEATURED_COLOR_FIELDS[editingFeaturedVariant] || []
        : [];

    if (loading) return <div className="p-10 text-center">Cargando editor...</div>;

    return (
        <AdminLayout
            activeSection={activeTab}
            onSectionChange={handleSectionChange}
            hideSidebar={clientPreviewMode}
            hideHeader
            contentClassName={clientPreviewMode ? 'bg-white dark:bg-[#120c08] p-0' : ''}
        >
            {/* Animated Toast Notification */}
            <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 ease-out ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-green-400">
                    <div className="bg-white/20 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                        <p className="font-black text-lg tracking-tight leading-none">¡Excelente!</p>
                        <p className="text-sm font-bold text-green-50 text-nowrap">{toast.message}</p>
                    </div>
                </div>
            </div>
            {clientPreviewMode ? (
                <>
                    <div className="fixed top-4 left-4 z-[9998] flex items-center gap-2 rounded-xl border border-[#e5e1de] bg-white/95 px-2 py-1 shadow-lg dark:border-[#3d2f21] dark:bg-[#1a130c]/95">
                        <button
                            type="button"
                            onClick={() => handleClientPreviewPage('home')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activeTab === 'home' ? 'bg-primary text-white' : 'text-[#8a7560] hover:text-primary hover:bg-primary/10'}`}
                        >
                            Inicio
                        </button>
                        <button
                            type="button"
                            onClick={() => handleClientPreviewPage('about')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activeTab === 'about' ? 'bg-primary text-white' : 'text-[#8a7560] hover:text-primary hover:bg-primary/10'}`}
                        >
                            Nosotros
                        </button>
                    </div>
                    <div className="fixed top-4 right-4 z-[9998]">
                        <button
                            type="button"
                            onClick={exitClientPreviewMode}
                            className="px-4 py-2 rounded-xl bg-[#181411] text-white text-[10px] font-black uppercase tracking-wider shadow-lg hover:bg-[#2a221d] transition-colors"
                        >
                            Salir vista cliente
                        </button>
                    </div>
                </>
            ) : null}

            <div className={`flex overflow-hidden ${clientPreviewMode ? 'h-full' : 'h-[calc(100vh-64px)]'}`}>
                {/* Sidebar */}
                {!clientPreviewMode ? (
                <aside className={`${sidebarWidthClass} bg-white dark:bg-[#1a130c] border-r border-[#e5e1de] dark:border-[#3d2f21] flex flex-col`}>
                    <div className="p-4 border-b border-[#e5e1de] dark:border-[#3d2f21] flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7560]">
                            {activeTab === 'appearance'
                                ? 'Apariencia'
                                : activeTab === 'tenants'
                                    ? 'Empresas'
                                    : activeTab === 'users'
                                        ? 'Usuarios'
                                        : activeTab === 'checkout'
                                            ? 'Carrito'
                                        : activeTab === 'pricing'
                                            ? 'Precios'
                                            : activeTab === 'catalog'
                                                ? 'Catalogo'
                                            : activeTab === 'about'
                                                ? 'Sobre nosotros'
                                                : 'Inicio'}
                        </p>
                        <button
                            type="button"
                            onClick={enterClientPreviewMode}
                            className="px-3 py-1.5 rounded-lg bg-[#181411] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#2a221d] transition-colors"
                        >
                            Vista cliente
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div key={activeTab} className="animate-in fade-in slide-in-from-right-2 duration-300">
                        {activeTab === 'appearance' ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#8a7560] mb-2">Apariencia</label>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 items-center px-2">
                                            <input
                                                type="color"
                                                value={settings.theme.primary}
                                                onChange={e => setSettings({ ...settings, theme: { ...settings.theme, primary: e.target.value } })}
                                                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Primario</span>
                                                <span className="text-[10px] font-black font-mono opacity-50 uppercase tracking-widest">{settings.theme.primary}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-center px-2">
                                            <input
                                                type="color"
                                                value={settings.theme.text || settings.theme.secondary || '#181411'}
                                                onChange={e => setSettings({ ...settings, theme: { ...settings.theme, text: e.target.value, secondary: e.target.value } })}
                                                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Texto</span>
                                                <span className="text-[10px] font-black font-mono opacity-50 uppercase tracking-widest">{settings.theme.text || settings.theme.secondary || '#181411'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[#e5e1de] dark:border-[#3d2f21]">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#8a7560] mb-2">Marca</label>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={settings.branding.name}
                                            placeholder="Nombre del sitio"
                                            onChange={e => setSettings({ ...settings, branding: { ...settings.branding, name: e.target.value } })}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                        />
                                        <div className="flex items-center gap-3">
                                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer w-fit">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                    disabled={logoUploading}
                                                />
                                                {logoUploading ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        <span>Subiendo...</span>
                                                    </>
                                                ) : (
                                                    <span>Subir logo</span>
                                                )}
                                            </label>
                                            {settings.branding.logo_url ? (
                                                <div className="w-10 h-10 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] overflow-hidden flex items-center justify-center">
                                                    <img src={settings.branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[#e5e1de] dark:border-[#3d2f21]">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#8a7560] mb-4">Pie de Página (Footer)</label>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black opacity-40 uppercase">Descripción</p>
                                            <textarea
                                                rows={3}
                                                value={settings.branding.footer?.description || ''}
                                                placeholder="Texto breve para el footer"
                                                onChange={e => setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, description: e.target.value } } })}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black opacity-40 uppercase">Redes</p>
                                            <input
                                                type="text"
                                                value={settings.branding.footer?.socials.instagram}
                                                placeholder="Instagram URL"
                                                onChange={e => setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, socials: { ...settings.branding.footer.socials, instagram: e.target.value } } } })}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                            />
                                            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <p className="text-[10px] font-bold text-[#181411] dark:text-white">Mostrar WhatsApp en footer</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setSettings({
                                                        ...settings,
                                                        branding: {
                                                            ...settings.branding,
                                                            footer: {
                                                                ...settings.branding.footer,
                                                                whatsapp_enabled: settings.branding.footer?.whatsapp_enabled === false ? true : false,
                                                            },
                                                        },
                                                    })}
                                                    className="text-primary"
                                                >
                                                    {settings.branding.footer?.whatsapp_enabled !== false ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"></rect><circle cx="16" cy="12" r="3" fill="currentColor"></circle></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>
                                                    )}
                                                </button>
                                            </div>
                                            {settings.branding.footer?.whatsapp_enabled !== false ? (
                                                <input
                                                    type="text"
                                                    value={settings.branding.footer?.socials.whatsapp}
                                                    placeholder="WhatsApp (ej: 54223...)"
                                                    onChange={e => setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, socials: { ...settings.branding.footer.socials, whatsapp: e.target.value } } } })}
                                                    className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                />
                                            ) : null}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black opacity-40 uppercase">Contacto</p>
                                            <input
                                                type="text"
                                                value={settings.branding.footer?.contact.address}
                                                placeholder="Dirección"
                                                onChange={e => setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, contact: { ...settings.branding.footer.contact, address: e.target.value } } } })}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                            />
                                            <input
                                                type="text"
                                                value={settings.branding.footer?.contact.phone}
                                                placeholder="Teléfono"
                                                onChange={e => setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, contact: { ...settings.branding.footer.contact, phone: e.target.value } } } })}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                            />
                                            <input
                                                type="email"
                                                value={settings.branding.footer?.contact.email}
                                                placeholder="Email"
                                                onChange={e => setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, contact: { ...settings.branding.footer.contact, email: e.target.value } } } })}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black opacity-40 uppercase">Enlaces Rápidos</p>
                                            <div className="space-y-2">
                                                {settings.branding.footer?.quickLinks?.map((link, idx) => (
                                                    <div key={idx} className="flex gap-2 relative group">
                                                        <input
                                                            type="text"
                                                            value={link.label}
                                                            placeholder="Etiqueta"
                                                            onChange={e => {
                                                                const newLinks = [...settings.branding.footer.quickLinks];
                                                                newLinks[idx].label = e.target.value;
                                                                setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, quickLinks: newLinks } } });
                                                            }}
                                                            className="flex-1 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 border border-[#e5e1de] dark:border-[#3d2f21] text-[10px]"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={link.href}
                                                            placeholder="Link"
                                                            onChange={e => {
                                                                const newLinks = [...settings.branding.footer.quickLinks];
                                                                newLinks[idx].href = e.target.value;
                                                                setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, quickLinks: newLinks } } });
                                                            }}
                                                            className="flex-1 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 border border-[#e5e1de] dark:border-[#3d2f21] text-[10px] font-mono"
                                                        />
                                                        <button onClick={() => {
                                                            const newLinks = settings.branding.footer.quickLinks.filter((_, i) => i !== idx);
                                                            setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, quickLinks: newLinks } } });
                                                        }} className="text-red-500 font-bold px-1 opacity-0 group-hover:opacity-100">×</button>
                                                    </div>
                                                ))}
                                                <button onClick={() => {
                                                    const newLinks = [...(settings.branding.footer?.quickLinks || []), { label: 'Nuevo link', href: '#' }];
                                                    setSettings({ ...settings, branding: { ...settings.branding, footer: { ...settings.branding.footer, quickLinks: newLinks } } });
                                                }} className="w-full py-1.5 border border-dashed border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[9px] font-bold text-[#8a7560]">+ Añadir enlace</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'pricing' ? (
                            <div className="space-y-6 animate-in fade-in duration-300 pb-10">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest mb-4">Ajustes por porcentaje</p>
                                    <div className="space-y-4 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Minorista</p>
                                                <p className="text-[10px] text-[#8a7560]">Ajuste sobre el precio base</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={priceAdjustments.retail_percent}
                                                    onChange={(e) => updatePriceAdjustments({ retail_percent: Number(e.target.value || 0) })}
                                                    className="w-20 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs font-mono text-right"
                                                />
                                                <span className="text-xs font-bold text-[#8a7560]">%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Mayorista</p>
                                                <p className="text-[10px] text-[#8a7560]">Ajuste sobre el precio base</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={priceAdjustments.wholesale_percent}
                                                    onChange={(e) => updatePriceAdjustments({ wholesale_percent: Number(e.target.value || 0) })}
                                                    className="w-20 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs font-mono text-right"
                                                />
                                                <span className="text-xs font-bold text-[#8a7560]">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest mb-4">Ofertas</p>
                                    <div className="space-y-4 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Activar oferta</p>
                                                <p className="text-[10px] text-[#8a7560]">Descuento global por porcentaje</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updatePriceAdjustments({ promo_enabled: !priceAdjustments.promo_enabled })}
                                                className="text-primary"
                                            >
                                                {priceAdjustments.promo_enabled ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"></rect><circle cx="16" cy="12" r="3" fill="currentColor"></circle></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Descuento</p>
                                                <p className="text-[10px] text-[#8a7560]">Porcentaje de oferta</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={priceAdjustments.promo_percent}
                                                    onChange={(e) => updatePriceAdjustments({ promo_percent: Number(e.target.value || 0) })}
                                                    className="w-20 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs font-mono text-right"
                                                />
                                                <span className="text-xs font-bold text-[#8a7560]">%</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Aplica a</label>
                                            <select
                                                value={priceAdjustments.promo_scope}
                                                onChange={(e) => updatePriceAdjustments({ promo_scope: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px] font-bold"
                                            >
                                                <option value="both">Minorista y mayorista</option>
                                                <option value="retail">Solo minorista</option>
                                                <option value="wholesale">Solo mayorista</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Etiqueta</label>
                                            <input
                                                type="text"
                                                value={priceAdjustments.promo_label}
                                                onChange={(e) => updatePriceAdjustments({ promo_label: e.target.value })}
                                                placeholder="Oferta"
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest mb-4">Reseñas</p>
                                    <div className="space-y-4 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Habilitar comentarios</p>
                                                <p className="text-[10px] text-[#8a7560]">Permite que los usuarios comenten en el detalle del producto.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSettings((prev) => ({
                                                    ...prev,
                                                    commerce: {
                                                        ...prev.commerce,
                                                        reviews_enabled: prev.commerce?.reviews_enabled === false ? true : false,
                                                    },
                                                }))}
                                                className="text-primary"
                                            >
                                                {settings.commerce?.reviews_enabled !== false ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"></rect><circle cx="16" cy="12" r="3" fill="currentColor"></circle></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest mb-4">Ofertas por clientes y categorias</p>
                                    <div className="space-y-4 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={offerForm.name}
                                                    onChange={(e) => setOfferForm((prev) => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Ej: Oferta Clientes VIP"
                                                    className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Etiqueta</label>
                                                <input
                                                    type="text"
                                                    list="offer-label-suggestions"
                                                    value={offerForm.label}
                                                    onChange={(e) => setOfferForm((prev) => ({ ...prev, label: e.target.value }))}
                                                    placeholder="Oferta"
                                                    className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <datalist id="offer-label-suggestions">
                                                    <option value="Oferta" />
                                                    {categories.map((categoryItem) => (
                                                        <option key={categoryItem.id} value={categoryItem.name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Descuento (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={offerForm.percent}
                                                    onChange={(e) => setOfferForm((prev) => ({ ...prev, percent: Number(e.target.value || 0) }))}
                                                    className="w-24 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs font-mono text-right"
                                                />
                                            </div>
                                            <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#8a7560]">
                                                <input
                                                    type="checkbox"
                                                    checked={offerForm.enabled}
                                                    onChange={(e) => setOfferForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                                                />
                                                Activa
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Usuarios objetivo (vacio = todos)</p>
                                                <div className="max-h-36 overflow-auto rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-2 space-y-1">
                                                    {offerUsers.length === 0 ? (
                                                        <p className="text-[10px] text-[#8a7560]">Sin usuarios para seleccionar.</p>
                                                    ) : offerUsers.map((userItem) => (
                                                        <label key={userItem.id} className="flex items-center gap-2 text-[10px] text-[#181411] dark:text-white">
                                                            <input
                                                                type="checkbox"
                                                                checked={(offerForm.user_ids || []).includes(userItem.id)}
                                                                onChange={() => toggleOfferUser(userItem.id)}
                                                            />
                                                            <span className="truncate">{userItem.email}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Categorias objetivo (vacio = todas)</p>
                                                {categories.length === 0 ? (
                                                    <p className="text-[10px] text-[#8a7560]">Sin categorias para seleccionar.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-2">
                                                        {categories.map((categoryItem) => {
                                                            const selected = (offerForm.category_ids || []).includes(categoryItem.id);
                                                            return (
                                                                <button
                                                                    key={categoryItem.id}
                                                                    type="button"
                                                                    onClick={() => toggleOfferCategorySelection(categoryItem.id)}
                                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                                        selected
                                                                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                                                            : 'bg-white dark:bg-[#1a130c] text-[#181411] dark:text-white border-[#e5e1de] dark:border-[#3d2f21]'
                                                                    }`}
                                                                >
                                                                    {categoryItem.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {(offerForm.category_ids || []).length > 0 ? (
                                                    <p className="text-[10px] text-[#8a7560]">
                                                        Seleccionadas: {categories
                                                            .filter((categoryItem) => (offerForm.category_ids || []).includes(categoryItem.id))
                                                            .map((categoryItem) => categoryItem.name)
                                                            .join(', ')}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={submitOffer}
                                                disabled={offerFormSaving}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${offerFormSaving ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:scale-105'}`}
                                            >
                                                {editingOfferId ? 'Actualizar oferta' : 'Crear oferta'}
                                            </button>
                                            {editingOfferId ? (
                                                <button
                                                    type="button"
                                                    onClick={resetOfferForm}
                                                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#e5e1de] dark:border-[#3d2f21]"
                                                >
                                                    Cancelar edicion
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className="pt-3 border-t border-[#e5e1de] dark:border-[#3d2f21]">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560] mb-2">Ofertas creadas</p>
                                            {offersLoading ? (
                                                <p className="text-[10px] text-[#8a7560]">Cargando ofertas...</p>
                                            ) : offersError ? (
                                                <p className="text-[10px] text-red-600">{offersError}</p>
                                            ) : offers.length === 0 ? (
                                                <p className="text-[10px] text-[#8a7560]">Todavia no hay ofertas avanzadas.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {offers.map((offerItem) => {
                                                        const categoryNames = categories
                                                            .filter((categoryItem) => (offerItem.category_ids || []).includes(categoryItem.id))
                                                            .map((categoryItem) => categoryItem.name);
                                                        return (
                                                            <div key={offerItem.id} className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-[11px] font-black text-[#181411] dark:text-white">{offerItem.name}</p>
                                                                        <p className="text-[10px] text-[#8a7560]">
                                                                            {offerItem.percent}% · {offerItem.enabled ? 'Activa' : 'Inactiva'} · etiqueta: {offerItem.label || 'Oferta'}
                                                                        </p>
                                                                        <p className="text-[10px] text-[#8a7560]">
                                                                            Usuarios: {(offerItem.user_ids || []).length || 'Todos'} · Categorias: {(offerItem.category_ids || []).length || 'Todas'}
                                                                        </p>
                                                                        {categoryNames.length > 0 ? (
                                                                            <p className="text-[10px] text-[#8a7560] truncate">
                                                                                Categorias objetivo: {categoryNames.join(', ')}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => editOffer(offerItem)}
                                                                            className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[#e5e1de] dark:border-[#3d2f21]"
                                                                        >
                                                                            Editar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeOffer(offerItem.id)}
                                                                            disabled={offerDeleteId === offerItem.id}
                                                                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${offerDeleteId === offerItem.id ? 'text-zinc-400 cursor-not-allowed' : 'text-red-500 hover:text-red-600'}`}
                                                                        >
                                                                            {offerDeleteId === offerItem.id ? '...' : 'Eliminar'}
                                                                        </button>
                                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        ) : activeTab === 'users' ? (
                            <div className="space-y-4 animate-in fade-in duration-300 pb-10">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Gestion de usuarios</p>
                                    <button
                                        type="button"
                                        onClick={() => loadUsers()}
                                        className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest"
                                    >
                                        Recargar
                                    </button>
                                </div>

                                {usersLoading ? (
                                    <div className="text-[11px] text-[#8a7560]">Cargando usuarios...</div>
                                ) : null}
                                {usersError ? (
                                    <div className="text-[11px] text-red-600">{usersError}</div>
                                ) : null}
                                {!usersLoading && !usersError && usersList.length === 0 ? (
                                    <div className="text-[11px] text-[#8a7560]">No hay usuarios registrados para este tenant.</div>
                                ) : null}

                                {!usersLoading && usersList.length > 0 ? (
                                    <div className="space-y-3">
                                        {usersList.map((item) => {
                                            const draft = getUserDraft(item) || {
                                                role: item.role || 'retail',
                                                status: item.status || 'active',
                                                price_list_id: item.price_list_id || 'auto',
                                            };
                                            const isDirty = hasUserDraftChanges(item);
                                            const isSaving = userSavingId === item.id;
                                            const isDeleting = userDeletingId === item.id;
                                            const isSelected = selectedUser?.id === item.id;
                                            const isCurrentUser = user?.id === item.id;
                                            const needsWholesaleApproval =
                                                (item.role || '') === 'wholesale' && (item.status || '') === 'pending';

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`rounded-2xl border p-3 transition-all ${
                                                        isSelected
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c]'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedUser(item)}
                                                            className="text-left min-w-0"
                                                        >
                                                            <p className="text-[11px] font-black text-[#181411] dark:text-white truncate">{item.email}</p>
                                                            <p className="text-[10px] text-[#8a7560]">
                                                                Rol: {item.role || 'retail'} · Estado: {item.status || 'active'}
                                                            </p>
                                                        </button>
                                                        {needsWholesaleApproval ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => approveWholesaleUser(item)}
                                                                disabled={isSaving}
                                                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-60"
                                                            >
                                                                {isSaving ? '...' : 'Aprobar'}
                                                            </button>
                                                        ) : null}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                                                        <select
                                                            value={draft.role || 'retail'}
                                                            onChange={(e) =>
                                                                setUserDrafts((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: {
                                                                        ...(prev[item.id] || {
                                                                            role: item.role || 'retail',
                                                                            status: item.status || 'active',
                                                                            price_list_id: item.price_list_id || 'auto',
                                                                        }),
                                                                        role: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                                        >
                                                            {USER_ROLE_OPTIONS.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={draft.status || 'active'}
                                                            onChange={(e) =>
                                                                setUserDrafts((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: {
                                                                        ...(prev[item.id] || {
                                                                            role: item.role || 'retail',
                                                                            status: item.status || 'active',
                                                                            price_list_id: item.price_list_id || 'auto',
                                                                        }),
                                                                        status: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                                        >
                                                            {USER_STATUS_OPTIONS.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={draft.price_list_id || 'auto'}
                                                            onChange={(e) =>
                                                                setUserDrafts((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: {
                                                                        ...(prev[item.id] || {
                                                                            role: item.role || 'retail',
                                                                            status: item.status || 'active',
                                                                            price_list_id: item.price_list_id || 'auto',
                                                                        }),
                                                                        price_list_id: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                                        >
                                                            <option value="auto">Lista automatica</option>
                                                            {priceLists.map((priceList) => (
                                                                <option key={priceList.id} value={priceList.id}>
                                                                    {priceList.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between gap-2">
                                                        <p className="text-[10px] text-[#8a7560] truncate">
                                                            Lista actual: {item.price_list_name || 'Automatica'}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => saveUserSetup(item)}
                                                                disabled={!isDirty || isSaving || isDeleting}
                                                                className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest disabled:opacity-40"
                                                            >
                                                                {isSaving ? 'Guardando...' : 'Guardar'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeUser(item)}
                                                                disabled={isSaving || isDeleting || isCurrentUser}
                                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isSaving || isDeleting || isCurrentUser ? 'border-[#e5e1de] text-zinc-400 cursor-not-allowed' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                                            >
                                                                {isCurrentUser ? 'Tu cuenta' : (isDeleting ? 'Eliminando...' : 'Eliminar')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}

                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <button
                                        type="button"
                                        disabled={!canPrevUsers || usersLoading}
                                        onClick={() => setUsersPage((prev) => Math.max(prev - 1, 1))}
                                        className="px-3 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-[9px] font-black uppercase tracking-widest disabled:opacity-40"
                                    >
                                        Anterior
                                    </button>
                                    <p className="text-[10px] text-[#8a7560]">
                                        Pagina {usersPage} de {usersTotalPages}
                                    </p>
                                    <button
                                        type="button"
                                        disabled={!canNextUsers || usersLoading}
                                        onClick={() => setUsersPage((prev) => Math.min(prev + 1, usersTotalPages))}
                                        className="px-3 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-[9px] font-black uppercase tracking-widest disabled:opacity-40"
                                    >
                                        Siguiente
                                    </button>
                                </div>

                                {selectedUser ? (
                                    <div className="space-y-3 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] bg-zinc-50 dark:bg-white/5 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Compras del usuario</p>
                                                <p className="text-[11px] font-black text-[#181411] dark:text-white truncate">{selectedUser.email}</p>
                                            </div>
                                            <select
                                                value={userOrdersFilter}
                                                onChange={(e) => setUserOrdersFilter(e.target.value)}
                                                className="px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px]"
                                            >
                                                <option value="all">Todos</option>
                                                {ORDER_STATUS_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {userOrdersLoading ? <p className="text-[10px] text-[#8a7560]">Cargando compras...</p> : null}
                                        {userOrdersError ? <p className="text-[10px] text-red-600">{userOrdersError}</p> : null}

                                        {!userOrdersLoading ? (
                                            <div className="space-y-2">
                                                {userOrders
                                                    .filter((order) => userOrdersFilter === 'all' || order.status === userOrdersFilter)
                                                    .map((order) => (
                                                        <div key={order.id} className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-3">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-[#181411] dark:text-white">
                                                                        {formatOrderTotal(order.total, order.currency)} · {formatCheckoutModeLabel(order.checkout_mode)}
                                                                    </p>
                                                                    <p className="text-[10px] text-[#8a7560]">
                                                                        {new Date(order.created_at).toLocaleString('es-AR')}
                                                                    </p>
                                                                </div>
                                                                <select
                                                                    value={order.status}
                                                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                                    disabled={orderUpdatingId === order.id}
                                                                    className="px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px] disabled:opacity-50"
                                                                >
                                                                    {ORDER_STATUS_OPTIONS.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ))}
                                                {!userOrdersLoading &&
                                                userOrders.filter((order) => userOrdersFilter === 'all' || order.status === userOrdersFilter).length === 0 ? (
                                                    <p className="text-[10px] text-[#8a7560]">Este usuario todavia no tiene compras.</p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
        ) : activeTab === 'checkout' ? (
                            <div className="space-y-6 animate-in fade-in duration-300 pb-10">
                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Metodos de pago</p>
                                    <div className="flex flex-wrap gap-2">
                                        {CHECKOUT_METHOD_OPTIONS.map((method) => {
                                            const selected = checkoutMethods.includes(method.key);
                                            return (
                                                <button
                                                    key={method.key}
                                                    type="button"
                                                    onClick={() => toggleCheckoutMethod(method.key)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                        selected
                                                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                                            : 'bg-white dark:bg-[#1a130c] border-[#e5e1de] dark:border-[#3d2f21] text-[#8a7560]'
                                                    }`}
                                                >
                                                    {method.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-[#8a7560]">Selecciona que opciones va a ver el cliente en checkout.</p>
                                </div>

                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Impuestos y entrega</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Tasa de impuesto</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={settings.commerce?.tax_rate ?? 0}
                                                onChange={(e) => updateCommerceField('tax_rate', Number(e.target.value || 0))}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7560]">Entrega por defecto</label>
                                            <select
                                                value={settings.commerce?.default_delivery || ''}
                                                onChange={(e) => updateCommerceField('default_delivery', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                            >
                                                <option value="">Sin definir</option>
                                                {shippingZones.map((zone) => (
                                                    <option key={`zone-${zone.id}`} value={`zone:${zone.id}`}>
                                                        Zona: {zone.name}
                                                    </option>
                                                ))}
                                                {branches.map((branch) => (
                                                    <option key={`branch-${branch.id}`} value={`branch:${branch.id}`}>
                                                        Sucursal: {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Zonas de envio</p>
                                        <button
                                            type="button"
                                            onClick={addShippingZone}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest"
                                        >
                                            Agregar zona
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {shippingZones.map((zone, index) => (
                                            <div key={zone.id || index} className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-3 space-y-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={zone.name || ''}
                                                        placeholder="Nombre de zona"
                                                        onChange={(e) => updateShippingZone(index, 'name', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={zone.price ?? 0}
                                                        placeholder="Costo"
                                                        onChange={(e) => updateShippingZone(index, 'price', Number(e.target.value || 0))}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={zone.description || ''}
                                                    placeholder="Descripcion"
                                                    onChange={(e) => updateShippingZone(index, 'description', e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <label className="inline-flex items-center gap-2 text-[10px] text-[#8a7560] font-bold">
                                                        <input
                                                            type="checkbox"
                                                            checked={zone.enabled !== false}
                                                            onChange={(e) => updateShippingZone(index, 'enabled', e.target.checked)}
                                                        />
                                                        Habilitada
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeShippingZone(index)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-red-500"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Sucursales</p>
                                        <button
                                            type="button"
                                            onClick={addBranch}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest"
                                        >
                                            Agregar sucursal
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {branches.map((branch, index) => (
                                            <div key={branch.id || index} className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-3 space-y-2">
                                                <input
                                                    type="text"
                                                    value={branch.name || ''}
                                                    placeholder="Nombre"
                                                    onChange={(e) => updateBranch(index, 'name', e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                />
                                                <input
                                                    type="text"
                                                    value={branch.address || ''}
                                                    placeholder="Direccion"
                                                    onChange={(e) => updateBranch(index, 'address', e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        value={branch.hours || ''}
                                                        placeholder="Horario"
                                                        onChange={(e) => updateBranch(index, 'hours', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={branch.phone || ''}
                                                        placeholder="Telefono"
                                                        onChange={(e) => updateBranch(index, 'phone', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={branch.pickup_fee ?? 0}
                                                        placeholder="Costo retiro"
                                                        onChange={(e) => updateBranch(index, 'pickup_fee', Number(e.target.value || 0))}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-[10px]"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <label className="inline-flex items-center gap-2 text-[10px] text-[#8a7560] font-bold">
                                                        <input
                                                            type="checkbox"
                                                            checked={branch.enabled !== false}
                                                            onChange={(e) => updateBranch(index, 'enabled', e.target.checked)}
                                                        />
                                                        Habilitada
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBranch(index)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-red-500"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Datos de transferencia</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={bankTransferSettings.cbu || ''}
                                            placeholder="CBU"
                                            onChange={(e) => updateBankTransferField('cbu', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={bankTransferSettings.alias || ''}
                                            placeholder="Alias"
                                            onChange={(e) => updateBankTransferField('alias', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={bankTransferSettings.bank || ''}
                                            placeholder="Banco"
                                            onChange={(e) => updateBankTransferField('bank', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={bankTransferSettings.holder || ''}
                                            placeholder="Titular"
                                            onChange={(e) => updateBankTransferField('holder', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
        ) : activeTab === 'tenants' ? (
                            <div className="space-y-4 animate-in fade-in duration-300 pb-10">
                                <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Empresas registradas</p>
                                <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    {tenantsLoading ? <div className="text-[11px] text-[#8a7560]">Cargando empresas...</div> : null}
                                    {tenantsError ? <div className="text-[11px] text-red-600">{tenantsError}</div> : null}
                                    {!tenantsLoading && !tenantsError && tenants.length === 0 ? <div className="text-[11px] text-[#8a7560]">No hay empresas registradas.</div> : null}
                                    {tenants.map((tenant) => (
                                        <div key={tenant.id} className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-3">
                                            <p className="text-[11px] font-bold text-[#181411] dark:text-white">{tenant.name}</p>
                                            <p className="text-[10px] text-[#8a7560]">ID: {tenant.id}</p>
                                        </div>
                                    ))}
                                    {user?.role === 'master_admin' ? (
                                        <button type="button" onClick={loadTenants} className="mt-2 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest">Recargar</button>
                                    ) : null}
                                </div>
                            </div>
                        ) : activeTab === 'catalog' ? (
                            <div className="space-y-6 animate-in fade-in duration-300 pb-10">
                                <div ref={catalogEditorRef} className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Categorias</p>
                                    <div className="flex flex-wrap gap-2">
                                        <input type="text" value={newCategoryName} placeholder="Nueva categoria" onChange={e => setNewCategoryName(e.target.value)} className="min-w-[220px] flex-1 px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                        <select value={newCategoryParentId} onChange={e => setNewCategoryParentId(e.target.value)} className="w-56 px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs">
                                            <option value="">Categoria principal (sin padre)</option>
                                            {parentCategories.map((parentCategory) => <option key={parentCategory.id} value={parentCategory.id}>{parentCategory.name}</option>)}
                                        </select>
                                        <button onClick={handleCreateCategory} disabled={categorySaving || !newCategoryName.trim()} className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{categorySaving ? 'Guardando...' : 'Agregar'}</button>
                                    </div>
                                    <div className="space-y-1">
                                        {categoryHierarchy.map((group) => (
                                            <div key={group.parent.id} className="text-[10px]">
                                                <div className="inline-flex items-center gap-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] px-2 py-1">
                                                    <span className="font-bold">{group.parent.name}</span>
                                                    <button type="button" onClick={() => handleDeleteCategory(group.parent.id, group.parent.name)} disabled={categoryDeletingId === group.parent.id} className="text-red-500">{categoryDeletingId === group.parent.id ? '...' : 'Eliminar'}</button>
                                                </div>
                                                {group.children.length ? <div className="mt-1 ml-3 flex flex-wrap gap-2">{group.children.map((child) => <button key={child.id} type="button" onClick={() => handleDeleteCategory(child.id, child.name)} className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21]">{child.name} · Eliminar</button>)}</div> : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Marca</p>
                                    <div className="flex gap-2">
                                        <input type="text" value={newBrandName} placeholder="Nueva marca" onChange={e => setNewBrandName(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                        <button onClick={handleCreateBrand} disabled={brandSaving || !newBrandName.trim()} className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{brandSaving ? 'Guardando...' : 'Agregar'}</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">{brands.map((brandName) => <button key={brandName} type="button" onClick={() => handleDeleteBrand(brandName)} className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-[10px]">{brandName} · {brandDeletingName === brandName ? '...' : 'Eliminar'}</button>)}</div>
                                </div>

                                <div className="space-y-3 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">{editingProductId ? 'Editar Producto' : 'Crear Producto'}</p>
                                    <input type="text" value={newProduct.name} placeholder="Nombre" onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                    <div className="flex gap-2">
                                        <input type="text" value={newProduct.sku} placeholder="SKU" onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} className="flex-1 px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                        <input type="number" value={newProduct.price} placeholder="Precio" onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="w-24 px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                        <input type="number" value={newProduct.stock} placeholder="Stock" onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="w-24 px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                    </div>
                                    <select value={newProduct.brand} onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs">
                                        <option value="">Sin marca</option>
                                        {brands.map((brandName) => <option key={brandName} value={brandName}>{brandName}</option>)}
                                    </select>
                                    <textarea value={newProduct.description} rows={2} placeholder="Descripcion" onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs" />
                                    <div className="flex flex-wrap gap-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] p-2">{categories.map((cat) => { const selected = (newProduct.category_ids || []).includes(cat.id); return <button key={cat.id} type="button" onClick={() => toggleProductCategorySelection(cat.id)} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${selected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-[#1a130c] text-[#181411] dark:text-white border-[#e5e1de] dark:border-[#3d2f21]'}`}>{cat.name}</button>; })}</div>
                                    <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#8a7560]"><input type="checkbox" checked={newProduct.is_featured} onChange={e => setNewProduct({ ...newProduct, is_featured: e.target.checked })} /> Marcar como Destacado</label>
                                    <div className="flex gap-2">
                                        {editingProductId ? <button type="button" onClick={handleCancelEditProduct} className="flex-1 py-2.5 border border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#8a7560]">Cancelar</button> : null}
                                        <button onClick={editingProductId ? handleUpdateProduct : handleCreateProduct} disabled={saving} className="flex-1 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-60">{saving ? 'Guardando...' : editingProductId ? 'Guardar cambios' : 'Crear Producto'}</button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Lista de Productos</p>
                                    {products.map((p) => {
                                        const previewImage = getProductPreviewImage(p);
                                        return (
                                            <div key={p.id} className={`p-3 bg-white dark:bg-[#2c2116] border rounded-2xl flex items-center justify-between transition-all ${editingProductId === p.id ? 'border-primary shadow-md shadow-primary/20' : 'border-[#e5e1de] dark:border-[#3d2f21]'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">{previewImage ? <img src={previewImage} alt="" className="w-full h-full object-cover" /> : null}</div>
                                                    <button type="button" onClick={() => handleEditProduct(p)} className="overflow-hidden text-left"><p className="text-[11px] font-black text-[#181411] dark:text-white truncate">{p.name}</p><p className="text-[9px] font-bold text-[#8a7560]">${p.price}</p></button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="number" value={stockEdits[p.id] ?? ''} placeholder="+/-" onChange={e => setStockEdits(prev => ({ ...prev, [p.id]: e.target.value }))} className="w-16 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[10px] font-mono text-right" />
                                                    <button onClick={() => handleAddStock(p.id)} disabled={stockSavingId === p.id || !String(stockEdits[p.id] ?? '').trim()} className="px-2 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest disabled:opacity-50">{stockSavingId === p.id ? '...' : 'Sumar'}</button>
                                                    <button type="button" onClick={() => handleEditProduct(p)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editingProductId === p.id ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:hover:text-white'}`} title="Editar producto">Editar</button>
                                                    <button onClick={() => handleToggleFeatured(p.id, p.is_featured)} className={`p-2 rounded-lg transition-all ${p.is_featured ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`} title={p.is_featured ? 'Destacado' : 'No destacado'}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={p.is_featured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} disabled={deleteLoadingId === p.id} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (activeTab === 'home' || activeTab === 'about') && editingSection ? (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => setEditingSection(null)}
                                    className="flex items-center gap-2 text-primary font-black text-[10px] uppercase mb-4"
                                >
                                    ? Volver a secciones
                                </button>

                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-black uppercase text-[#181411] dark:text-white">
                                        {editingSection.type.replace(/([A-Z])/g, ' $1').trim()}
                                    </h2>
                                    <button onClick={() => handleDeleteSection(editingSection.index)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    </button>
                                </div>

                                {/* HeroSlider Content Editor */}
                                {editingSection.type === 'HeroSlider' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#8a7560]">
                                                Tipo de slider
                                            </p>
                                            <select
                                                value={editingHeroVariant}
                                                onChange={(event) => updateHeroVariant(editingSection.index, event.target.value)}
                                                className="w-full rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent px-3 py-2 text-sm font-bold"
                                            >
                                                {HERO_VARIANT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {editingHeroVariant === 'classic' ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingHeroProps?.title || ''}
                                                    placeholder="Titulo Principal"
                                                    onChange={(event) => updateSectionProps(editingSection.index, { title: event.target.value })}
                                                    className="w-full rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent px-3 py-2 text-sm font-bold"
                                                />
                                                <textarea
                                                    value={editingHeroProps?.subtitle || ''}
                                                    placeholder="Subtitulo / Descripcion"
                                                    rows={3}
                                                    onChange={(event) => updateSectionProps(editingSection.index, { subtitle: event.target.value })}
                                                    className="w-full rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent px-3 py-2 text-sm"
                                                />
                                                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => handleHeroImageUpload(event, editingSection.index)}
                                                        className="hidden"
                                                        disabled={heroUploading}
                                                    />
                                                    {heroUploading ? (
                                                        <>
                                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                                            <span>Subiendo...</span>
                                                        </>
                                                    ) : (
                                                        <span>Subir imagen</span>
                                                    )}
                                                </label>
                                            </>
                                        ) : (
                                            <div className="space-y-3 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] bg-zinc-50 p-3 dark:bg-white/5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#8a7560]">
                                                        Slides ({editingHeroSlides.length})
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => addHeroSlide(editingSection.index)}
                                                        className="rounded-lg border border-[#e5e1de] px-2 py-1 text-[10px] font-bold text-[#8a7560] transition-colors hover:border-primary hover:text-primary dark:border-[#3d2f21]"
                                                    >
                                                        + Agregar slide
                                                    </button>
                                                </div>

                                                {editingHeroSlides.map((slide, slideIndex) => (
                                                    <div
                                                        key={`${slideIndex}-${slide.image || slide.title || 'slide'}`}
                                                        className="space-y-2 rounded-xl border border-[#e5e1de] bg-white/90 p-2.5 dark:border-[#3d2f21] dark:bg-[#1a130c]"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#8a7560]">
                                                                Slide {slideIndex + 1}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeHeroSlide(editingSection.index, slideIndex)}
                                                                className="text-[10px] font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
                                                                disabled={editingHeroSlides.length <= 1}
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>

                                                        <input
                                                            type="text"
                                                            value={slide.label || ''}
                                                            placeholder="Etiqueta"
                                                            onChange={(event) =>
                                                                updateHeroSlide(editingSection.index, slideIndex, { label: event.target.value })
                                                            }
                                                            className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={slide.title || ''}
                                                            placeholder="Titulo"
                                                            onChange={(event) =>
                                                                updateHeroSlide(editingSection.index, slideIndex, { title: event.target.value })
                                                            }
                                                            className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={slide.subtitle || ''}
                                                            placeholder="Subtitulo"
                                                            onChange={(event) =>
                                                                updateHeroSlide(editingSection.index, slideIndex, { subtitle: event.target.value })
                                                            }
                                                            className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                        />
                                                        <textarea
                                                            rows={2}
                                                            value={slide.description || ''}
                                                            placeholder="Descripcion"
                                                            onChange={(event) =>
                                                                updateHeroSlide(editingSection.index, slideIndex, { description: event.target.value })
                                                            }
                                                            className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={slide.featured || ''}
                                                            placeholder="Texto destacado"
                                                            onChange={(event) =>
                                                                updateHeroSlide(editingSection.index, slideIndex, { featured: event.target.value })
                                                            }
                                                            className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                        />
                                                        {editingHeroVariant === 'sanitarios_industrial' ? (
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={slide.cardEyebrow || ''}
                                                                    placeholder="Card: etiqueta superior"
                                                                    onChange={(event) =>
                                                                        updateHeroSlide(editingSection.index, slideIndex, { cardEyebrow: event.target.value })
                                                                    }
                                                                    className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={slide.cardTitle || ''}
                                                                    placeholder="Card: titulo principal"
                                                                    onChange={(event) =>
                                                                        updateHeroSlide(editingSection.index, slideIndex, { cardTitle: event.target.value })
                                                                    }
                                                                    className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={slide.specLabel || ''}
                                                                    placeholder="Texto superior derecho (spec)"
                                                                    onChange={(event) =>
                                                                        updateHeroSlide(editingSection.index, slideIndex, { specLabel: event.target.value })
                                                                    }
                                                                    className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                                />
                                                            </div>
                                                        ) : null}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="text"
                                                                value={slide.primaryButtonLabel || ''}
                                                                placeholder="Boton principal"
                                                                onChange={(event) =>
                                                                    updateHeroSlide(editingSection.index, slideIndex, { primaryButtonLabel: event.target.value })
                                                                }
                                                                className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={slide.primaryButtonLink || ''}
                                                                placeholder="Link principal"
                                                                onChange={(event) =>
                                                                    updateHeroSlide(editingSection.index, slideIndex, { primaryButtonLink: event.target.value })
                                                                }
                                                                className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={slide.secondaryButtonLabel || ''}
                                                                placeholder="Boton secundario"
                                                                onChange={(event) =>
                                                                    updateHeroSlide(editingSection.index, slideIndex, { secondaryButtonLabel: event.target.value })
                                                                }
                                                                className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={slide.secondaryButtonLink || ''}
                                                                placeholder="Link secundario"
                                                                onChange={(event) =>
                                                                    updateHeroSlide(editingSection.index, slideIndex, { secondaryButtonLink: event.target.value })
                                                                }
                                                                className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={slide.image || ''}
                                                            placeholder="URL imagen"
                                                            onChange={(event) =>
                                                                updateHeroSlide(editingSection.index, slideIndex, { image: event.target.value })
                                                            }
                                                            className="w-full rounded-lg border border-[#e5e1de] bg-transparent px-2 py-1 text-[11px] dark:border-[#3d2f21]"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(event) => handleHeroSlideImageUpload(event, editingSection.index, slideIndex)}
                                                                    className="hidden"
                                                                    disabled={heroUploading}
                                                                />
                                                                {heroUploading ? 'Subiendo...' : 'Subir imagen'}
                                                            </label>
                                                            {slide.image ? (
                                                                <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#e5e1de] bg-zinc-100 dark:border-[#3d2f21] dark:bg-[#1a130c]">
                                                                    <img src={slide.image} alt="" className="h-full w-full object-cover" />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="space-y-2 rounded-xl border border-[#e5e1de] bg-white/90 p-2.5 dark:border-[#3d2f21] dark:bg-[#1a130c]">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#8a7560]">
                                                        Colores del slider
                                                    </p>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {editingHeroColorFields.map((field) => (
                                                            <label key={field.key} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e1de] px-2 py-1 dark:border-[#3d2f21]">
                                                                <span className="text-[10px] font-bold text-[#8a7560]">{field.label}</span>
                                                                <input
                                                                    type="color"
                                                                    value={editingHeroStyles[field.key] || '#000000'}
                                                                    onChange={(event) =>
                                                                        updateHeroVariantStyle(editingSection.index, field.key, event.target.value)
                                                                    }
                                                                    className="h-7 w-9 cursor-pointer rounded border-none bg-transparent p-0"
                                                                />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {editingSection.type === 'HeroSlider' && editingHeroVariant === 'classic' && (
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={sections[editingSection.index].props?.tag || ''}
                                            placeholder="Etiqueta"
                                            onChange={e => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, tag: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                        />
                                        <div className="grid grid-cols-1 gap-3">
                                            <input
                                                type="text"
                                                value={sections[editingSection.index].props?.primaryButton?.label || ''}
                                                placeholder="Texto boton primario"
                                                onChange={e => {
                                                    const newSections = [...sections];
                                                    const currentProps = newSections[editingSection.index].props || {};
                                                    const primaryButton = currentProps.primaryButton || {};
                                                    newSections[editingSection.index].props = {
                                                        ...currentProps,
                                                        primaryButton: { ...primaryButton, label: e.target.value }
                                                    };
                                                    setSections(newSections);
                                                }}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                            />
                                            <input
                                                type="text"
                                                value={sections[editingSection.index].props?.primaryButton?.link || ''}
                                                placeholder="Link boton primario"
                                                onChange={e => {
                                                    const newSections = [...sections];
                                                    const currentProps = newSections[editingSection.index].props || {};
                                                    const primaryButton = currentProps.primaryButton || {};
                                                    newSections[editingSection.index].props = {
                                                        ...currentProps,
                                                        primaryButton: { ...primaryButton, link: e.target.value }
                                                    };
                                                    setSections(newSections);
                                                }}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                            />
                                            <input
                                                type="text"
                                                value={sections[editingSection.index].props?.secondaryButton?.label || ''}
                                                placeholder="Texto boton secundario"
                                                onChange={e => {
                                                    const newSections = [...sections];
                                                    const currentProps = newSections[editingSection.index].props || {};
                                                    const secondaryButton = currentProps.secondaryButton || {};
                                                    newSections[editingSection.index].props = {
                                                        ...currentProps,
                                                        secondaryButton: { ...secondaryButton, label: e.target.value }
                                                    };
                                                    setSections(newSections);
                                                }}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                            />
                                            <input
                                                type="text"
                                                value={sections[editingSection.index].props?.secondaryButton?.link || ''}
                                                placeholder="Link boton secundario"
                                                onChange={e => {
                                                    const newSections = [...sections];
                                                    const currentProps = newSections[editingSection.index].props || {};
                                                    const secondaryButton = currentProps.secondaryButton || {};
                                                    newSections[editingSection.index].props = {
                                                        ...currentProps,
                                                        secondaryButton: { ...secondaryButton, link: e.target.value }
                                                    };
                                                    setSections(newSections);
                                                }}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2 rounded-xl border border-[#e5e1de] bg-white/90 p-2.5 dark:border-[#3d2f21] dark:bg-[#1a130c]">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#8a7560]">
                                                Colores del slider clasico
                                            </p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {HERO_CLASSIC_COLOR_FIELDS.map((field) => (
                                                    <label key={field.key} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e1de] px-2 py-1 dark:border-[#3d2f21]">
                                                        <span className="text-[10px] font-bold text-[#8a7560]">{field.label}</span>
                                                        <input
                                                            type="color"
                                                            value={normalizeColorInputValue(
                                                                sections[editingSection.index].props?.styles?.[field.key],
                                                                field.defaultColor
                                                            )}
                                                            onChange={(event) =>
                                                                updateSectionStyles(editingSection.index, { [field.key]: event.target.value })
                                                            }
                                                            className="h-7 w-9 cursor-pointer rounded border-none bg-transparent p-0"
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] bg-zinc-50 dark:bg-white/5 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[#8a7560]">
                                                    Posicion de botones
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => updateHeroButtonOffsets(editingSection.index, 0, 0)}
                                                    className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-[9px] font-bold text-[#8a7560] hover:text-primary hover:border-primary transition-colors"
                                                >
                                                    Centrar
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-[#8a7560]">
                                                Arrastra el punto para mover los botones (estilo Wix).
                                            </p>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onPointerDown={(event) => handleHeroButtonsPadPointerDown(event, editingSection.index)}
                                                onPointerMove={(event) => handleHeroButtonsPadPointerMove(event, editingSection.index)}
                                                onKeyDown={(event) => {
                                                    const offsets = getHeroButtonOffsets(editingSection.index);
                                                    const step = event.shiftKey ? 10 : 5;
                                                    if (event.key === 'ArrowLeft') {
                                                        event.preventDefault();
                                                        updateHeroButtonOffsets(editingSection.index, offsets.x - step, offsets.y);
                                                    } else if (event.key === 'ArrowRight') {
                                                        event.preventDefault();
                                                        updateHeroButtonOffsets(editingSection.index, offsets.x + step, offsets.y);
                                                    } else if (event.key === 'ArrowUp') {
                                                        event.preventDefault();
                                                        updateHeroButtonOffsets(editingSection.index, offsets.x, offsets.y - step);
                                                    } else if (event.key === 'ArrowDown') {
                                                        event.preventDefault();
                                                        updateHeroButtonOffsets(editingSection.index, offsets.x, offsets.y + step);
                                                    }
                                                }}
                                                className="relative h-28 rounded-xl border border-dashed border-[#d2c8bf] dark:border-[#4a3a2b] bg-white/70 dark:bg-[#1a130c]/70 cursor-crosshair"
                                                aria-label="Ajustar posicion de botones del hero"
                                            >
                                                <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px bg-[#d2c8bf] dark:bg-[#4a3a2b]" />
                                                <div className="pointer-events-none absolute top-1/2 left-0 right-0 h-px bg-[#d2c8bf] dark:bg-[#4a3a2b]" />
                                                <div
                                                    className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow"
                                                    style={{
                                                        left: `calc(50% + ${getHeroButtonOffsets(editingSection.index).x}px)`,
                                                        top: `calc(50% + ${getHeroButtonOffsets(editingSection.index).y}px)`,
                                                    }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#8a7560]">
                                                    X
                                                    <input
                                                        type="range"
                                                        min={-HERO_BUTTON_X_LIMIT}
                                                        max={HERO_BUTTON_X_LIMIT}
                                                        step={1}
                                                        value={getHeroButtonOffsets(editingSection.index).x}
                                                        onChange={(event) =>
                                                            updateHeroButtonOffsets(
                                                                editingSection.index,
                                                                Number(event.target.value),
                                                                getHeroButtonOffsets(editingSection.index).y
                                                            )
                                                        }
                                                        className="w-full"
                                                    />
                                                </label>
                                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#8a7560]">
                                                    Y
                                                    <input
                                                        type="range"
                                                        min={-HERO_BUTTON_Y_LIMIT}
                                                        max={HERO_BUTTON_Y_LIMIT}
                                                        step={1}
                                                        value={getHeroButtonOffsets(editingSection.index).y}
                                                        onChange={(event) =>
                                                            updateHeroButtonOffsets(
                                                                editingSection.index,
                                                                getHeroButtonOffsets(editingSection.index).x,
                                                                Number(event.target.value)
                                                            )
                                                        }
                                                        className="w-full"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="space-y-2 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] bg-zinc-50 dark:bg-white/5 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[#8a7560]">
                                                    Posicion de textos
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => updateHeroTextOffsets(editingSection.index, 0, 0)}
                                                    className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-[9px] font-bold text-[#8a7560] hover:text-primary hover:border-primary transition-colors"
                                                >
                                                    Centrar
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-[#8a7560]">
                                                Arrastra el punto para mover el bloque de texto.
                                            </p>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onPointerDown={(event) => handleHeroTextPadPointerDown(event, editingSection.index)}
                                                onPointerMove={(event) => handleHeroTextPadPointerMove(event, editingSection.index)}
                                                onKeyDown={(event) => {
                                                    const offsets = getHeroTextOffsets(editingSection.index);
                                                    const step = event.shiftKey ? 10 : 5;
                                                    if (event.key === 'ArrowLeft') {
                                                        event.preventDefault();
                                                        updateHeroTextOffsets(editingSection.index, offsets.x - step, offsets.y);
                                                    } else if (event.key === 'ArrowRight') {
                                                        event.preventDefault();
                                                        updateHeroTextOffsets(editingSection.index, offsets.x + step, offsets.y);
                                                    } else if (event.key === 'ArrowUp') {
                                                        event.preventDefault();
                                                        updateHeroTextOffsets(editingSection.index, offsets.x, offsets.y - step);
                                                    } else if (event.key === 'ArrowDown') {
                                                        event.preventDefault();
                                                        updateHeroTextOffsets(editingSection.index, offsets.x, offsets.y + step);
                                                    }
                                                }}
                                                className="relative h-28 rounded-xl border border-dashed border-[#d2c8bf] dark:border-[#4a3a2b] bg-white/70 dark:bg-[#1a130c]/70 cursor-crosshair"
                                                aria-label="Ajustar posicion de textos del hero"
                                            >
                                                <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px bg-[#d2c8bf] dark:bg-[#4a3a2b]" />
                                                <div className="pointer-events-none absolute top-1/2 left-0 right-0 h-px bg-[#d2c8bf] dark:bg-[#4a3a2b]" />
                                                <div
                                                    className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow"
                                                    style={{
                                                        left: `calc(50% + ${getHeroTextOffsets(editingSection.index).x}px)`,
                                                        top: `calc(50% + ${getHeroTextOffsets(editingSection.index).y}px)`,
                                                    }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#8a7560]">
                                                    X
                                                    <input
                                                        type="range"
                                                        min={-HERO_TEXT_X_LIMIT}
                                                        max={HERO_TEXT_X_LIMIT}
                                                        step={1}
                                                        value={getHeroTextOffsets(editingSection.index).x}
                                                        onChange={(event) =>
                                                            updateHeroTextOffsets(
                                                                editingSection.index,
                                                                Number(event.target.value),
                                                                getHeroTextOffsets(editingSection.index).y
                                                            )
                                                        }
                                                        className="w-full"
                                                    />
                                                </label>
                                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#8a7560]">
                                                    Y
                                                    <input
                                                        type="range"
                                                        min={-HERO_TEXT_Y_LIMIT}
                                                        max={HERO_TEXT_Y_LIMIT}
                                                        step={1}
                                                        value={getHeroTextOffsets(editingSection.index).y}
                                                        onChange={(event) =>
                                                            updateHeroTextOffsets(
                                                                editingSection.index,
                                                                getHeroTextOffsets(editingSection.index).x,
                                                                Number(event.target.value)
                                                            )
                                                        }
                                                        className="w-full"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingSection.type === 'FeaturedProducts' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#8a7560]">
                                                Tipo de modulo
                                            </p>
                                            <select
                                                value={editingFeaturedVariant}
                                                onChange={(event) => updateFeaturedVariant(editingSection.index, event.target.value)}
                                                className="w-full rounded-xl border border-[#e5e1de] bg-transparent px-3 py-2 text-sm font-bold dark:border-[#3d2f21]"
                                            >
                                                {FEATURED_VARIANT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <input
                                            type="text"
                                            value={sections[editingSection.index].props?.title || ''}
                                            placeholder="Titulo de seccion"
                                            onChange={e => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, title: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm font-bold"
                                        />
                                        <textarea
                                            value={sections[editingSection.index].props?.subtitle || ''}
                                            placeholder="Subtitulo"
                                            rows={3}
                                            onChange={e => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, subtitle: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={sections[editingSection.index].props?.ctaLabel || ''}
                                            placeholder="Texto del enlace"
                                            onChange={e => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, ctaLabel: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={sections[editingSection.index].props?.ctaLink || ''}
                                            placeholder="Link del enlace (/catalog)"
                                            onChange={(e) => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, ctaLink: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                        />
                                        {editingFeaturedVariant !== 'classic' ? (
                                            <div className="space-y-2 rounded-xl border border-[#e5e1de] bg-white/90 p-2.5 dark:border-[#3d2f21] dark:bg-[#1a130c]">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#8a7560]">
                                                    Colores del modulo
                                                </p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {editingFeaturedColorFields.map((field) => (
                                                        <label key={field.key} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e1de] px-2 py-1 dark:border-[#3d2f21]">
                                                            <span className="text-[10px] font-bold text-[#8a7560]">{field.label}</span>
                                                            <input
                                                                type="color"
                                                                value={normalizeColorInputValue(
                                                                    editingFeaturedStyles[field.key],
                                                                    '#000000'
                                                                )}
                                                                onChange={(event) =>
                                                                    updateFeaturedVariantStyle(editingSection.index, field.key, event.target.value)
                                                                }
                                                                className="h-7 w-9 cursor-pointer rounded border-none bg-transparent p-0"
                                                            />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                                {editingSection.type === 'Services' && (
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={sections[editingSection.index].props?.title || ''}
                                            placeholder="Titulo de seccion"
                                            onChange={e => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, title: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm font-bold"
                                        />
                                        <textarea
                                            value={sections[editingSection.index].props?.subtitle || ''}
                                            placeholder="Subtitulo"
                                            rows={3}
                                            onChange={e => {
                                                const newSections = [...sections];
                                                const currentProps = newSections[editingSection.index].props || {};
                                                newSections[editingSection.index].props = { ...currentProps, subtitle: e.target.value };
                                                setSections(newSections);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                        />
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Parrafos</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                            {(Array.isArray(sections[editingSection.index].props?.items)
                                                ? sections[editingSection.index].props.items
                                                : []
                                            ).map((item, itemIndex) => (
                                                <div key={itemIndex} className="p-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold uppercase text-[#8a7560] tracking-widest">Item {itemIndex + 1}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newSections = [...sections];
                                                                const currentProps = newSections[editingSection.index].props || {};
                                                                const currentItems = Array.isArray(currentProps.items) ? [...currentProps.items] : [];
                                                                currentItems.splice(itemIndex, 1);
                                                                newSections[editingSection.index].props = { ...currentProps, items: currentItems };
                                                                setSections(newSections);
                                                            }}
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-600"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={item.title || ''}
                                                        placeholder="Titulo del item"
                                                        onChange={e => {
                                                            const newSections = [...sections];
                                                            const currentProps = newSections[editingSection.index].props || {};
                                                            const currentItems = Array.isArray(currentProps.items) ? [...currentProps.items] : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, title: e.target.value };
                                                            newSections[editingSection.index].props = { ...currentProps, items: currentItems };
                                                            setSections(newSections);
                                                        }}
                                                        className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                                    />
                                                    <textarea
                                                        value={item.text ?? item.description ?? ''}
                                                        placeholder="Texto del item"
                                                        rows={3}
                                                        onChange={e => {
                                                            const newSections = [...sections];
                                                            const currentProps = newSections[editingSection.index].props || {};
                                                            const currentItems = Array.isArray(currentProps.items) ? [...currentProps.items] : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, text: e.target.value };
                                                            newSections[editingSection.index].props = { ...currentProps, items: currentItems };
                                                            setSections(newSections);
                                                        }}
                                                        className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-sm"
                                                    />
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={item.icon || ''}
                                                            placeholder="Icono (support_agent, local_shipping)"
                                                            onChange={e => {
                                                                const newSections = [...sections];
                                                                const currentProps = newSections[editingSection.index].props || {};
                                                                const currentItems = Array.isArray(currentProps.items) ? [...currentProps.items] : [];
                                                                const currentItem = currentItems[itemIndex] || {};
                                                                currentItems[itemIndex] = { ...currentItem, icon: e.target.value };
                                                                newSections[editingSection.index].props = { ...currentProps, items: currentItems };
                                                                setSections(newSections);
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent text-xs"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer w-fit">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(event) => handleServiceIconUpload(event, editingSection.index, itemIndex)}
                                                                    className="hidden"
                                                                    disabled={serviceIconUploading}
                                                                />
                                                                {serviceIconUploading ? (
                                                                    <>
                                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                        <span>Subiendo...</span>
                                                                    </>
                                                                ) : (
                                                                    <span>Subir icono</span>
                                                                )}
                                                            </label>
                                                            {isImageIcon(item.icon) ? (
                                                                <div className="w-10 h-10 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] overflow-hidden flex items-center justify-center">
                                                                    <img src={item.icon} alt="" className="w-8 h-8 object-contain" />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSections = [...sections];
                                                    const currentProps = newSections[editingSection.index].props || {};
                                                    const currentItems = Array.isArray(currentProps.items) ? [...currentProps.items] : [];
                                                    currentItems.push({ icon: 'support_agent', title: 'Nuevo servicio', text: 'Descripcion del servicio' });
                                                    newSections[editingSection.index].props = { ...currentProps, items: currentItems };
                                                    setSections(newSections);
                                                }}
                                                className="w-full py-2 border border-dashed border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[10px] font-bold text-[#8a7560] hover:border-primary hover:text-primary transition-colors"
                                            >
                                                + Agregar item
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                )}
                                {editingSection.type === 'AboutHero' && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Contenido</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.tagline || ''}
                                                    placeholder="Tagline"
                                                    onChange={(e) => updateSectionProps(editingSection.index, { tagline: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.title || ''}
                                                    placeholder="Titulo"
                                                    onChange={(e) => updateSectionProps(editingSection.index, { title: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[11px] font-bold"
                                                />
                                                <textarea
                                                    value={sections[editingSection.index].props?.description || ''}
                                                    placeholder="Descripcion"
                                                    rows={2}
                                                    onChange={(e) => updateSectionProps(editingSection.index, { description: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Imagen</p>
                                            <div className="flex flex-wrap gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer w-fit">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => handleSectionImageUpload(event, editingSection.index, 'backgroundImage')}
                                                        className="hidden"
                                                        disabled={heroUploading}
                                                    />
                                                    {heroUploading ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            <span>Subiendo...</span>
                                                        </>
                                                    ) : (
                                                        <span>Subir imagen</span>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Botones</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.primaryButton?.label || ''}
                                                    placeholder="Texto primario"
                                                    onChange={(e) => {
                                                        const currentProps = sections[editingSection.index].props || {};
                                                        const primaryButton = currentProps.primaryButton || {};
                                                        updateSectionProps(editingSection.index, {
                                                            primaryButton: { ...primaryButton, label: e.target.value }
                                                        });
                                                    }}
                                                    className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.primaryButton?.link || ''}
                                                    placeholder="Link primario"
                                                    onChange={(e) => {
                                                        const currentProps = sections[editingSection.index].props || {};
                                                        const primaryButton = currentProps.primaryButton || {};
                                                        updateSectionProps(editingSection.index, {
                                                            primaryButton: { ...primaryButton, link: e.target.value }
                                                        });
                                                    }}
                                                    className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.secondaryButton?.label || ''}
                                                    placeholder="Texto secundario"
                                                    onChange={(e) => {
                                                        const currentProps = sections[editingSection.index].props || {};
                                                        const secondaryButton = currentProps.secondaryButton || {};
                                                        updateSectionProps(editingSection.index, {
                                                            secondaryButton: { ...secondaryButton, label: e.target.value }
                                                        });
                                                    }}
                                                    className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.secondaryButton?.link || ''}
                                                    placeholder="Link secundario"
                                                    onChange={(e) => {
                                                        const currentProps = sections[editingSection.index].props || {};
                                                        const secondaryButton = currentProps.secondaryButton || {};
                                                        updateSectionProps(editingSection.index, {
                                                            secondaryButton: { ...secondaryButton, link: e.target.value }
                                                        });
                                                    }}
                                                    className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Colores</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Acento</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.accentColor || '#f27f0d'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { accentColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Overlay</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.overlayColor || '#221910'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { overlayColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Opac.</label>
                                                    <input
                                                        type="number"
                                                        step="0.05"
                                                        min="0"
                                                        max="1"
                                                        value={sections[editingSection.index].props?.styles?.overlayOpacity ?? 0.85}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { overlayOpacity: Number(e.target.value) })}
                                                        className="w-20 px-2 py-0.5 rounded border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[11px]"
                                                        placeholder="Opacidad"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingSection.type === 'AboutMission' && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Contenido</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.eyebrow || ''}
                                                    placeholder="Eyebrow"
                                                    onChange={(e) => updateSectionProps(editingSection.index, { eyebrow: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.title || ''}
                                                    placeholder="Titulo"
                                                    onChange={(e) => updateSectionProps(editingSection.index, { title: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[11px] font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Parrafos</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                            {(Array.isArray(sections[editingSection.index].props?.paragraphs)
                                                ? sections[editingSection.index].props.paragraphs
                                                : []
                                            ).map((paragraph, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <textarea
                                                        value={paragraph}
                                                        placeholder={`Parrafo ${idx + 1}`}
                                                        rows={2}
                                                        onChange={(e) => {
                                                            const currentParagraphs = Array.isArray(sections[editingSection.index].props?.paragraphs)
                                                                ? [...sections[editingSection.index].props.paragraphs]
                                                                : [];
                                                            currentParagraphs[idx] = e.target.value;
                                                            updateSectionProps(editingSection.index, { paragraphs: currentParagraphs });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentParagraphs = Array.isArray(sections[editingSection.index].props?.paragraphs)
                                                                ? [...sections[editingSection.index].props.paragraphs]
                                                                : [];
                                                            currentParagraphs.splice(idx, 1);
                                                            updateSectionProps(editingSection.index, { paragraphs: currentParagraphs });
                                                        }}
                                                        className="text-[9px] font-bold text-red-500 hover:text-red-600"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentParagraphs = Array.isArray(sections[editingSection.index].props?.paragraphs)
                                                        ? [...sections[editingSection.index].props.paragraphs]
                                                        : [];
                                                    currentParagraphs.push('Nuevo parrafo');
                                                    updateSectionProps(editingSection.index, { paragraphs: currentParagraphs });
                                                }}
                                                className="w-full py-1.5 border border-dashed border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[9px] font-bold text-[#8a7560] hover:border-primary hover:text-primary transition-colors"
                                            >
                                                + Agregar parrafo
                                            </button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Highlights</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                            {(Array.isArray(sections[editingSection.index].props?.highlights)
                                                ? sections[editingSection.index].props.highlights
                                                : []
                                            ).map((item, itemIndex) => (
                                                <div key={itemIndex} className="p-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold uppercase text-[#8a7560] tracking-widest">Item {itemIndex + 1}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const currentItems = Array.isArray(sections[editingSection.index].props?.highlights)
                                                                    ? [...sections[editingSection.index].props.highlights]
                                                                    : [];
                                                                currentItems.splice(itemIndex, 1);
                                                                updateSectionProps(editingSection.index, { highlights: currentItems });
                                                            }}
                                                            className="text-[9px] font-bold text-red-500 hover:text-red-600"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                    <select
                                                        value={item.icon || 'verified'}
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.highlights)
                                                                ? [...sections[editingSection.index].props.highlights]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, icon: e.target.value };
                                                            updateSectionProps(editingSection.index, { highlights: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    >
                                                        <option value="verified">Verificado</option>
                                                        <option value="eco">Eco</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={item.title || ''}
                                                        placeholder="Titulo"
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.highlights)
                                                                ? [...sections[editingSection.index].props.highlights]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, title: e.target.value };
                                                            updateSectionProps(editingSection.index, { highlights: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <textarea
                                                        value={item.text || ''}
                                                        placeholder="Texto"
                                                        rows={2}
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.highlights)
                                                                ? [...sections[editingSection.index].props.highlights]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, text: e.target.value };
                                                            updateSectionProps(editingSection.index, { highlights: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentItems = Array.isArray(sections[editingSection.index].props?.highlights)
                                                        ? [...sections[editingSection.index].props.highlights]
                                                        : [];
                                                    currentItems.push({ icon: 'verified', title: 'Nuevo item', text: 'Descripcion' });
                                                    updateSectionProps(editingSection.index, { highlights: currentItems });
                                                }}
                                                className="w-full py-1.5 border border-dashed border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[9px] font-bold text-[#8a7560] hover:border-primary hover:text-primary transition-colors"
                                            >
                                                + Agregar item
                                            </button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Imagen</p>
                                            <div className="flex flex-wrap gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer w-fit">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => handleSectionImageUpload(event, editingSection.index, 'image')}
                                                        className="hidden"
                                                        disabled={heroUploading}
                                                    />
                                                    {heroUploading ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            <span>Subiendo...</span>
                                                        </>
                                                    ) : (
                                                        <span>Subir imagen</span>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Colores</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Fondo</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.backgroundColor || '#ffffff'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { backgroundColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Acento</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.accentColor || '#f27f0d'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { accentColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingSection.type === 'AboutStats' && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Items</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                            {(Array.isArray(sections[editingSection.index].props?.items)
                                                ? sections[editingSection.index].props.items
                                                : []
                                            ).map((item, itemIndex) => (
                                                <div key={itemIndex} className="p-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold uppercase text-[#8a7560] tracking-widest">Item {itemIndex + 1}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                    ? [...sections[editingSection.index].props.items]
                                                                    : [];
                                                                currentItems.splice(itemIndex, 1);
                                                                updateSectionProps(editingSection.index, { items: currentItems });
                                                            }}
                                                            className="text-[9px] font-bold text-red-500 hover:text-red-600"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={item.value || ''}
                                                        placeholder="Valor"
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                ? [...sections[editingSection.index].props.items]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, value: e.target.value };
                                                            updateSectionProps(editingSection.index, { items: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px] font-bold"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.label || ''}
                                                        placeholder="Etiqueta"
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                ? [...sections[editingSection.index].props.items]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, label: e.target.value };
                                                            updateSectionProps(editingSection.index, { items: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <label className="flex items-center gap-2 text-[9px] text-[#8a7560]">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!item.accent}
                                                            onChange={(e) => {
                                                                const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                    ? [...sections[editingSection.index].props.items]
                                                                    : [];
                                                                const currentItem = currentItems[itemIndex] || {};
                                                                currentItems[itemIndex] = { ...currentItem, accent: e.target.checked };
                                                                updateSectionProps(editingSection.index, { items: currentItems });
                                                            }}
                                                            className="rounded border-[#e5e1de] text-primary focus:ring-primary"
                                                        />
                                                        Destacar color
                                                    </label>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                        ? [...sections[editingSection.index].props.items]
                                                        : [];
                                                    currentItems.push({ value: '0', label: 'Nuevo dato' });
                                                    updateSectionProps(editingSection.index, { items: currentItems });
                                                }}
                                                className="w-full py-1.5 border border-dashed border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[9px] font-bold text-[#8a7560] hover:border-primary hover:text-primary transition-colors"
                                            >
                                                + Agregar item
                                            </button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Colores</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Fondo</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.backgroundColor || '#181411'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { backgroundColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Acento</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.accentColor || '#f27f0d'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { accentColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingSection.type === 'AboutValues' && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Contenido</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.title || ''}
                                                    placeholder="Titulo"
                                                    onChange={(e) => updateSectionProps(editingSection.index, { title: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[11px] font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Items</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                            {(Array.isArray(sections[editingSection.index].props?.items)
                                                ? sections[editingSection.index].props.items
                                                : []
                                            ).map((item, itemIndex) => (
                                                <div key={itemIndex} className="p-2 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold uppercase text-[#8a7560] tracking-widest">Item {itemIndex + 1}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                    ? [...sections[editingSection.index].props.items]
                                                                    : [];
                                                                currentItems.splice(itemIndex, 1);
                                                                updateSectionProps(editingSection.index, { items: currentItems });
                                                            }}
                                                            className="text-[9px] font-bold text-red-500 hover:text-red-600"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                    <select
                                                        value={item.icon || 'quality'}
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                ? [...sections[editingSection.index].props.items]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, icon: e.target.value };
                                                            updateSectionProps(editingSection.index, { items: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    >
                                                        <option value="quality">Calidad</option>
                                                        <option value="commitment">Compromiso</option>
                                                        <option value="innovation">Innovacion</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={item.title || ''}
                                                        placeholder="Titulo"
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                ? [...sections[editingSection.index].props.items]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, title: e.target.value };
                                                            updateSectionProps(editingSection.index, { items: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <textarea
                                                        value={item.description || ''}
                                                        placeholder="Descripcion"
                                                        rows={2}
                                                        onChange={(e) => {
                                                            const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                                ? [...sections[editingSection.index].props.items]
                                                                : [];
                                                            const currentItem = currentItems[itemIndex] || {};
                                                            currentItems[itemIndex] = { ...currentItem, description: e.target.value };
                                                            updateSectionProps(editingSection.index, { items: currentItems });
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentItems = Array.isArray(sections[editingSection.index].props?.items)
                                                        ? [...sections[editingSection.index].props.items]
                                                        : [];
                                                    currentItems.push({ icon: 'quality', title: 'Nuevo valor', description: 'Descripcion' });
                                                    updateSectionProps(editingSection.index, { items: currentItems });
                                                }}
                                                className="w-full py-1.5 border border-dashed border-[#e5e1de] dark:border-[#3d2f21] rounded-xl text-[9px] font-bold text-[#8a7560] hover:border-primary hover:text-primary transition-colors"
                                            >
                                                + Agregar item
                                            </button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Colores</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Fondo</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.backgroundColor || '#f8f7f5'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { backgroundColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Acento</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.accentColor || '#f27f0d'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { accentColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Tarjeta</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.cardBackground || '#ffffff'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { cardBackground: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingSection.type === 'AboutTeam' && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Contenido</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.anchor || ''}
                                                        placeholder="Anchor"
                                                        onChange={(e) => updateSectionProps(editingSection.index, { anchor: e.target.value })}
                                                        className="col-span-1 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.title || ''}
                                                        placeholder="Titulo"
                                                        onChange={(e) => updateSectionProps(editingSection.index, { title: e.target.value })}
                                                        className="col-span-2 px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[11px] font-bold"
                                                    />
                                                </div>
                                                <textarea
                                                    value={sections[editingSection.index].props?.quote || ''}
                                                    placeholder="Cita"
                                                    rows={1}
                                                    onChange={(e) => updateSectionProps(editingSection.index, { quote: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.author || ''}
                                                        placeholder="Autor"
                                                        onChange={(e) => updateSectionProps(editingSection.index, { author: e.target.value })}
                                                        className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.role || ''}
                                                        placeholder="Rol"
                                                        onChange={(e) => updateSectionProps(editingSection.index, { role: e.target.value })}
                                                        className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Imagenes</p>
                                            <div className="flex flex-wrap gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer w-fit">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => handleSectionImageUpload(event, editingSection.index, 'avatarImage')}
                                                        className="hidden"
                                                        disabled={heroUploading}
                                                    />
                                                    {heroUploading ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            <span>Subiendo...</span>
                                                        </>
                                                    ) : (
                                                        <span>Avatar</span>
                                                    )}
                                                </label>
                                                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer w-fit">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => handleSectionImageUpload(event, editingSection.index, 'backgroundImage')}
                                                        className="hidden"
                                                        disabled={heroUploading}
                                                    />
                                                    {heroUploading ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            <span>Subiendo...</span>
                                                        </>
                                                    ) : (
                                                        <span>Fondo</span>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Colores</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Fondo</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.backgroundColor || '#f27f0d'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { backgroundColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Overlay</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.overlayColor || '#000000'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { overlayColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Opac.</label>
                                                    <input
                                                        type="number"
                                                        step="0.05"
                                                        min="0"
                                                        max="1"
                                                        value={sections[editingSection.index].props?.styles?.overlayOpacity ?? 0.25}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { overlayOpacity: Number(e.target.value) })}
                                                        className="w-20 px-2 py-0.5 rounded border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-[11px]"
                                                        placeholder="Opacidad"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingSection.type === 'AboutCTA' && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Contenido</p>
                                            <div className="space-y-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <input
                                                    type="text"
                                                    value={sections[editingSection.index].props?.title || ''}
                                                    placeholder="Titulo"
                                                    onChange={(e) => updateSectionProps(editingSection.index, { title: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[11px] font-bold"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.primaryLink?.label || ''}
                                                        placeholder="Texto primario"
                                                        onChange={(e) => {
                                                            const currentProps = sections[editingSection.index].props || {};
                                                            const primaryLink = currentProps.primaryLink || {};
                                                            updateSectionProps(editingSection.index, { primaryLink: { ...primaryLink, label: e.target.value } });
                                                        }}
                                                        className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.primaryLink?.link || ''}
                                                        placeholder="Link primario"
                                                        onChange={(e) => {
                                                            const currentProps = sections[editingSection.index].props || {};
                                                            const primaryLink = currentProps.primaryLink || {};
                                                            updateSectionProps(editingSection.index, { primaryLink: { ...primaryLink, link: e.target.value } });
                                                        }}
                                                        className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.secondaryLink?.label || ''}
                                                        placeholder="Texto secundario"
                                                        onChange={(e) => {
                                                            const currentProps = sections[editingSection.index].props || {};
                                                            const secondaryLink = currentProps.secondaryLink || {};
                                                            updateSectionProps(editingSection.index, { secondaryLink: { ...secondaryLink, label: e.target.value } });
                                                        }}
                                                        className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={sections[editingSection.index].props?.secondaryLink?.link || ''}
                                                        placeholder="Link secundario"
                                                        onChange={(e) => {
                                                            const currentProps = sections[editingSection.index].props || {};
                                                            const secondaryLink = currentProps.secondaryLink || {};
                                                            updateSectionProps(editingSection.index, { secondaryLink: { ...secondaryLink, link: e.target.value } });
                                                        }}
                                                        className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c] text-[10px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-[#8a7560] tracking-widest mb-2">Colores</p>
                                            <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-white/5 p-2.5 rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Fondo</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.backgroundColor || '#ffffff'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { backgroundColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <label className="text-[8px] font-bold uppercase text-[#8a7560] tracking-wider">Acento</label>
                                                    <input
                                                        type="color"
                                                        value={sections[editingSection.index].props?.styles?.accentColor || '#f27f0d'}
                                                        onChange={(e) => updateSectionStyles(editingSection.index, { accentColor: e.target.value })}
                                                        className="w-8 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'home' || activeTab === 'about' ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black uppercase text-[#8a7560] tracking-widest">Bloques</p>
                                    <button
                                        onClick={() => setShowAddSection(!showAddSection)}
                                        className="p-1 px-3 rounded-xl bg-primary text-white text-[10px] font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-lg shadow-primary/20"
                                    >
                                        + AÑADIR
                                    </button>
                                </div>

                                {showAddSection && (
                                    <div className="p-4 bg-zinc-50 dark:bg-white/5 border border-primary/20 rounded-2xl grid grid-cols-1 gap-2 animate-in zoom-in-95 duration-300">
                                        {activeTab === 'home' ? (
                                            <>
                                                <button onClick={() => handleAddSection('HeroSlider')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Hero Slider</button>
                                                <button onClick={() => handleAddSection('FeaturedProducts')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Productos Destacados</button>
                                                <button onClick={() => handleAddSection('Services')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Servicios / Beneficios</button>
                                            </>
                                        ) : null}
                                        {activeTab === 'about' ? (
                                            <>
                                                <button onClick={() => handleAddSection('AboutHero')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Hero Sobre Nosotros</button>
                                                <button onClick={() => handleAddSection('AboutMission')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Mision</button>
                                                <button onClick={() => handleAddSection('AboutStats')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Numeros</button>
                                                <button onClick={() => handleAddSection('AboutValues')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Valores</button>
                                                <button onClick={() => handleAddSection('AboutTeam')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">Equipo</button>
                                                <button onClick={() => handleAddSection('AboutCTA')} className="py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a130c] border border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all shadow-sm">CTA</button>
                                            </>
                                        ) : null}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {sections.map((section, idx) => {
                                        const moveDirection = moveAnimations[section.id];
                                        const moveClass = moveDirection
                                            ? `animate-in ${moveDirection < 0 ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} fade-in duration-300`
                                            : '';
                                        return (
                                            <div
                                                key={section.id}
                                                onClick={() => setEditingSection({ ...section, index: idx })}
                                                className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group hover:-translate-y-0.5 ${moveClass} ${editingSection?.index === idx ? 'border-primary bg-primary/5 shadow-sm' : 'bg-[#f5f2f0] dark:bg-[#2c2116] border-[#e5e1de] dark:border-[#3d2f21] hover:border-primary/50 hover:shadow-md'}`}
                                            >
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div className="flex flex-col items-center gap-1 px-1.5 py-1 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white/80 dark:bg-[#1a130c]">
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, -1); }} className="text-[10px] text-[#8a7560] hover:text-primary transition-colors">?</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 1); }} className="text-[10px] text-[#8a7560] hover:text-primary transition-colors">?</button>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-[#181411] dark:text-white leading-tight truncate">{section.type.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold ${section.enabled ? 'text-emerald-600' : 'text-[#8a7560]'}`}>{section.enabled ? 'Visible' : 'Oculto'}</span>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${section.enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newSections = [...sections];
                                                        newSections[idx].enabled = !newSections[idx].enabled;
                                                        setSections(newSections);
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${section.enabled ? 'text-green-500 bg-green-500/10' : 'text-zinc-400 bg-zinc-400/10'}`}
                                                >
                                                    {section.enabled ? '?' : '?'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-[#2c2116] border-t border-[#e5e1de] dark:border-[#3d2f21]">
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="w-full bg-primary text-white py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Guardando...</span>
                                </div>
                            ) : 'Guardar Cambios'}
                        </button>
                    </div>
                </aside>
                ) : null}

                {/* Preview Canvas */}
                <main className={`flex-1 overflow-y-auto ${clientPreviewMode ? 'bg-white dark:bg-[#120c08] p-0' : 'bg-[#8f9296] p-4'}`}>
                    <div className={`${clientPreviewMode ? 'w-full min-h-full bg-white dark:bg-[#1a130c]' : 'max-w-[1320px] mx-auto bg-white dark:bg-[#1a130c] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.35)] rounded-[18px] overflow-hidden border border-[#d4d4d4] dark:border-[#3d2f21]'} ${effectivePreviewPointerClass}`}>
                        <PageBuilder sections={previewSections} />
                        <Footer />
                    </div>
                </main>
            </div>
        </AdminLayout>
    );
}






























