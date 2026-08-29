export const PIQUIM_CATALOG_CARDS = [
    {
        id: 'heladeria',
        title: 'Heladeria',
        prefix: '01 - Frio que enamora',
        description: 'Materia prima para la elaboracion de helados artesanales, bases estables y terminaciones con sabor propio.',
        buttonLabel: 'Ver catalogo',
        tags: ['Pulpas', 'Variegattos', 'Bases', 'Neutros'],
        image: '/piquim/catalogo/card-heladeria-piquim.jpeg',
        objectPosition: 'center 42%',
        category: 'heladeria',
        categorySlug: 'heladeria',
        overlay: 'linear-gradient(180deg, rgba(15, 92, 151, 0.16) 0%, rgba(12, 26, 42, 0.84) 100%)',
    },
    {
        id: 'panaderia',
        title: 'Panaderia/Confiteria',
        prefix: '02 - Hornear y decorar',
        description: 'Premezclas, mejoradores, cremas y bases para panaderia, reposteria y confiteria profesional.',
        buttonLabel: 'Ver catalogo',
        tags: ['Premezclas', 'Mejoradores', 'Cremas', 'DDL'],
        image: '/piquim/catalogo/card-panaderia-piquim.jpeg',
        objectPosition: 'center 40%',
        category: 'panaderia',
        categorySlug: 'panaderia',
        overlay: 'linear-gradient(180deg, rgba(255, 150, 64, 0.12) 0%, rgba(39, 22, 12, 0.86) 100%)',
    },
];

export const PIQUIM_FOOTER_DEFAULTS = {
    description: 'Materia prima premium para heladerias, panaderias y confiterias. Mar del Plata, desde 1992.',
    legalText: '© 2026 Piquim Profesional S.A.  ·  Mar del Plata, Argentina  ·  CUIT 30-XXXXXXXX-X',
    newsletter: {
        enabled: true,
        title: 'Novedades para profesionales',
        description: 'Recibi lanzamientos, promociones y catalogos tecnicos en tu correo.',
        placeholder: 'tu@email.com',
        buttonLabel: 'Suscribirme',
    },
    shopLinks: [
        { label: 'Heladeria', href: '/catalog?category=heladeria' },
        { label: 'Panaderia/Confiteria', href: '/catalog?category=panaderia' },
        { label: 'Promociones', href: '/catalog' },
    ],
    helpLinks: [
        { label: 'Envios y entregas', href: '/about' },
        { label: 'Pagos y facturacion', href: '/checkout' },
        { label: 'Cambios y devoluciones', href: '/about' },
        { label: 'Preguntas frecuentes', href: '/about' },
    ],
    accountLinks: [
        { label: 'Iniciar sesion', href: '/login' },
        { label: 'Crear cuenta', href: '/signup' },
        { label: 'Mi perfil', href: '/profile' },
        { label: 'Favoritos', href: '/profile?section=favorites' },
    ],
    legalLinks: [
        { label: 'Terminos', href: '/terms' },
        { label: 'Privacidad', href: '/privacy' },
        { label: 'Cookies', href: '/privacy' },
        { label: 'Defensa al consumidor', href: '/about' },
    ],
    socialLinks: [],
};

export const PIQUIM_STOREFRONT_THEME = {
    mode: 'light',
    primary: '#ff4d00',
    accent: '#ff7a2f',
    background: '#fffaf6',
    text: '#1a1614',
    secondary: '#6f625d',
    font_family: 'Gilroy, Manrope, sans-serif',
    catalog: {
        panel_bg: '#fff3eb',
        surface_bg: '#fffaf6',
        card_bg: '#ffffff',
        border: '#dab6a6',
        muted_text: '#7b665d',
    },
};
