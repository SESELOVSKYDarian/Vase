export const productSelections = ["BUSINESS", "LABS", "BOTH"] as const;
export type ProductSelection = (typeof productSelections)[number];

export const onboardingModuleIds = [
  "business_core",
  "frontend_customization",
  "custom_domain",
  "management_api",
] as const;
export type OnboardingModuleId = (typeof onboardingModuleIds)[number];

export const onboardingChannelIds = ["webchat", "whatsapp", "instagram", "facebook"] as const;
export type OnboardingChannelId = (typeof onboardingChannelIds)[number];

export const labsPlanIds = ["labs_base", "labs_whatsapp", "labs_pro"] as const;
export type LabsPlanId = (typeof labsPlanIds)[number];

export type OnboardingModule = {
  id: OnboardingModuleId;
  title: string;
  description: string;
  monthlyPrice: number;
  setupPrice: number;
  category: "business" | "growth";
  requires: ProductSelection | "ANY";
};

export type LabsPlanDefinition = {
  id: LabsPlanId;
  title: string;
  optionLabel: string;
  description: string;
  monthlyPrice: number;
  highlights: string[];
};

export const onboardingModules: OnboardingModule[] = [
  {
    id: "business_core",
    title: "Vase Business Base",
    description: "Base ecommerce lista para salir a vender con presencia digital, panel y operacion inicial.",
    monthlyPrice: 0,
    setupPrice: 1070000,
    category: "business",
    requires: "BUSINESS",
  },
  {
    id: "frontend_customization",
    title: "Frontend personalizado",
    description: "Mejoras visuales, carruseles a medida, bloques especiales y una experiencia mas trabajada para la marca.",
    monthlyPrice: 0,
    setupPrice: 730000,
    category: "business",
    requires: "BUSINESS",
  },
  {
    id: "custom_domain",
    title: "Dominio y presencia propia",
    description: "Conexion de dominio, identidad de marca y puesta en marcha con dominio personalizado.",
    monthlyPrice: 0,
    setupPrice: 280000,
    category: "growth",
    requires: "ANY",
  },
  {
    id: "management_api",
    title: "Integracion con sistema de gestion",
    description: "Conexion con ERP o sistema administrativo para stock, clientes, precios y pedidos.",
    monthlyPrice: 0,
    setupPrice: 0,
    category: "growth",
    requires: "BOTH",
  },
] as const;

export const labsPlans: LabsPlanDefinition[] = [
  {
    id: "labs_base",
    title: "Vase Labs Base",
    optionLabel: "Base",
    description: "Plan base mensual para tener el asistente activo, conectado a IA y listo para crecer.",
    monthlyPrice: 90000,
    highlights: ["Infraestructura incluida", "Chatbot activo", "Mantenimiento incluido"],
  },
  {
    id: "labs_whatsapp",
    title: "Vase Labs Base",
    optionLabel: "Enfoque WhatsApp",
    description: "Plan orientado a negocios que operan principalmente por WhatsApp con IA conectada.",
    monthlyPrice: 108000,
    highlights: ["Todo el plan base", "Canal WhatsApp priorizado", "Operacion comercial conversacional"],
  },
  {
    id: "labs_pro",
    title: "Vase Labs Base",
    optionLabel: "Escala operativa",
    description: "Plan mas completo para equipos que quieren conversaciones, panel y automatizacion mas profunda.",
    monthlyPrice: 158000,
    highlights: ["Panel de conversaciones", "Capas avanzadas de automatizacion", "Escalado para varios canales"],
  },
] as const;

export type OnboardingRecommendation = {
  recommendedProduct: ProductSelection;
  recommendedModules: OnboardingModuleId[];
  recommendedLabsPlan: LabsPlanId | null;
  summary: string;
  reasons: string[];
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function getLabsPlanDefinition(planId: LabsPlanId | null | undefined) {
  if (!planId) {
    return null;
  }

  return labsPlans.find((plan) => plan.id === planId) ?? null;
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
  let recommendedLabsPlan: LabsPlanId | null = null;

  const wantsWebsite = includesAny(normalizedGoal, [
    "web",
    "pagina",
    "página",
    "sitio",
    "landing",
    "presencia online",
  ]);
  const wantsSales = includesAny(normalizedGoal, [
    "venta",
    "vender",
    "tienda",
    "catalog",
    "catalogo",
    "catálogo",
    "ecommerce",
    "carrito",
    "checkout",
    "producto",
    "productos",
  ]);
  const wantsAutomation = includesAny(normalizedGoal, [
    "automat",
    "embudo",
    "crm",
    "flujo",
    "workflow",
    "proceso",
    "n8n",
  ]);
  const wantsSupport = includesAny(normalizedGoal, [
    "soporte",
    "atencion",
    "atención",
    "cliente",
    "clientes",
    "chatbot",
    "bot",
    "consulta",
    "consultas",
    "responder",
  ]);
  const wantsIntegrations = includesAny(normalizedGoal, [
    "gestion",
    "gestión",
    "erp",
    "stock",
    "api",
    "integrar",
    "integracion",
    "integración",
    "sistema de gestion",
    "sistema de gestión",
  ]);
  const wantsDesign = includesAny(normalizedGoal, [
    "diseno",
    "diseño",
    "carrusel",
    "branding",
    "frontend",
    "personalizada",
    "personalizado",
    "mejor diseño",
    "mejor diseno",
  ]);
  const wantsWhatsApp =
    options.channels.includes("whatsapp") || includesAny(normalizedGoal, ["whatsapp"]);
  const wantsInstagram =
    options.channels.includes("instagram") || includesAny(normalizedGoal, ["instagram"]);
  const wantsFacebook =
    options.channels.includes("facebook") || includesAny(normalizedGoal, ["facebook"]);
  const wantsWebChat =
    options.channels.includes("webchat") ||
    includesAny(normalizedGoal, [
      "chatbot web",
      "chatbot en mi pagina",
      "chatbot en mi página",
      "chatbot en mi web",
      "chat en la pagina",
      "chat en la página",
      "chat en la web",
    ]);

  if (
    wantsSales ||
    wantsWebsite ||
    wantsDesign ||
    wantsIntegrations ||
    options.preferredProduct === "BUSINESS" ||
    options.preferredProduct === "BOTH"
  ) {
    recommendedModules.push("business_core");
    reasons.push(
      "Tu caso necesita una base comercial y web para publicar, mostrar productos o vender online.",
    );
  }

  if (wantsDesign) {
    recommendedModules.push("frontend_customization", "custom_domain");
    reasons.push(
      "Mencionaste una experiencia mas personalizada, por eso conviene contemplar frontend a medida y dominio propio.",
    );
  }

  if (wantsIntegrations) {
    recommendedModules.push("management_api");
    reasons.push(
      "Hay una necesidad clara de integrar el sistema de gestion para evitar trabajo manual y sincronizar datos.",
    );
  }

  const needsLabs =
    wantsSupport ||
    wantsAutomation ||
    wantsWhatsApp ||
    wantsInstagram ||
    wantsFacebook ||
    wantsWebChat ||
    options.preferredProduct === "LABS" ||
    options.preferredProduct === "BOTH";

  if (needsLabs) {
    if (wantsWhatsApp && (wantsAutomation || wantsInstagram || wantsFacebook || wantsSupport)) {
      recommendedLabsPlan = "labs_pro";
      reasons.push(
        "Tu escenario mezcla atencion conversacional y automatizacion, asi que conviene un plan de Labs mas completo.",
      );
    } else if (wantsWhatsApp) {
      recommendedLabsPlan = "labs_whatsapp";
      reasons.push(
        "WhatsApp aparece como canal principal, por eso te conviene un plan de Labs centrado en ese canal.",
      );
    } else {
      recommendedLabsPlan = "labs_base";
      reasons.push(
        "Necesitas IA o chatbot, asi que te conviene empezar con un plan base de Vase Labs y crecer despues.",
      );
    }
  }

  const finalModules = unique(recommendedModules);

  if (recommendedLabsPlan && finalModules.length > 0) {
    recommendedProduct = "BOTH";
  } else if (recommendedLabsPlan) {
    recommendedProduct = "LABS";
  } else if (finalModules.length > 0) {
    recommendedProduct = wantsIntegrations ? "BOTH" : "BUSINESS";
  }

  const labsPlan = getLabsPlanDefinition(recommendedLabsPlan);
  const modulesText =
    finalModules.length > 0
      ? `${finalModules.length} configuracion${finalModules.length === 1 ? "" : "es"} de Business`
      : "sin extras de Business por ahora";
  const labsText = labsPlan ? `plan sugerido de Labs: ${labsPlan.title}` : "sin plan de Labs por ahora";
  const summary = `Te sugerimos ${modulesText} y ${labsText}.`;

  return {
    recommendedProduct,
    recommendedModules: finalModules,
    recommendedLabsPlan,
    summary,
    reasons: unique(reasons),
  } satisfies OnboardingRecommendation;
}

export function getOnboardingPricing(
  selectedModules: OnboardingModuleId[],
  selectedProduct: ProductSelection,
  selectedLabsPlan?: LabsPlanId | null,
) {
  const selected = onboardingModules.filter((module) => selectedModules.includes(module.id));
  const labsPlan = getLabsPlanDefinition(selectedLabsPlan);

  const baseBusinessSetup =
    selectedProduct === "BUSINESS" || selectedProduct === "BOTH" ? 1070000 : 0;
  const businessExtrasSetup = selected
    .filter((module) => module.id !== "business_core")
    .reduce((sum, module) => sum + module.setupPrice, 0);

  return {
    selected,
    labsPlan,
    monthlyTotal: labsPlan?.monthlyPrice ?? 0,
    setupTotal: baseBusinessSetup + businessExtrasSetup,
  };
}

export function getRequiredProductForModules(
  selectedModules: OnboardingModuleId[],
  labsPlanId?: LabsPlanId | null,
): ProductSelection {
  const selected = onboardingModules.filter((module) => selectedModules.includes(module.id));
  const hasBusiness = selected.some((module) => module.requires === "BUSINESS");
  const hasBoth = selected.some((module) => module.requires === "BOTH");
  const hasLabsPlan = Boolean(labsPlanId);

  if ((hasBusiness || hasBoth) && hasLabsPlan) {
    return "BOTH";
  }

  if (hasLabsPlan) {
    return "LABS";
  }

  return "BUSINESS";
}
