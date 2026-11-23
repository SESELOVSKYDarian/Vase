// Los 4 productos de Vase y lo que trae cada uno. Las características se prenden o apagan por cliente
// desde Admin › Clientes › ficha › Productos y plan. Por defecto, todas prendidas.

export type ProductId = "business" | "labs" | "management" | "rest";
export type ProductFeature = { key: string; name: string; description: string; section?: string };
export type AdminProduct = {
  id: ProductId;
  moduleId: string;
  name: string;
  tagline: string;
  features: ProductFeature[];
};

export const ADMIN_PRODUCTS: AdminProduct[] = [
  {
    id: "business",
    moduleId: "vase_business",
    name: "Vase Business",
    tagline: "Tienda online con catálogo, pedidos y envíos",
    features: [
      { key: "pedidos", section: "pedidos", name: "Pedidos", description: "Ver, cobrar y cambiar el estado de lo que entra por la tienda." },
      { key: "clientes", section: "clientes", name: "Clientes", description: "Aprobar, bloquear y pasar clientes a mayorista." },
      { key: "catalogo", section: "catalogo", name: "Catálogo", description: "Productos, categorías, marcas, stock y precios." },
      { key: "ofertas", name: "Ofertas", description: "Crear ofertas y precios tachados." },
      { key: "envios", section: "envios", name: "Envíos", description: "Zonas, costo por distancia y retiro en sucursal." },
      { key: "diseno", section: "diseno", name: "Diseño de la tienda", description: "Bloques, portada, colores y pie de página." },
      { key: "precios", section: "precios", name: "Listas de precios", description: "Precios distintos por lista y quién ve precios." },
      { key: "pagos", section: "pagos", name: "Pagos online", description: "Cobrar con Mercado Pago u otros medios al comprar." },
      { key: "sucursales", section: "sucursales", name: "Sucursales y retiro", description: "Varias sucursales con puntos de retiro." },
      { key: "seo", section: "seo", name: "Google, redes y SEO", description: "Cómo se ve la tienda en Google y al compartir." },
      { key: "dominio", section: "dominio", name: "Dominio propio", description: "Usar su propia dirección (tienda.com)." },
      { key: "correo", section: "correo", name: "Correo propio", description: "Que los avisos salgan desde su correo." },
      { key: "pedido_whatsapp", name: "Pedido por WhatsApp", description: "El carrito termina en un mensaje de WhatsApp." },
    ],
  },
  {
    id: "labs",
    moduleId: "vase_labs",
    name: "Vase Labs",
    tagline: "Asistente con IA para WhatsApp, Instagram y Facebook",
    features: [
      { key: "whatsapp", name: "WhatsApp", description: "Responder por WhatsApp con la IA." },
      { key: "instagram", name: "Instagram", description: "Responder mensajes directos de Instagram." },
      { key: "facebook", name: "Facebook", description: "Responder por Messenger." },
      { key: "pedidos_chat", name: "Pedidos por chat", description: "La IA arma el pedido y lo pasa a Business." },
      { key: "presupuestos", name: "Presupuestos en PDF", description: "Mandar presupuestos en PDF por el chat." },
      { key: "marketing", name: "Marketing con IA", description: "Ideas, textos e imágenes para redes." },
      { key: "entrenador", name: "Entrenar por WhatsApp", description: "Enseñarle a la IA mandándole audios o archivos." },
      { key: "derivar_persona", name: "Pasar a una persona", description: "Que la IA derive la charla a alguien del equipo." },
    ],
  },
  {
    id: "management",
    moduleId: "vase_management",
    name: "Vase Management",
    tagline: "Gestión de stock, precios y productos conectada a la tienda",
    features: [
      { key: "stock", name: "Stock", description: "Control de stock por sucursal." },
      { key: "precios_masivos", name: "Precios masivos", description: "Subir precios por rubro o proveedor." },
      { key: "sincronizacion", name: "Sincronizar con la tienda", description: "Que el catálogo de Business salga de Management." },
      { key: "usuarios", name: "Varios usuarios", description: "Que más de una persona use Management." },
    ],
  },
  {
    id: "rest",
    moduleId: "vase_rest",
    name: "Vase Rest",
    tagline: "Restaurantes: carta, mesas y comandas",
    features: [
      { key: "carta", name: "Carta digital", description: "Carta con QR para las mesas." },
      { key: "mesas", name: "Mesas y comandas", description: "Tomar pedidos por mesa y mandarlos a cocina." },
      { key: "delivery", name: "Delivery", description: "Pedidos para llevar y envío." },
      { key: "estadisticas", name: "Estadísticas", description: "Ventas por plato, horario y mozo." },
    ],
  },
];

export function getAdminProduct(id: string) {
  return ADMIN_PRODUCTS.find((product) => product.id === id) ?? null;
}

export function productForModule(moduleId: string) {
  return ADMIN_PRODUCTS.find((product) => product.moduleId === moduleId) ?? null;
}
