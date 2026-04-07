import type { AppLocale } from "@/config/app";

export const publicNavigation = [
  { href: "/", label: "Inicio" },
  { href: "/que-es-vase", label: "Qué es Vase" },
  { href: "/vase-business", label: "Vase Business" },
  { href: "/vaselabs", label: "Vase Labs" },
  { href: "/integraciones", label: "Integraciones" },
  { href: "/developers/api", label: "API" },
  { href: "/precios", label: "Planes" },
  { href: "/preguntas-frecuentes", label: "FAQ" },
] as const;

export const productSignals = [
  {
    title: "Comercio digital serio",
    description:
      "Vase Business combina ecommerce editable en formato plantilla con proyectos totalmente personalizados para operaciones más complejas.",
  },
  {
    title: "IA aplicada al negocio",
    description:
      "Vase Labs incorpora chatbot, automatización y atención con IA para reducir fricción y elevar capacidad operativa.",
  },
  {
    title: "Conexión con sistemas existentes",
    description:
      "La API de Vase conecta ecommerce, atención, stock, ERP y sistemas de gestión sin obligar a rehacer toda la operación.",
  },
] as const;

export const businessCards = [
  {
    title: "Ecommerce plantilla editable",
    description:
      "Implementación acelerada con una base visual premium, editable y orientada a catálogos, ventas y operaciones reales.",
    tag: "Base launch",
  },
  {
    title: "Ecommerce personalizado",
    description:
      "Proyecto a medida para marcas con necesidades avanzadas de UX, integraciones, lógica comercial o branding profundo.",
    tag: "Costo adicional",
  },
  {
    title: "Operación conectada",
    description:
      "Pedidos, clientes, automatizaciones y datos listos para integrarse con sistemas de gestión y flujos internos.",
    tag: "API-ready",
  },
] as const;

export const labsCards = [
  {
    title: "Chatbot para atención",
    description:
      "Asistencia conversacional para consultas frecuentes, seguimiento comercial y soporte inicial omnicanal.",
  },
  {
    title: "IA para automatización",
    description:
      "Flujos automatizados para clasificar pedidos, enrutar consultas, resumir conversaciones y disparar acciones internas.",
  },
  {
    title: "Experimentación controlada",
    description:
      "Capacidades pensadas para release progresivo con feature flags y validación sobre procesos reales.",
  },
] as const;

export const integrationItems = [
  {
    name: "Meta y mensajería",
    description:
      "Conexión con WhatsApp Business, Instagram y Facebook para enrutar conversaciones, leads y eventos hacia Vase Labs.",
  },
  {
    name: "ERP y gestión",
    description:
      "Sincronización con sistemas administrativos, stock, facturación y circuitos operativos ya existentes.",
  },
  {
    name: "Logística",
    description:
      "Estados, fulfillment, despacho y seguimiento integrados para operaciones reales de ecommerce.",
  },
  {
    name: "CRM y atención",
    description:
      "Integración con canales comerciales, historial de clientes y mesas de ayuda para una visión unificada.",
  },
] as const;

export const pricingPlans = [
  {
    name: "Business Start",
    price: "USD 390/mes",
    description:
      "Base recomendada para negocios que quieren salir rápido con ecommerce plantilla editable y operación ordenada.",
    points: [
      "Ecommerce editable con identidad Vase",
      "Panel administrativo base",
      "Conectividad API inicial",
      "Soporte de onboarding",
    ],
  },
  {
    name: "Business Growth",
    price: "USD 890/mes",
    description:
      "Para empresas que necesitan más integraciones, procesos y estructura de crecimiento sostenido.",
    points: [
      "Integraciones ampliadas",
      "Más automatizaciones operativas",
      "Mejoras UX y performance",
      "Acompañamiento funcional",
    ],
  },
  {
    name: "Custom Platform",
    price: "Desde USD 4.500 setup + abono",
    description:
      "Implementación personalizada para ecommerce avanzado, branding a medida, flujos complejos y arquitectura específica.",
    points: [
      "Discovery y definición funcional",
      "Desarrollo de UX personalizada",
      "Integraciones complejas",
      "Roadmap y soporte enterprise",
    ],
  },
] as const;

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
  { label: "Productos", value: "2 líneas activas" },
  { label: "Modelo", value: "Multi-tenant" },
  { label: "Integración", value: "API-first para negocios" },
  { label: "Experiencia", value: "Premium y accesible" },
] as const;

const marketingChromeCopy = {
  es: {
    nav: {
      home: "Inicio",
      features: "Características",
      about: "Nosotros",
      pricing: "Planes",
      business: "Vase Business",
      labs: "Vase Labs",
      integrations: "Integraciones",
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
      integrations: "Integraciones",
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

export function getMarketingChromeCopy(locale: AppLocale) {
  return marketingChromeCopy[locale];
}
