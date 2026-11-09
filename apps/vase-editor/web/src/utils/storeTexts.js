// Textos de la tienda que se cambian desde Diseño. Vacío = el texto de siempre.
export const STORE_TEXT_DEFAULTS = {
    header: {
        search_placeholder: 'Busca productos, categorias o marcas',
        products_label: 'Productos',
        about_label: 'Sobre nosotros',
        contact_label: 'Contactanos',
        help_title: '¿Necesitas ayuda?',
        help_text: 'Escribenos por WhatsApp',
    },
    footer: {
        links_title: 'Enlaces Rapidos',
        contact_title: 'Contacto',
        whatsapp_title: 'Atencion WhatsApp',
        whatsapp_text: 'Contactanos directamente para presupuestos rapidos.',
        whatsapp_button: 'Enviar mensaje',
    },
    catalog: {
        badge: 'Catalogo completo',
        title: 'Todos los productos',
        description: 'Catalogo online para consultar productos, disponibilidad y opciones comerciales.',
        empty_title: 'No encontramos productos para esta busqueda.',
        empty_text: 'Prueba con otra categoria, otra marca o limpia los filtros activos.',
    },
};

export function storeText(group, key, source) {
    return String(source?.[key] || '').trim() || STORE_TEXT_DEFAULTS[group][key];
}

const normalizeLabel = (value) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// El menú de las tiendas sin plantilla propia ya trae estas entradas: un link con este nombre no se repite,
// salvo que se haya agregado desde el editor (custom).
const RESERVED_NAV_LABELS = ['inicio', 'home', 'catalogo', 'catalog', 'productos', 'sobre nosotros', 'nosotros', 'contactanos', 'contacto', 'whatsapp', 'ofertas'];

export const isExtraNavLink = (link) => Boolean(link?.custom) || !RESERVED_NAV_LABELS.includes(normalizeLabel(link?.label));
