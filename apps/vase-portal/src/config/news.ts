// Novedades de Vase (news.vase.ar). Cada nota es un objeto: agregar una nueva = sumarla arriba de la lista.

export const NEWS_ORIGIN = new URL(process.env.NEXT_PUBLIC_NEWS_ORIGIN?.trim() || "https://news.vase.ar").origin;
export const NEWS_HOST = new URL(NEWS_ORIGIN).host;

export type NewsTag = "Vase" | "App" | "Business" | "Labs" | "Rest" | "Management";

export type NewsSection = {
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
};

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  /** AAAA-MM-DD */
  date: string;
  readingMinutes: number;
  tags: readonly NewsTag[];
  cover: { src: string; alt: string };
  sections: readonly NewsSection[];
  cta?: { label: string; href: string };
};

export const NEWS_ARTICLES: readonly NewsArticle[] = [
  {
    slug: "vase-se-renovo",
    title: "Vase se renovó: más simple, más claro y todo conectado",
    excerpt:
      "Rediseñamos app, Business y Labs para que se vean y se usen igual. Mi negocio pasa a ser el centro de todo y cada panel quedó más ordenado.",
    date: "2026-11-24",
    readingMinutes: 4,
    tags: ["Vase", "Business", "Labs"],
    cover: { src: "/novedades/vase-renovado.webp", alt: "El panel nuevo de Vase con el título Vase, renovado" },
    sections: [
      {
        title: "Un mismo Vase en todos lados",
        paragraphs: [
          "Hasta ahora cada producto tenía su propio estilo. Eso se terminó: app, Business y Labs comparten el mismo menú, los mismos botones, las mismas tarjetas y el mismo menú de tu cuenta. Si sabés usar uno, sabés usar todos.",
          "También lo hicimos más liviano a la vista: menos ruido, más aire y lo importante primero.",
        ],
        items: [
          "Menú lateral único para app, Business y Labs, con transición suave al pasar de un producto a otro.",
          "En el celular el menú pasa a ser una barra abajo, como una app.",
          "Modo claro y oscuro iguales en todos los paneles.",
          "Una sola campanita de notificaciones, con los avisos de todos los productos juntos.",
        ],
      },
      {
        title: "Mi negocio: cargás una vez, se usa en todo",
        paragraphs: [
          "Mi negocio ahora es el lugar donde vive la información de tu marca: nombre, logos, contacto y redes. Lo cargás una sola vez y Business y Labs lo toman de ahí.",
          "Está ordenado en secciones desplegables, se guarda solo en la nube mientras escribís y te muestra en qué productos se usa cada dato.",
        ],
      },
      {
        title: "Business: el panel de tu tienda, de nuevo",
        paragraphs: [
          "Rehicimos el panel de Business de punta a punta para que manejar la tienda sea más rápido.",
        ],
        items: [
          "Catálogo, pedidos y clientes con el diseño nuevo, también cómodos desde el celular.",
          "Ofertas por monto o precio fijo, listas de precios editables y cambios de precio en bloque.",
          "Envíos y sucursales, pagos, SEO y dominio en un mismo lugar.",
          "Historial del diseño: ves qué cambió en cada versión, quién lo hizo y podés volver atrás.",
          "Aprobación de clientes nuevos, con llaves separadas para minoristas y mayoristas.",
          "\"Tu plan\" te muestra el espacio usado y los topes de cada web.",
        ],
      },
      {
        title: "Labs: tu asistente, más claro y más útil",
        paragraphs: ["Labs ahora usa el mismo panel que el resto de Vase y se reorganizó en cuatro secciones: Inicio, Conversaciones, Asistente y Pedidos."],
        items: [
          "Conversaciones con filtro por canal, pestañas por estado y la ficha del cliente al costado.",
          "El asistente busca productos por parecido y le pasa la charla a una persona cuando no encuentra lo que piden.",
          "Presupuestos en PDF desde el chat y respuestas sugeridas con tu forma de escribir.",
          "Los ajustes de Labs se editan desde Ajustes, junto con los canales.",
        ],
      },
      {
        title: "Y lo que viene",
        paragraphs: [
          "Las novedades van a salir acá, en news.vase.ar, y te las vamos a avisar dentro de Vase con una ventanita como la que te trajo hasta esta nota.",
          "Si algo no te cierra o se te ocurre una mejora, escribinos a soporte@vase.ar. Leemos todo.",
        ],
      },
    ],
    cta: { label: "Entrar a Vase", href: "https://app.vase.ar/app" },
  },
];

export function getNewsArticle(slug: string) {
  return NEWS_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function formatNewsDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function newsUrl(slug?: string) {
  return slug ? `${NEWS_ORIGIN}/${slug}` : NEWS_ORIGIN;
}
