export const productSelections = ["BUSINESS", "LABS", "BOTH"] as const;
export type ProductSelection = (typeof productSelections)[number];

export const onboardingModuleIds = [
  "business_core",
  "frontend_customization",
  "custom_domain",
  "chatbot_web",
  "management_api",
  "n8n_automation",
  "meta_prompting",
] as const;
export type OnboardingModuleId = (typeof onboardingModuleIds)[number];

export const onboardingChannelIds = ["webchat", "whatsapp", "instagram", "facebook"] as const;
export type OnboardingChannelId = (typeof onboardingChannelIds)[number];

export type OnboardingModule = {
  id: OnboardingModuleId;
  title: string;
  description: string;
  monthlyPrice: number;
  setupPrice: number;
  category: "business" | "labs" | "growth";
  requires: ProductSelection | "ANY";
};

export const onboardingModules: OnboardingModule[] = [
  {
    id: "business_core",
    title: "Vase Business Base",
    description: "Plantilla base para presencia digital, gestion comercial y operacion del negocio.",
    monthlyPrice: 39,
    setupPrice: 0,
    category: "business",
    requires: "BUSINESS",
  },
  {
    id: "frontend_customization",
    title: "Frontend a Medida",
    description: "Carruseles personalizados, bloques premium y mejoras visuales de conversion.",
    monthlyPrice: 24,
    setupPrice: 180,
    category: "business",
    requires: "BUSINESS",
  },
  {
    id: "custom_domain",
    title: "Dominio Propio y Branding",
    description: "Conexion de dominio, branding operativo y preparacion premium para marca propia.",
    monthlyPrice: 12,
    setupPrice: 35,
    category: "growth",
    requires: "ANY",
  },
  {
    id: "chatbot_web",
    title: "Chatbot Web",
    description: "Asistente para tu sitio con respuestas guiadas y soporte inicial automatizado.",
    monthlyPrice: 29,
    setupPrice: 60,
    category: "labs",
    requires: "LABS",
  },
  {
    id: "management_api",
    title: "Integracion con Sistema de Gestion",
    description: "Conecta stock, precios, pedidos o clientes con la API del sistema.",
    monthlyPrice: 59,
    setupPrice: 220,
    category: "business",
    requires: "BOTH",
  },
  {
    id: "n8n_automation",
    title: "Automatizaciones con n8n",
    description: "Flujos para ventas, soporte, CRM y tareas internas sin trabajo manual repetitivo.",
    monthlyPrice: 45,
    setupPrice: 140,
    category: "labs",
    requires: "LABS",
  },
  {
    id: "meta_prompting",
    title: "IA para Meta y Canales",
    description: "Prompts, respuestas y playbooks para WhatsApp, Instagram y futuras integraciones Meta.",
    monthlyPrice: 34,
    setupPrice: 90,
    category: "labs",
    requires: "LABS",
  },
];

export type OnboardingRecommendation = {
  recommendedProduct: ProductSelection;
  recommendedModules: OnboardingModuleId[];
  summary: string;
  reasons: string[];
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function recommendModules(options: {
  goal: string;
  preferredProduct: ProductSelection;
  channels: OnboardingChannelId[];
}) {
  const normalizedGoal = options.goal.toLowerCase();
  const recommendedModules: OnboardingModuleId[] = [];
  const reasons: string[] = [];
  let recommendedProduct: ProductSelection = options.preferredProduct;

  const wantsSales =
    normalizedGoal.includes("venta") ||
    normalizedGoal.includes("tienda") ||
    normalizedGoal.includes("catalog") ||
    normalizedGoal.includes("ecommerce");
  const wantsAutomation =
    normalizedGoal.includes("automat") ||
    normalizedGoal.includes("embudo") ||
    normalizedGoal.includes("crm");
  const wantsSupport =
    normalizedGoal.includes("soporte") ||
    normalizedGoal.includes("atencion") ||
    normalizedGoal.includes("clientes") ||
    options.channels.length > 0;
  const wantsIntegrations =
    normalizedGoal.includes("gestion") ||
    normalizedGoal.includes("erp") ||
    normalizedGoal.includes("stock") ||
    normalizedGoal.includes("api");
  const wantsDesign =
    normalizedGoal.includes("diseno") ||
    normalizedGoal.includes("diseño") ||
    normalizedGoal.includes("carrusel") ||
    normalizedGoal.includes("branding") ||
    normalizedGoal.includes("web");

  if (wantsSales) {
    recommendedModules.push("business_core");
    reasons.push("Tu objetivo necesita una base comercial para vender, mostrar productos o captar leads.");
  }

  if (wantsDesign) {
    recommendedModules.push("frontend_customization", "custom_domain");
    reasons.push("Vemos necesidad de una experiencia mas personalizada para reforzar marca y conversion.");
  }

  if (wantsSupport) {
    recommendedModules.push("chatbot_web", "meta_prompting");
    reasons.push("Hay senales de soporte conversacional y canales sociales donde un asistente puede ahorrar tiempo.");
  }

  if (wantsAutomation) {
    recommendedModules.push("n8n_automation");
    reasons.push("Mencionaste automatizacion, asi que conviene sumar flujos en n8n desde el arranque.");
  }

  if (wantsIntegrations) {
    recommendedModules.push("management_api");
    reasons.push("Tu caso apunta a integrar datos del sistema de gestion para evitar carga manual.");
  }

  if (recommendedModules.some((moduleId) =>
    ["chatbot_web", "n8n_automation", "meta_prompting"].includes(moduleId),
  )) {
    recommendedProduct = wantsSales || wantsIntegrations ? "BOTH" : "LABS";
  } else if (recommendedModules.length > 0) {
    recommendedProduct = wantsIntegrations ? "BOTH" : "BUSINESS";
  }

  if (options.channels.includes("instagram") || options.channels.includes("facebook")) {
    recommendedModules.push("meta_prompting");
  }

  if (options.channels.includes("webchat")) {
    recommendedModules.push("chatbot_web");
  }

  const finalModules = unique(recommendedModules);
  const summary =
    finalModules.length === 0
      ? "Podemos arrancar con un setup basico y despues activar modulos a medida que el negocio lo necesite."
      : `Te recomendamos empezar con ${finalModules.length} modulo${finalModules.length === 1 ? "" : "s"} para cubrir lo que describiste sin sobredimensionar el arranque.`;

  return {
    recommendedProduct,
    recommendedModules: finalModules,
    summary,
    reasons,
  } satisfies OnboardingRecommendation;
}

export function getOnboardingPricing(selectedModules: OnboardingModuleId[]) {
  const selected = onboardingModules.filter((module) => selectedModules.includes(module.id));

  return {
    selected,
    monthlyTotal: selected.reduce((sum, module) => sum + module.monthlyPrice, 0),
    setupTotal: selected.reduce((sum, module) => sum + module.setupPrice, 0),
  };
}

export function getRequiredProductForModules(
  selectedModules: OnboardingModuleId[],
): ProductSelection {
  const selected = onboardingModules.filter((module) => selectedModules.includes(module.id));
  const hasBusiness = selected.some((module) => module.requires === "BUSINESS");
  const hasLabs = selected.some((module) => module.requires === "LABS");
  const hasBoth = selected.some((module) => module.requires === "BOTH");

  if (hasBoth || (hasBusiness && hasLabs)) {
    return "BOTH";
  }

  if (hasLabs) {
    return "LABS";
  }

  return "BUSINESS";
}
