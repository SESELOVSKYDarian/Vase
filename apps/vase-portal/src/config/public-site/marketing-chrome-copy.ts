// Parte de public-site.ts: faqItems, apiEndpointExamples, apiDocSections, platformStats, marketingChromeCopy, getMarketingChromeCopy.
import { type AppLocale } from "@/config/app";

export const faqItems = [
  {
    question: "¿Vase es solo para negocios técnicos?",
    answer:
      "No. La experiencia está pensada para negocios reales, con interfaces claras para usuarios no técnicos y una capa técnica robusta por detrás.",
  },
  {
    question: "¿Puedo empezar con una plantilla y luego pasar a algo personalizado?",
    answer:
      "Sí. Vase Business permite comenzar con una base editable y evolucionar a una experiencia más personalizada cuando el negocio lo necesita.",
  },
  {
    question: "¿Vase Labs reemplaza a un equipo de atención?",
    answer:
      "No. Vase Labs ayuda a escalar atención y automatización, pero se diseña como apoyo operativo, no como reemplazo ciego del criterio humano.",
  },
  {
    question: "¿La API sirve para conectar un sistema de gestión existente?",
    answer:
      "Sí. Vase provee API para conectar catálogos, pedidos, clientes, stock y eventos con sistemas de gestión, ERP, CRM y otros servicios.",
  },
  {
    question: "¿Los precios son finales?",
    answer:
      "Son valores base orientativos. El alcance final depende de integraciones, complejidad de ecommerce, personalización y despliegue.",
  },
] as const;

export const apiEndpointExamples = [
  {
    method: "GET",
    path: "/api/v1/tenants/{tenantSlug}/projects",
    purpose: "Listar espacios operativos del tenant autenticado.",
    auth: "Sesión + rol MEMBER o superior",
  },
  {
    method: "POST",
    path: "/api/v1/tenants/{tenantSlug}/projects",
    purpose: "Crear un nuevo proyecto bajo control de permisos y auditoría.",
    auth: "Sesión + rol MANAGER o superior",
  },
  {
    method: "GET",
    path: "/api/v1/tenants/{tenantSlug}/catalog",
    purpose: "Exponer catálogo para sincronización con ecommerce o ERP.",
    auth: "API key o sesión delegada",
  },
  {
    method: "POST",
    path: "/api/v1/tenants/{tenantSlug}/orders/sync",
    purpose: "Sincronizar pedidos y estados desde sistemas externos.",
    auth: "API key firmada",
  },
] as const;

export const apiDocSections = [
  {
    title: "Autenticación",
    description:
      "La plataforma soporta autenticación de sesión para experiencias internas y está preparada para autenticación por credenciales delegadas en integraciones de negocio.",
  },
  {
    title: "Seguridad",
    description:
      "Toda autorización se resuelve en backend, con validación estricta, auditoría, sanitización y rate limiting por alcance.",
  },
  {
    title: "Integración de gestión",
    description:
      "La API se diseña para conectar ecommerce, stock, clientes, pedidos y procesos con sistemas de gestión existentes.",
  },
] as const;

export const platformStats = [
  { label: "Productos", value: "3 líneas activas" },
  { label: "Modelo", value: "Multi-tenant" },
  { label: "Integración", value: "API-first para negocios" },
  { label: "Experiencia", value: "Premium y accesible" },
] as const;

export const marketingChromeCopy = {
  es: {
    nav: {
      home: "Inicio",
      features: "Características",
      about: "Nosotros",
      pricing: "Planes",
      business: "Vase Business",
      labs: "Vase Labs",
      management: "Vase Management",
      integrations: "Integraciones",
      contact: "Contacto",
      login: "Iniciar sesión",
      register: "Registrarse",
    },
    footer: {
      explore: "Explorar",
      actions: "Acciones",
      tagline:
        "Plataforma digital para negocios reales: ecommerce, integraciones, automatización e inteligencia aplicada a la operación.",
      site: "Base pública de Vase",
      note: "Diseñado para equipos globales, operaciones reales y crecimiento sostenible.",
    },
  },
  en: {
    nav: {
      home: "Home",
      features: "Features",
      about: "About",
      pricing: "Pricing",
      business: "Vase Business",
      labs: "Vase Labs",
      management: "Vase Management",
      integrations: "Integraciones",
      contact: "Contact",
      login: "Log in",
      register: "Sign up",
    },
    footer: {
      explore: "Explore",
      actions: "Actions",
      tagline:
        "Digital platform for real businesses: ecommerce, integrations, automation and applied intelligence for daily operations.",
      site: "Vase public platform",
      note: "Designed for global teams, real operations and sustainable growth.",
    },
  },
} satisfies Record<AppLocale, unknown>;

/** Textos del menú y el pie en el idioma pedido. */
export function getMarketingChromeCopy(locale: AppLocale) {
  return marketingChromeCopy[locale];
}
