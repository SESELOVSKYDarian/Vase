import {
  Building2,
  FlaskConical,
  Landmark,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";

export type PlatformModuleId = "vase_business" | "vase_labs" | "vase_management" | "vase_rest";
export type PlatformModuleKey = "business" | "labs" | "management" | "rest";
export type ModuleBillingType = "monthly" | "one_time" | "yearly" | "custom" | "included";
export type ModuleStatus = "active" | "inactive";
export type ModuleProduct = "BUSINESS" | "LABS" | "MANAGEMENT" | "REST";

export type PlatformSubmoduleDefinition = {
  key: string;
  name: string;
  description: string;
  route: string;
  pricing: {
    development: number;
    hostingMonthly?: number | null;
    hostingYearly?: number | null;
    currency: string;
  };
};

export type PlatformModuleDefinition = {
  id: PlatformModuleId;
  key: PlatformModuleKey;
  name: string;
  description: string;
  summary: string;
  route: string;
  activationRoute: string;
  icon: LucideIcon;
  product: ModuleProduct;
  featureFlagKey: string;
  supportedProducts: readonly ("BUSINESS" | "LABS" | "BOTH" | "MANAGEMENT" | "REST")[];
  recommendedFlagPrefixes: readonly string[];
  activationMode: "automatic" | "manual" | "future";
  defaultPricing: {
    price: number;
    currency: string;
    type: Extract<ModuleBillingType, "monthly" | "one_time">;
  } | null;
  submodules: readonly PlatformSubmoduleDefinition[];
  billing: {
    type: ModuleBillingType;
    monthlyFrom?: number | null;
    setupFrom?: number | null;
    currency: string;
  };
};

export type PlatformModuleAccess = {
  id: PlatformModuleId;
  key: PlatformModuleKey;
  name: string;
  description: string;
  summary: string;
  route: string;
  activationRoute: string;
  product: ModuleProduct;
  featureFlagKey: string;
  isActive: boolean;
  isRecommended: boolean;
  status: ModuleStatus;
  statusLabel: "Activo" | "No contratado";
  activationMode: PlatformModuleDefinition["activationMode"];
  currentPricing: {
    price: number | null;
    currency: string;
    type: Extract<ModuleBillingType, "monthly" | "one_time" | "yearly">;
  } | null;
  billing: PlatformModuleDefinition["billing"];
};

export const MODULE_ICON_MAP: Record<PlatformModuleKey, LucideIcon> = {
  business: Building2,
  labs: FlaskConical,
  management: Landmark,
  rest: UtensilsCrossed,
};

export const platformModules: readonly PlatformModuleDefinition[] = [
  {
    id: "vase_business",
    key: "business",
    name: "vase_business",
    description:
      "Ecommerce, paginas, dominios, integraciones operativas y crecimiento comercial desde un mismo workspace.",
    summary: "Storefront, catalogo, dominios y capas de negocio conectadas al tenant.",
    route: BUSINESS_WORKSPACE_PATH,
    activationRoute: "/precios",
    icon: Building2,
    product: "BUSINESS",
    featureFlagKey: "business_pages",
    supportedProducts: ["BUSINESS", "BOTH"],
    recommendedFlagPrefixes: ["business_", "integrations_", "premium_"],
    activationMode: "automatic",
    defaultPricing: {
      price: 1800000,
      currency: "ARS",
      type: "one_time",
    },
    submodules: [
      {
        key: "plantilla",
        name: "Plantilla",
        description: "Sitio con base prediseñada para salida rapida.",
        route: "/app/business/plantilla",
        pricing: {
          development: 780000,
          hostingMonthly: 25000,
          hostingYearly: 280000,
          currency: "ARS",
        },
      },
      {
        key: "personalizado",
        name: "Personalizado",
        description: "Desarrollo a medida con alcance completo.",
        route: "/app/business/personalizado",
        pricing: {
          development: 1800000,
          hostingMonthly: 25000,
          hostingYearly: 280000,
          currency: "ARS",
        },
      },
    ],
    billing: {
      type: "one_time",
      setupFrom: 1800000,
      currency: "ARS",
    },
  },
  {
    id: "vase_labs",
    key: "labs",
    name: "vase_labs",
    description:
      "IA, conocimiento, canales conversacionales, automatizacion y escalamiento a soporte humano.",
    summary: "Asistente entrenable, canales conectados y operaciones de automatizacion por tenant.",
    route: "/app/labs",
    activationRoute: "/precios",
    icon: FlaskConical,
    product: "LABS",
    featureFlagKey: "labs_ai",
    supportedProducts: ["LABS", "BOTH"],
    recommendedFlagPrefixes: ["labs_", "automation_", "meta_"],
    activationMode: "automatic",
    defaultPricing: {
      price: 120000,
      currency: "ARS",
      type: "monthly",
    },
    submodules: [
      {
        key: "starter",
        name: "Starter",
        description: "1 canal de WhatsApp.",
        route: "/app/labs/starter",
        pricing: {
          development: 0,
          hostingMonthly: 120000,
          hostingYearly: null,
          currency: "ARS",
        },
      },
      {
        key: "growth",
        name: "Growth",
        description: "1 canal de WhatsApp + 1 canal de Instagram + 1 canal de Facebook Messenger.",
        route: "/app/labs/growth",
        pricing: {
          development: 0,
          hostingMonthly: 170000,
          hostingYearly: null,
          currency: "ARS",
        },
      },
      {
        key: "pro",
        name: "Pro",
        description: "1 canal de WhatsApp + 1 canal de Instagram.",
        route: "/app/labs/pro",
        pricing: {
          development: 0,
          hostingMonthly: 220000,
          hostingYearly: null,
          currency: "ARS",
        },
      },
    ],
    billing: {
      type: "monthly",
      monthlyFrom: 120000,
      currency: "ARS",
    },
  },
  {
    id: "vase_management",
    key: "management",
    name: "vase_management",
    description: "Gestion integral de productos, stock, ventas, clientes, compras, facturacion, tesoreria y reportes.",
    summary: "Operacion administrativa conectada en tiempo real con Vase Business y Vase Labs.",
    route: "/app/management",
    activationRoute: "/precios#management",
    icon: Landmark,
    product: "MANAGEMENT",
    featureFlagKey: "management_enabled",
    supportedProducts: ["MANAGEMENT"],
    recommendedFlagPrefixes: ["management_", "erp_", "operations_"],
    activationMode: "manual",
    defaultPricing: { price: 95000, currency: "ARS", type: "monthly" },
    submodules: [],
    billing: { type: "monthly", monthlyFrom: 95000, setupFrom: 350000, currency: "ARS" },
  },
  {
    id: "vase_rest",
    key: "rest",
    name: "vase_rest",
    description: "Operación gastronómica multi-sucursal con continuidad Edge, cocina, salón, caja e inventario.",
    summary: "Restaurantes conectados, configurables por sucursal y preparados para operar sin internet.",
    route: "https://rest.vase.ar",
    activationRoute: "/precios#rest",
    icon: UtensilsCrossed,
    product: "REST",
    featureFlagKey: "rest_enabled",
    supportedProducts: ["REST"],
    recommendedFlagPrefixes: ["rest_", "restaurant_", "edge_"],
    activationMode: "automatic",
    defaultPricing: null,
    submodules: [],
    billing: { type: "monthly", monthlyFrom: null, currency: "ARS" },
  },
] as const;

export function getPlatformModuleByKey(key: PlatformModuleKey) {
  return platformModules.find((module) => module.key === key) ?? null;
}
