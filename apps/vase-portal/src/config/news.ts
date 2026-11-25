// Novedades de Vase (news.vase.ar). Cada nota es un objeto: agregar una nueva = sumarla arriba de la lista.
// Las imágenes son capturas reales del sistema (public/novedades/<slug>/), con el nombre del cliente tapado.

export const NEWS_ORIGIN = new URL(process.env.NEXT_PUBLIC_NEWS_ORIGIN?.trim() || "https://news.vase.ar").origin;
export const NEWS_HOST = new URL(NEWS_ORIGIN).host;

type NewsTag = "Vase" | "App" | "Business" | "Labs" | "Rest" | "Management";

/** Captura real de una pantalla. */
export type NewsFigure = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

/** Un cambio de la nota: tarjeta arriba y detalle con captura abajo. */
type NewsChange = {
  title: string;
  /** Dónde se ve: "App · Business · Labs". */
  where: string;
  /** Una línea para la tarjeta. */
  short: string;
  /** El detalle, en uno o más párrafos. */
  paragraphs: readonly string[];
  figure: NewsFigure;
  /** Imagen de la tarjeta, si no es la misma que la del detalle. */
  cardImage?: string;
  /** Tarjeta ancha (7 de 12 columnas) o angosta (5). */
  wide?: boolean;
};

export type NewsArticle = {
  slug: string;
  title: string;
  /** Resumen corto (tarjetas, buscadores, la ventanita de Vase). */
  excerpt: string;
  /** Frase grande de la intro. */
  lede: string;
  /** AAAA-MM-DD */
  date: string;
  readingMinutes: number;
  tags: readonly NewsTag[];
  /** Categoría principal (la etiqueta de las tarjetas). */
  category: NewsTag;
  /** Captura de la portada (mejor en modo oscuro: va detrás del título). */
  cover: NewsFigure;
  changesTitle: string;
  changes: readonly NewsChange[];
  /** Captura grande a todo el ancho, después de los cambios. */
  highlight?: NewsFigure & { tag: string };
  closing?: { title: string; columns: readonly { title: string; text: string }[] };
  cta: { title: string; label: string; href: string };
};

const IMG = "/novedades/vase-se-renovo";
const shot = (name: string, alt: string, caption?: string): NewsFigure => ({ src: `${IMG}/${name}.webp`, alt, width: 2000, height: 1250, caption });

export const NEWS_ARTICLES: readonly NewsArticle[] = [
  {
    slug: "vase-se-renovo",
    title: "Vase se renovó: más simple, más claro y todo conectado",
    excerpt:
      "Rediseñamos app, Business y Labs para que se vean y se usen igual. Mi negocio pasa a ser el centro de todo y cada panel quedó más ordenado.",
    lede: "Rediseñamos app, Business y Labs para que se vean y se usen igual. Mi negocio pasa a ser el centro de todo y cada panel quedó más ordenado.",
    date: "2026-11-24",
    readingMinutes: 4,
    tags: ["Vase", "Business", "Labs"],
    category: "Vase",
    cover: shot("business-resumen-oscuro", "Resumen del panel de Business en modo oscuro"),
    changesTitle: "Cuatro cambios que vas a notar apenas entres",
    changes: [
      {
        title: "Un mismo Vase en todos lados",
        where: "App · Business · Labs",
        short: "Mismo menú, mismos botones y el mismo menú de tu cuenta.",
        paragraphs: [
          "Cada producto tenía su propio estilo. Ahora comparten el menú lateral, los botones, las tarjetas y el menú de tu cuenta. Si sabés usar uno, sabés usar todos.",
          "En el celular el menú pasa a una barra abajo, el modo claro y oscuro se ve igual en todos los paneles y hay una sola campanita con los avisos de todos los productos.",
        ],
        figure: shot("app-inicio", "Inicio de Vase con el menú lateral nuevo", "El inicio de Vase: tus productos y lo que conviene mirar hoy."),
        wide: true,
      },
      {
        title: "Mi negocio",
        where: "App",
        short: "Cargás tu marca una vez y se usa en todo.",
        paragraphs: [
          "Nombre, logos, contacto y redes viven en un solo lugar. Business y Labs los toman de ahí, así que no tenés que cargar lo mismo dos veces.",
          "Está ordenado en secciones, se guarda solo mientras escribís y te muestra cuánto te falta completar.",
        ],
        figure: shot("mi-negocio", "Pantalla Mi negocio con los datos del negocio", "Mi negocio: identidad, contacto y redes en un mismo lugar."),
      },
      {
        title: "Business, de nuevo",
        where: "Business",
        short: "Diseño de la tienda, ofertas, precios e historial.",
        paragraphs: [
          "Rehicimos el panel de la tienda de punta a punta. El diseño se arma por bloques con la vista previa al lado, y desde Ajustes manejás precios, pagos, envíos, SEO y dominio.",
          "También suma ofertas por monto o precio fijo, listas de precios, cambios de precio en bloque y aprobación de clientes nuevos, con llaves separadas para minoristas y mayoristas.",
        ],
        figure: shot("business-diseno", "Editor de diseño de la tienda en Business", "Diseño de la tienda: bloques a la izquierda, tu tienda al medio."),
        cardImage: `${IMG}/business-diseno-oscuro.webp`,
      },
      {
        title: "Labs, más claro y más útil",
        where: "Labs",
        short: "Conversaciones, asistente y presupuestos en PDF.",
        paragraphs: [
          "Labs usa el mismo panel que el resto de Vase y se ordenó en Inicio, Conversaciones, Marketing, Asistente y Configuraciones.",
          "Desde Asistente elegís cómo habla y lo probás ahí mismo. Las conversaciones se filtran por canal y estado, con la ficha del cliente al costado, y el asistente arma presupuestos en PDF desde el chat.",
        ],
        figure: shot("labs-asistente", "Pantalla Asistente de Labs con la prueba del chat", "Asistente: elegís el tono y lo probás antes de que conteste a tus clientes."),
        cardImage: `${IMG}/labs-inicio-oscuro.webp`,
        wide: true,
      },
    ],
    highlight: {
      ...shot("business-historial", "Historial de cambios del diseño en Business"),
      caption: "El historial muestra qué cambió en cada versión, quién lo hizo y te deja volver atrás.",
      tag: "Business",
    },
    closing: {
      title: "Las novedades salen acá, primero",
      columns: [
        { title: "Te avisamos dentro de Vase", text: "Cada cambio importante llega con una ventanita en tu panel y un link a la nota que lo explica." },
        { title: "Contanos qué te falta", text: "Si algo no te cierra o se te ocurre una mejora, escribinos a soporte@vase.ar. Leemos todo." },
      ],
    },
    cta: { title: "Ya está en tu cuenta. No tenés que hacer nada.", label: "Entrar a Vase", href: "https://app.vase.ar/app" },
  },
  {
    slug: "mi-negocio",
    title: "Mi negocio: cargás tu marca una vez y se usa en todo",
    excerpt: "Nombre, logos, contacto y redes en un solo lugar. Business y Labs los toman de ahí, así no cargás lo mismo dos veces.",
    lede: "Mi negocio es el lugar donde vive la información de tu marca. La cargás una vez y la usan tu tienda, tu asistente y el resto de Vase.",
    date: "2026-11-24",
    readingMinutes: 2,
    tags: ["App"],
    category: "App",
    cover: shot("mi-negocio", "Pantalla Mi negocio"),
    changesTitle: "Qué encontrás en Mi negocio",
    changes: [
      {
        title: "Todo tu negocio en un lugar",
        where: "App",
        short: "Identidad, contacto y redes, ordenados por secciones.",
        paragraphs: [
          "Entrá a Mi negocio desde el menú de la izquierda. Arriba ves cuánto completaste y qué te falta; abajo, cada sección se abre y se cierra para que no tengas todo a la vista de golpe.",
          "Lo que escribís se guarda solo en la nube, sin botón de guardar.",
        ],
        figure: shot("mi-negocio", "Mi negocio con las secciones de identidad y contacto", "Mi negocio: arriba lo que te falta, abajo cada sección."),
        wide: true,
      },
      {
        title: "Te avisa qué conviene completar",
        where: "App",
        short: "El inicio te muestra lo que falta para vender mejor.",
        paragraphs: [
          "Si falta el logo, el WhatsApp o las sucursales, el inicio de Vase te lo marca en Oportunidades, junto con los productos sin stock y los clientes que esperan tu aprobación.",
        ],
        figure: shot("app-inicio", "Inicio de Vase con la lista de oportunidades", "Oportunidades: lo que conviene resolver hoy."),
      },
    ],
    cta: { title: "Completá tu negocio en dos minutos.", label: "Abrir Mi negocio", href: "https://app.vase.ar/app/negocio" },
  },
  {
    slug: "business-historial-del-diseno",
    title: "Business: el historial te deja volver atrás el diseño de tu tienda",
    excerpt: "Cada versión publicada queda guardada con lo que cambió y quién lo hizo. Si algo no te gusta, volvés a la anterior.",
    lede: "Editar la tienda ya no da miedo: cada vez que publicás queda una versión con el detalle de los cambios, y podés volver a cualquiera.",
    date: "2026-11-24",
    readingMinutes: 2,
    tags: ["Business"],
    category: "Business",
    cover: shot("business-diseno-oscuro", "Editor de diseño de Business en modo oscuro"),
    changesTitle: "Diseñar y volver atrás",
    changes: [
      {
        title: "Diseño de la tienda por bloques",
        where: "Business",
        short: "Bloques a la izquierda, tu tienda al medio.",
        paragraphs: [
          "En Diseño de la tienda armás cada página con bloques: portada con fotos, marcas, productos destacados y más. Los arrastrás para ordenarlos y tocás cualquiera para cambiar textos, fotos y botones.",
        ],
        figure: shot("business-diseno", "Editor de diseño de la tienda", "Tocá cualquier parte de la tienda para editarla."),
        wide: true,
      },
      {
        title: "Historial de cambios",
        where: "Business",
        short: "Qué cambió en cada versión y quién lo hizo.",
        paragraphs: [
          "Con el botón del reloj, arriba a la derecha, abrís el historial. Cada versión dice qué bloques se agregaron, se quitaron o se movieron, y qué ajustes cambiaron. Podés filtrar entre publicadas y sin publicar.",
        ],
        figure: shot("business-historial", "Historial de cambios del diseño", "El historial, con el detalle de cada versión."),
      },
    ],
    cta: { title: "Probá el editor nuevo de tu tienda.", label: "Abrir Business", href: "https://app.vase.ar/app/business" },
  },
  {
    slug: "labs-proba-tu-asistente",
    title: "Labs: probá tu asistente antes de que hable con tus clientes",
    excerpt: "Elegí cómo habla y qué sabe, y probalo en un chat de prueba sin que nadie lo vea.",
    lede: "En Asistente definís el tono y las reglas de tu asistente de WhatsApp e Instagram, y lo probás ahí mismo antes de que conteste de verdad.",
    date: "2026-11-24",
    readingMinutes: 2,
    tags: ["Labs"],
    category: "Labs",
    cover: shot("labs-inicio-oscuro", "Inicio de Labs en modo oscuro"),
    changesTitle: "Tu asistente, a tu manera",
    changes: [
      {
        title: "Cómo habla",
        where: "Labs",
        short: "Cercano, formal, breve o detallado.",
        paragraphs: [
          "Elegí el tono con un toque y escribí las reglas con tus palabras. Los datos de contacto y sucursales los toma de Mi negocio.",
          "A la derecha tenés un chat de prueba: escribí como si fueras un cliente y mirá qué contestaría. No se manda a nadie.",
        ],
        figure: shot("labs-asistente", "Pantalla Asistente de Labs", "Asistente: el tono a la izquierda, el chat de prueba a la derecha."),
        wide: true,
      },
      {
        title: "Cómo viene tu asistente",
        where: "Labs",
        short: "Conversaciones, canales y uso del mes de un vistazo.",
        paragraphs: [
          "El inicio de Labs muestra cuántas conversaciones atendió la IA, cuántas pasaron a una persona, quiénes quieren comprar y cómo viene cada canal.",
        ],
        figure: shot("labs-inicio-oscuro", "Inicio de Labs con las conversaciones de la semana", "El inicio de Labs, en modo oscuro."),
      },
    ],
    cta: { title: "Ajustá tu asistente hoy.", label: "Abrir Labs", href: "https://labs.vase.ar/owner/knowledge" },
  },
];

export function getNewsArticle(slug: string) {
  return NEWS_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function formatNewsDate(date: string, month: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month, year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function newsUrl(slug?: string) {
  return slug ? `${NEWS_ORIGIN}/${slug}` : NEWS_ORIGIN;
}

/** Ancla de cada cambio dentro de la nota. */
export function changeAnchor(index: number) {
  return `cambio-${index + 1}`;
}
