// Parte de onboarding.ts: productSelections, ProductSelection, onboardingModuleIds, OnboardingModuleId, onboardingChannelIds, OnboardingChannelId y más.

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

export function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function getLabsPlanDefinition(planId: LabsPlanId | null | undefined) {
  if (!planId) {
    return null;
  }

  return labsPlans.find((plan) => plan.id === planId) ?? null;
}
