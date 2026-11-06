// Contenido de help.vase.ar.
//
// El panel nuevo de Vase Business (apps/vase-editor/web/src/panel/sections.js) linkea así:
//   help.vase.ar/?q=<título de la guía>   → tiene que coincidir con `title` de una guía
//   help.vase.ar/?seccion=<nombre>        → tiene que coincidir con `label` de una sección
// Si cambiás un título acá, cambialo también en HELP de sections.js (o sumalo en `aliases`).

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "warn"; text: string }
  | { type: "faq"; q: string; a: string };

export type Guide = {
  slug: string;
  title: string;
  aliases?: string[];
  section: string;
  screen: string;
  time: string;
  summary: string;
  status: "listo" | "borrador";
  /** seconds: duración real del video, la que se muestra en la página. */
  video?: { src: string; poster: string; seconds: number };
  body: Block[];
};

export type Section = {
  slug: string;
  label: string;
  aliases?: string[];
  description: string;
};

export const SECTIONS: Section[] = [
  { slug: "resumen-y-pedidos", label: "Resumen y pedidos", aliases: ["Resumen", "Pedidos"], description: "Lo que pasa hoy en tu tienda, pagos y estados de pedidos." },
  { slug: "clientes", label: "Clientes", description: "Aprobar, bloquear y pasar clientes a mayorista." },
  { slug: "catalogo", label: "Catálogo, ofertas y precios", aliases: ["Catálogo", "Catalogo", "Ofertas", "Precios"], description: "Productos, stock, ofertas y cambios de precio en bloque." },
  { slug: "envios", label: "Envíos", description: "Hasta dónde llegás y cuánto cobrás." },
  { slug: "diseno", label: "Diseño de la tienda", aliases: ["Diseño", "Diseno", "Imágenes", "Imagenes"], description: "Portada, bloques, pie de página e imágenes." },
  { slug: "ajustes", label: "Ajustes", description: "Correo, dominio, WhatsApp y lo que se configura una vez." },
  { slug: "programadores", label: "Datos técnicos para el programador", aliases: ["programadores"], description: "JSON, cURL y claves para conectar tu sistema." },
];

const video = (slug: string, seconds: number) => ({ src: `/videos/${slug}.mp4`, poster: `/videos/${slug}.jpg`, seconds });

const draft = (slug: string, title: string, section: string, screen: string, time: string, summary: string, aliases?: string[]): Guide => ({
  slug, title, section, screen, time, summary, aliases, status: "borrador", body: [],
});

export const GUIDES: Guide[] = [
  // ---------------------------------------------------------------- Catálogo (piloto)
  {
    slug: "cambiar-precio-o-stock",
    title: "Cambiar precio o stock",
    section: "catalogo",
    screen: "Catálogo › Productos",
    time: "30 s",
    summary: "Sumá o restá stock desde la lista y cambiá el precio desde la ficha del producto.",
    status: "listo",
    video: video("cambiar-precio-o-stock", 38),
    body: [
      { type: "h", text: "Stock: directo desde la lista" },
      { type: "steps", items: [
        "Entrá a Catálogo. Se abre la pestaña Productos.",
        "Buscá el producto por nombre, SKU o marca, o filtrá por rubro con los botones de arriba.",
        "En la columna Stock tocá + para sumar uno o − para restar uno. Se guarda en el momento.",
      ] },
      { type: "tip", text: "Si el stock llega a 0, el número se marca y el botón − se apaga." },
      { type: "h", text: "Precio (o mucho stock de una vez): desde la ficha" },
      { type: "steps", items: [
        "Tocá la fila del producto. Se abre su ficha a la derecha, en la pestaña Datos.",
        "Cambiá el Precio, o escribí el Stock nuevo.",
        "Tocá Guardar. Vas a ver el aviso “Producto guardado” y el cambio ya está en la tienda.",
      ] },
      { type: "h", text: "Si el producto viene de tu sistema de gestión" },
      { type: "p", text: "Los productos sincronizados traen precio y stock de tu sistema. Si cambiás el precio en el panel, la próxima sincronización vuelve a poner el del sistema." },
      { type: "steps", items: [
        "En la ficha del producto andá a la pestaña Más.",
        "Activá “No pisar mis cambios”.",
        "Tocá Guardar.",
      ] },
      { type: "warn", text: "Con “No pisar mis cambios” la sincronización deja de tocar nombre, SKU, descripción, marca y precio. El stock se sigue actualizando desde tu sistema." },
      { type: "h", text: "Productos con varios precios" },
      { type: "p", text: "Si en la columna Precio ves “3 precios ▾”, ese producto trae varios precios de tu sistema (por ejemplo minorista y mayorista). Tocalo para verlos. Qué precio usa cada lista de clientes se elige en Ajustes › Precios y listas." },
    ],
  },
  {
    slug: "crear-una-oferta",
    title: "Crear una oferta",
    section: "catalogo",
    screen: "Catálogo › Ofertas",
    time: "1 min",
    summary: "Descuento por porcentaje, por monto o precio fijo, para todo, un rubro o productos elegidos.",
    status: "listo",
    video: video("crear-una-oferta", 37),
    body: [
      { type: "steps", items: [
        "Entrá a Catálogo › Ofertas y tocá + Oferta.",
        "Poné un nombre. Es solo para vos, por ejemplo “Semana del helado”.",
        "Elegí el tipo de descuento: % de descuento, $ de descuento o Precio fijo, y escribí el valor.",
        "En “Cartel en la tienda” escribí lo que ve el cliente sobre el producto (por defecto, “Oferta”).",
        "En “¿A qué productos?” elegí Todo, Categorías (tildá las que quieras) o Productos (buscalos y sumalos).",
        "En “¿Para quién?” dejá Todos los clientes o elegí clientes puntuales.",
        "Si querés, poné fecha de inicio y de fin. Sin fechas, dura hasta que la pauses.",
        "Tocá Guardar.",
      ] },
      { type: "h", text: "Cosas que conviene saber" },
      { type: "list", items: [
        "Si un producto entra en más de una oferta, se aplica la que le deja el precio más bajo al cliente.",
        "Al elegir una categoría también entra todo lo que está adentro de ella.",
        "Con Precio fijo, si el producto ya cuesta menos que ese precio, se deja su precio.",
        "El porcentaje no puede pasar de 100.",
        "Una oferta para clientes elegidos solo la ven esos clientes cuando entran con su cuenta.",
      ] },
      { type: "tip", text: "Para frenar una oferta un tiempo, abrila y apagá “Oferta activa”. Si la eliminás, los precios vuelven a los de siempre y la tenés que crear de nuevo." },
    ],
  },
  {
    slug: "subir-precios-de-un-rubro",
    title: "Subir precios de un rubro",
    section: "catalogo",
    screen: "Catálogo › Cambiar precios",
    time: "1 min",
    summary: "Subí, bajá o fijá el precio de un rubro, una marca o todo el catálogo, con vista previa antes de aplicar.",
    status: "listo",
    video: video("subir-precios-de-un-rubro", 30),
    body: [
      { type: "p", text: "En Cambiar precios armás una frase tocando cada parte. Abajo ves cómo quedan los precios, y no cambia nada hasta que confirmás." },
      { type: "steps", items: [
        "Entrá a Catálogo › Cambiar precios.",
        "Armá la frase. Por ejemplo: Subir el precio minorista un 8 % de un rubro o categoría › Heladería para todos los clientes.",
        "Mirá “Cómo quedan”: te muestra cuántos productos cambian y el precio de antes y el de después.",
        "Tocá Aplicar y después “Sí, aplicar a N productos”.",
      ] },
      { type: "tip", text: "¿Te equivocaste antes de aplicar? Tocá Cancelar y la frase vuelve a empezar. No se cambió nada." },
      { type: "h", text: "Opciones de la frase" },
      { type: "list", items: [
        "Qué hacer: Subir, Bajar o Cambiar a (un precio exacto en pesos).",
        "Qué precio: minorista, mayorista o los dos.",
        "Cuánto: en % o en pesos.",
        "De qué: todo el catálogo, un rubro o categoría, o una marca.",
        "Para quién: todos los clientes, los clientes de una lista o ciertos clientes.",
      ] },
      { type: "h", text: "Productos de tu sistema de gestión" },
      { type: "p", text: "Si parte de esos productos vienen de tu sistema, la vista previa te avisa: en la próxima sincronización volverían al precio del sistema. Para que no pase, tildá “Mantener fijos estos precios aunque cambien en el sistema de gestión” antes de aplicar." },
      { type: "h", text: "Precio para una lista o para ciertos clientes" },
      { type: "p", text: "Si elegís una lista o clientes puntuales, no se toca el precio del producto. Se guarda un precio especial fijo solo para ellos, calculado sobre lo que pagan hoy. Ese precio no se mueve aunque después cambies el precio del producto o lo actualice tu sistema." },
      { type: "p", text: "Los ves todos abajo, en Precios especiales. Para sacar uno tocá Quitar y después “Sí, quitar”: vuelven a pagar el precio de siempre." },
    ],
  },
  {
    slug: "por-que-volvio-a-cambiar-un-precio",
    title: "¿Por qué volvió a cambiar un precio?",
    section: "catalogo",
    screen: "Catálogo",
    time: "FAQ",
    summary: "Las razones por las que un precio puede no ser el que cargaste, y cómo resolver cada una.",
    status: "listo",
    video: video("por-que-volvio-a-cambiar-un-precio", 36),
    body: [
      { type: "faq", q: "Lo cambié en el panel y al rato volvió al precio anterior", a: "El producto viene de tu sistema de gestión y la sincronización puso el precio del sistema. Arriba a la derecha del Catálogo ves “Sincronizado · hace X min”. Abrí el producto, en la pestaña Más activá “No pisar mis cambios” y guardá. Si cambiaste muchos precios con Cambiar precios, tildá “Mantener fijos estos precios” antes de aplicar." },
      { type: "faq", q: "En la tienda se ve más barato que lo que cargué", a: "Seguramente tiene una oferta activa. Fijate en Catálogo › Ofertas: si el producto entra en varias, se aplica la que deja el precio más bajo. También puede haber empezado una oferta que tenía fecha de inicio." },
      { type: "faq", q: "Un cliente ve otro precio que el resto", a: "Ese cliente está en una lista de precios que usa otro de los precios del sistema (por ejemplo, mayorista), o tiene un precio especial. Las listas se ven en Ajustes › Precios y listas, y los precios especiales en Catálogo › Cambiar precios, al final." },
      { type: "faq", q: "Subí el precio del producto pero a un cliente le sigue saliendo lo mismo", a: "Tiene un precio especial fijo. Esos precios no se mueven cuando cambia el precio del producto. Si querés que vuelva a pagar el precio normal, quitá ese precio especial en Catálogo › Cambiar precios › Precios especiales." },
      { type: "faq", q: "Borré un producto y volvió a aparecer", a: "Si viene de tu sistema y sigue existiendo allá, vuelve en la próxima sincronización. Para que no se vea, mejor ocultalo con el interruptor Visible." },
    ],
  },

  // ---------------------------------------------------------------- Resto (en preparación)
  draft("entender-el-resumen", "Entender el resumen", "resumen-y-pedidos", "Resumen", "1 min", "Qué significa cada número del resumen de hoy."),
  draft("confirmar-un-pago", "Confirmar un pago", "resumen-y-pedidos", "Resumen", "30 s", "Marcar como pagado un pedido que te transfirieron."),
  draft("cambiar-el-estado-de-un-pedido", "Cambiar el estado de un pedido", "resumen-y-pedidos", "Pedidos", "30 s", "Pasar un pedido a preparado, enviado o entregado."),
  draft("ver-el-comprobante", "Ver el comprobante", "resumen-y-pedidos", "Pedidos", "30 s", "Dónde ver el comprobante de pago que subió el cliente."),
  draft("pedidos-por-whatsapp", "Pedidos por WhatsApp", "resumen-y-pedidos", "Pedidos", "1 min", "Cómo llegan y se manejan los pedidos que terminan por WhatsApp."),
  draft("aprobar-un-cliente", "Aprobar un cliente", "clientes", "Clientes", "30 s", "Dejar entrar a un cliente nuevo que espera aprobación."),
  draft("pasar-un-cliente-a-mayorista", "Pasar un cliente a mayorista", "clientes", "Clientes", "30 s", "Cambiar la lista de precios de un cliente."),
  draft("bloquear-un-cliente", "Bloquear un cliente", "clientes", "Clientes", "30 s", "Sacarle el acceso a la tienda a un cliente."),
  draft("subir-y-reemplazar-imagenes", "Subir y reemplazar imágenes", "diseno", "Imágenes", "1 min", "Cargar fotos nuevas y cambiar las que ya tenés."),
  draft("liberar-espacio", "Liberar espacio", "diseno", "Imágenes", "30 s", "Borrar las imágenes que ya no usás."),
  draft("cobrar-el-envio-por-distancia", "Cobrar el envío por distancia", "envios", "Envíos", "2 min", "Precio de envío según cuántos kilómetros hay hasta el cliente."),
  draft("zonas-especiales", "Zonas especiales", "envios", "Envíos", "1 min", "Barrios o zonas con un precio de envío propio."),
  draft("cambiar-la-portada", "Cambiar la portada", "diseno", "Diseño de la tienda", "1 min", "Foto, título y botón de la primera pantalla de tu tienda."),
  draft("agregar-u-ordenar-bloques", "Agregar u ordenar bloques", "diseno", "Diseño de la tienda", "1 min", "Sumar secciones a la página y cambiarlas de lugar."),
  draft("editar-el-pie-de-pagina", "Editar el pie de página", "diseno", "Diseño de la tienda", "1 min", "Datos de contacto, redes y links del pie."),
  draft("pedido-por-whatsapp", "Pedido por WhatsApp", "ajustes", "Ajustes", "1 min", "Que la compra termine con un mensaje a tu WhatsApp."),
  draft("configurar-el-correo", "Configurar el correo", "ajustes", "Ajustes › Correo", "3 min", "Desde qué casilla salen los avisos a tus clientes."),
  draft("conectar-tu-dominio", "Conectar tu dominio", "ajustes", "Ajustes › Dominio", "5 min", "Usar tu propia dirección, por ejemplo tutienda.com.ar."),
];

// ---------------------------------------------------------------- búsqueda

export const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

export const guideBySlug = (slug: string) => GUIDES.find((guide) => guide.slug === slug);
export const sectionBySlug = (slug: string) => SECTIONS.find((section) => section.slug === slug);
export const guidesOf = (sectionSlug: string) => GUIDES.filter((guide) => guide.section === sectionSlug);

export function guideByTitle(title: string) {
  const key = normalize(title);
  return GUIDES.find((guide) => [guide.title, ...(guide.aliases || [])].some((name) => normalize(name) === key));
}

export function sectionByName(name: string) {
  const key = normalize(name);
  return SECTIONS.find((section) => [section.slug, section.label, ...(section.aliases || [])].some((item) => normalize(item) === key));
}

const blockText = (block: Block) => ("text" in block ? block.text : "items" in block ? block.items.join(" ") : `${block.q} ${block.a}`);

export function searchGuides(query: string) {
  const words = normalize(query).split(" ").filter((word) => word.length > 1);
  if (!words.length) return [];
  return GUIDES
    .map((guide) => {
      const head = normalize(`${guide.title} ${guide.screen} ${(guide.aliases || []).join(" ")}`);
      const body = normalize(`${guide.summary} ${guide.body.map(blockText).join(" ")}`);
      const score = words.reduce((total, word) => total + (head.includes(word) ? 3 : 0) + (body.includes(word) ? 1 : 0), 0);
      return { guide, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.guide.status === "listo" ? -1 : 1))
    .map((item) => item.guide);
}
