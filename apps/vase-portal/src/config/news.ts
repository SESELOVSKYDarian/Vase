// Novedades de Vase (news.vase.ar). Cada nota es un objeto: agregar una nueva = sumarla arriba de la lista.
// Las imágenes son capturas reales del sistema (public/novedades/<slug>/), con el nombre del cliente tapado.

export const NEWS_ORIGIN = new URL(process.env.NEXT_PUBLIC_NEWS_ORIGIN?.trim() || "https://news.vase.ar").origin;
export const NEWS_HOST = new URL(NEWS_ORIGIN).host;

export type NewsTag = "Vase" | "App" | "Business" | "Labs" | "Rest" | "Management";

/** Captura real de una pantalla. */
export type NewsFigure = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

/** Un cambio de la nota: tarjeta arriba y detalle con captura abajo. */
export type NewsChange = {
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
