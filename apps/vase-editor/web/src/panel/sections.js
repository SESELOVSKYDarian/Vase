// Estructura del panel nuevo: menú, títulos, ayuda por sección y a qué módulo del panel anterior
// lleva cada sección mientras se rehace.

export const SETTINGS_PAGES = [
    { id: 'precios', label: 'Precios y listas', subtitle: 'Quién ve precios y qué precio usa cada lista' },
    { id: 'pagos', label: 'Pagos', subtitle: 'Cómo terminan la compra tus clientes' },
    { id: 'sucursales', label: 'Sucursales y retiro', subtitle: 'Dónde están y dónde pueden retirar' },
    { id: 'seo', label: 'Google, redes y SEO', subtitle: 'Cómo te encuentran y cómo te ven al compartir' },
    { id: 'dominio', label: 'Dominio', subtitle: 'La dirección de tu tienda' },
    { id: 'correo', label: 'Correo', subtitle: 'Desde dónde salen los avisos' },
    { id: 'gestion', label: 'Sistema de gestión', subtitle: 'Productos, precios y stock automáticos' },
    { id: 'equipo', label: 'Equipo', subtitle: 'Quién entra al panel' },
];

export const MENU = [
    {
        group: 'Principal',
        items: [
            { id: 'resumen', label: 'Resumen', icon: 'grid' },
            { id: 'pedidos', label: 'Pedidos', icon: 'bag', badge: 'payments' },
            { id: 'clientes', label: 'Clientes', icon: 'user', badge: 'users' },
        ],
    },
    {
        group: 'Tu tienda',
        items: [
            { id: 'catalogo', label: 'Catálogo', icon: 'box' },
            { id: 'imagenes', label: 'Imágenes', icon: 'image' },
            { id: 'envios', label: 'Envíos', icon: 'truck' },
            { id: 'diseno', label: 'Diseño de la tienda', icon: 'layout' },
        ],
    },
];

export const SECTIONS = {
    resumen: { title: 'Resumen', subtitle: 'Esto es lo que pasa hoy en tu tienda' },
    pedidos: { title: 'Pedidos', subtitle: 'Todo lo que entra por la tienda' },
    clientes: { title: 'Clientes', subtitle: 'Quién compra y quién espera aprobación' },
    catalogo: { title: 'Catálogo', subtitle: 'Productos, categorías, marcas, ofertas y precios' },
    imagenes: { title: 'Imágenes', subtitle: 'Todas las fotos de tu tienda en un lugar' },
    envios: { title: 'Envíos', subtitle: 'Hasta dónde llegás y cuánto cobrás' },
    diseno: { title: 'Diseño de la tienda', subtitle: 'Bloques, textos, fotos, colores y pie de página' },
    ajustes: { title: 'Ajustes', subtitle: 'Lo que se configura una vez' },
};

export const HELP = {
    resumen: [['Entender el resumen', '1 min'], ['Confirmar un pago', '30 s']],
    pedidos: [['Cambiar el estado de un pedido', '30 s'], ['Ver el comprobante', '30 s'], ['Pedidos por WhatsApp', '1 min']],
    clientes: [['Aprobar un cliente', '30 s'], ['Pasar un cliente a mayorista', '30 s'], ['Bloquear un cliente', '30 s']],
    catalogo: [['Cambiar precio o stock', '30 s'], ['Crear una oferta', '1 min'], ['Subir precios de un rubro', '1 min'], ['¿Por qué volvió a cambiar un precio?', 'FAQ']],
    imagenes: [['Subir y reemplazar imágenes', '1 min'], ['Liberar espacio', '30 s']],
    envios: [['Cobrar el envío por distancia', '2 min'], ['Zonas especiales', '1 min']],
    diseno: [['Cambiar la portada', '1 min'], ['Agregar u ordenar bloques', '1 min'], ['Editar el pie de página', '1 min']],
    ajustes: [['Pedido por WhatsApp', '1 min'], ['Configurar el correo', '3 min'], ['Conectar tu dominio', '5 min']],
};

export const HELP_SECTIONS = [
    ['Resumen y pedidos', 4], ['Clientes', 3], ['Catálogo, ofertas y precios', 7], ['Envíos', 2], ['Diseño de la tienda', 5], ['Ajustes', 6],
];

const SECTION_IDS = new Set(Object.keys(SECTIONS));
const SETTINGS_IDS = new Set(SETTINGS_PAGES.map((page) => page.id));

// /admin → resumen · /admin/catalogo → catalogo · /admin/ajustes/correo → ajustes + correo
export function parsePanelPath(pathname) {
    const parts = String(pathname || '').replace(/^\/admin\/?/, '').split('/').filter(Boolean);
    const section = SECTION_IDS.has(parts[0]) ? parts[0] : 'resumen';
    const sub = section === 'ajustes' && SETTINGS_IDS.has(parts[1]) ? parts[1] : null;
    return { section, sub };
}

export function panelPath(section, sub = null) {
    if (!section || section === 'resumen') return '/admin';
    return sub ? `/admin/${section}/${sub}` : `/admin/${section}`;
}
