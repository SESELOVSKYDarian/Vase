// Títulos, descripciones y datos estructurados de cada página pública de vase.ar.
// Cada página tiene su propio título y descripción: así Google sabe para qué búsqueda mostrar cada una.
import type { Metadata } from "next";
import { faqItems } from "@/config/public-site";
import { portalOrigins } from "@/config/origins";

type PageSeo = { title: string; description: string; image?: string };

export const PAGE_SEO = {
  "/": {
    title: "Vase: tienda online, IA para WhatsApp y gestión para pymes",
    description:
      "Vase ayuda a pymes argentinas a vender online, atender por WhatsApp e Instagram con IA y ordenar su gestión desde una sola plataforma. Probalo gratis.",
  },
  "/vase-business": {
    title: "Tienda online para pymes en Argentina | Vase Business",
    description:
      "Creá tu tienda online con catálogo, precios mayoristas y minoristas, ofertas, envíos y Mercado Pago. Editable por bloques y lista para vender.",
    image: "/og/business.jpg",
  },
  "/vaselabs": {
    title: "Asistente con IA para WhatsApp e Instagram | Vase Labs",
    description:
      "Vase Labs responde a tus clientes por WhatsApp, Instagram y Messenger con IA: busca productos, arma presupuestos en PDF y pasa la charla a una persona cuando hace falta.",
    image: "/og/labs.jpg",
  },
  "/vase-management": {
    title: "Sistema de gestión para pymes: stock, ventas y facturación | Vase Management",
    description:
      "Productos, stock, ventas, clientes, compras, facturación, tesorería y reportes en un solo sistema, conectado con tu tienda y tu asistente.",
  },
  "/precios": {
    title: "Precios de Vase Business, Labs y Management",
    description: "Planes y valores vigentes de Vase Business, Vase Labs y Vase Management, en pesos argentinos.",
  },
  "/integraciones": {
    title: "Integraciones: WhatsApp, Instagram, Mercado Pago y tu ERP | Vase",
    description:
      "Conectá Vase con WhatsApp Business, Instagram, Messenger, Mercado Pago y tus sistemas de stock y gestión con una API pensada para integrar.",
  },
  "/que-es-vase": {
    title: "Qué es Vase y quiénes lo hacemos",
    description: "La historia de Vase: una plataforma argentina para que las pymes vendan, atiendan y se organicen sin complejidad.",
  },
  "/preguntas-frecuentes": {
    title: "Preguntas frecuentes sobre Vase",
    description: "Respuestas sobre tienda online, asistente con IA, integraciones, precios y soporte de Vase.",
  },
  "/demo": {
    title: "Pedí una demo de Vase",
    description: "Coordiná una presentación de Vase para ver cómo funciona con tu negocio y elegir la mejor forma de empezar.",
  },
  "/contact": {
    title: "Contacto",
    description:
      "Contactá a Vase para conversar sobre ecommerce, inteligencia artificial, automatización e integraciones para tu negocio.",
  },
  "/developers/api": {
    title: "API de Vase para desarrolladores",
    description: "Documentación de la API de Vase: autenticación, referencia, SDKs y ejemplos para integrar Vase con ERPs, CRMs y sistemas de stock.",
  },
  "/developers/docs": {
    title: "Documentación de Vase",
    description: "Guías para usar e integrar Vase: ecommerce, integraciones, automatización e inteligencia aplicada a la operación.",
  },
  "/seguridad": {
    title: "Seguridad en Vase",
    description: "Cómo protege Vase el acceso, la operación, las integraciones y los datos de cada negocio.",
  },
  "/politica-de-privacidad": {
    title: "Política de privacidad",
    description: "Cómo trata Vase los datos personales de las personas que usan la plataforma y de sus clientes.",
  },
  "/terminos-y-condiciones": {
    title: "Términos y condiciones",
    description: "Términos y condiciones de uso de la plataforma Vase.",
  },
} satisfies Record<string, PageSeo>;

type SeoRoute = keyof typeof PAGE_SEO;

const DEFAULT_OG_IMAGE = "/og/vase.jpg";

function siteUrl(path: string) {
  return `${portalOrigins.publicSite}${path === "/" ? "" : path}`;
}

/** Metadatos de una página pública: título, descripción, dirección oficial e imagen para compartir. */
export function pageMetadata(route: SeoRoute): Metadata {
  const page: PageSeo = PAGE_SEO[route];
  const url = siteUrl(route);
  const image = page.image ?? DEFAULT_OG_IMAGE;
  return {
    // El inicio usa el título completo; el resto suma " | Vase" con la plantilla del layout.
    title: route === "/" ? { absolute: page.title } : page.title.includes("Vase") ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: "Vase",
      url,
      title: page.title,
      description: page.description,
      images: [{ url: image, width: 1200, height: 630, alt: page.title }],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
  };
}

/** Quién es Vase y el sitio (va en todas las páginas públicas). */
export function organizationJsonLd() {
  const site = portalOrigins.publicSite;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: "Vase",
      url: site,
      logo: `${site}/vasecolorlogo.png`,
      email: "hola@vase.ar",
      areaServed: "AR",
      contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "soporte@vase.ar", availableLanguage: ["es"] }],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name: "Vase",
      url: site,
      inLanguage: "es-AR",
      publisher: { "@id": `${site}/#organization` },
    },
  ];
}

/** Un producto de Vase como software (Business, Labs, Management). */
export function softwareJsonLd(route: "/vase-business" | "/vaselabs" | "/vase-management", name: string, category: string) {
  const page = PAGE_SEO[route];
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory: category,
    operatingSystem: "Web",
    url: siteUrl(route),
    description: page.description,
    image: `${portalOrigins.publicSite}${"image" in page ? page.image : DEFAULT_OG_IMAGE}`,
    offers: { "@type": "Offer", priceCurrency: "ARS", url: siteUrl("/precios") },
    publisher: { "@id": `${portalOrigins.publicSite}/#organization` },
  };
}

/** Preguntas frecuentes en el formato que entiende Google. */
export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Escribe datos estructurados en un <script> sin permitir que el texto cierre la etiqueta. */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
