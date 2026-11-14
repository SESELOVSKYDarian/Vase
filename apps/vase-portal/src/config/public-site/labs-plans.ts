// Parte de public-site.ts: publicNavigation, productSignals, businessCards, labsCards, integrationItems, pricingPlans y más.

export const publicNavigation = [
  { href: "/", label: "Inicio" },
  { href: "/que-es-vase", label: "Qué es Vase" },
  { href: "/vase-business", label: "Vase Business" },
  { href: "/vaselabs", label: "Vase Labs" },
  { href: "/integraciones", label: "Integraciones" },
  { href: "/developers/api", label: "API" },
  { href: "/precios", label: "Planes" },
  { href: "/contact", label: "Contacto" },
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
    name: "Vase Business Base",
    price: "ARS 1.070.000",
    badge: "Pago único",
    description:
      "Plantilla ecommerce lista para usar con configuración inicial, panel administrativo y hosting incluido por 12 meses.",
    points: [
      "Plantilla ecommerce lista para usar",
      "Panel de administración",
      "Configuración inicial",
      "Hosting incluido por 12 meses (valor ARS 280.000)",
      "Sistema listo para vender",
    ],
  },
  {
    name: "Vase Business Personalizado",
    price: "ARS 1.800.000",
    badge: "Proyecto",
    description:
      "Proyecto a medida para marcas que necesitan una experiencia personalizada según su identidad y operación.",
    points: [
      "50% al inicio: ARS 900.000",
      "50% contra entrega: ARS 900.000",
      "Diseño personalizado según marca",
      "Reunión inicial y propuesta visual",
      "Hasta 2 instancias de reunión/revisión",
      "Optimización UX/UI",
      "Desarrollo e implementación final en la página",
      "Hosting anual no incluido: ARS 280.000",
    ],
  },
] as const;

export const labsBasePlan = {
  name: "Vase Labs Base",
  price: "ARS 90.000 / mes",
  description:
    "Infraestructura base para mantener el chatbot activo, conectado a IA y con mantenimiento incluido.",
  points: [
    "Infraestructura + chatbot activo",
    "Mantenimiento incluido",
    "Conexión con IA",
  ],
} as const;

export const labsAddons = [
  {
    name: "Chatbot WhatsApp",
    price: "ARS 18.000 / mes",
  },
  {
    name: "Chatbot Instagram",
    price: "ARS 25.000 / mes",
  },
  {
    name: "Chatbot Facebook",
    price: "ARS 25.000 / mes",
  },
  {
    name: "Panel de conversaciones",
    price: "ARS 50.000 / mes",
    description:
      "Visualización de chats, intervención humana y alertas de cierre de nuevo cliente o consumidor.",
  },
] as const;

export const labsPlans = [
  {
    name: "Vase Labs Base",
    price: "ARS 90.000 / mes",
    badge: "Plan inicial",
    description:
      "Infraestructura base para mantener el asistente activo, conectado a IA y con mantenimiento incluido.",
    points: [
      "Infraestructura del sistema",
      "Chatbot activo",
      "Mantenimiento incluido",
      "Conexion con IA",
    ],
  },
  {
    name: "Vase Labs Base",
    price: "ARS 108.000 / mes",
    badge: "Enfoque WhatsApp",
    description:
      "Plan pensado para negocios que operan principalmente por WhatsApp y necesitan una atencion conversacional estable.",
    points: [
      "Incluye todo Vase Labs Base",
      "Canal WhatsApp priorizado",
      "Operacion comercial conversacional",
    ],
  },
  {
    name: "Vase Labs Base",
    price: "ARS 158.000 / mes",
    badge: "Escala operativa",
    description:
      "Plan mas completo para equipos que quieren panel de conversaciones, mayor supervision humana y automatizacion mas profunda.",
    points: [
      "Incluye todo Vase Labs Base",
      "Panel de conversaciones",
      "Escalamiento operativo",
      "Preparado para crecer en canales y volumen",
    ],
  },
] as const;

export const labsTokenPlans = [
  {
    name: "Básico",
    price: "ARS 10.000",
    tokens: "500.000",
    estimatedMessages: "~1.000",
  },
  {
    name: "Medio",
    price: "ARS 20.000",
    tokens: "1.200.000",
    estimatedMessages: "~2.000 – 2.500",
  },
  {
    name: "Pro",
    price: "ARS 40.000",
    tokens: "3.000.000",
    estimatedMessages: "~5.000 – 6.000",
  },
] as const;

export const labsPricingExamples = [
  "Plan mínimo: ARS 108.000 / mes (chatbot activo en WhatsApp)",
  "Plan pro: ARS 158.000 / mes + tokens (chatbot activo en WhatsApp con panel de conversaciones)",
] as const;
