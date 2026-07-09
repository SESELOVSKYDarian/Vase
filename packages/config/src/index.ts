export type V3WorkspaceApp = {
  key:
    | "vase-portal"
    | "vase-app"
    | "vase-admin"
    | "vase-help"
    | "vase-business"
    | "vase-management"
    | "vase-labs"
    | "vase-workplace";
  path: string;
  domain: string;
  packageName: string;
  databaseService: string;
  responsibility: string;
};

export type V3WorkspacePackage = {
  name: string;
  path: string;
  responsibility: string;
};

export const v3WorkspaceApps: V3WorkspaceApp[] = [
  {
    key: "vase-portal",
    path: "apps/vase-portal",
    domain: "vase.ar",
    packageName: "@vase/portal",
    databaseService: "postgres-portal",
    responsibility: "Marketing, SEO, captacion, registro y login inicial.",
  },
  {
    key: "vase-app",
    path: "apps/vase-app",
    domain: "app.vase.ar",
    packageName: "@vase/app",
    databaseService: "vase-db",
    responsibility: "Identidad, tenants, billing, marketplace y launcher.",
  },
  {
    key: "vase-admin",
    path: "apps/vase-admin",
    domain: "admin.vase.ar",
    packageName: "@vase/admin",
    databaseService: "postgres-admin",
    responsibility: "Gobierno global, auditoria, monitoreo y operaciones.",
  },
  {
    key: "vase-help",
    path: "apps/vase-help",
    domain: "help.vase.ar",
    packageName: "@vase/help",
    databaseService: "postgres-help",
    responsibility: "Documentacion, FAQs, changelog y knowledge base.",
  },
  {
    key: "vase-business",
    path: "apps/vase-business",
    domain: "business.vase.ar",
    packageName: "@vase/business",
    databaseService: "postgres-business",
    responsibility: "Ecommerce SaaS, catalogo, pedidos y dominios.",
  },
  {
    key: "vase-management",
    path: "apps/vase-management",
    domain: "management.vase.ar",
    packageName: "@vase/management",
    databaseService: "postgres-management",
    responsibility: "ERP SaaS, stock, ventas, compras y tesoreria.",
  },
  {
    key: "vase-labs",
    path: "apps/vase-labs",
    domain: "labs.vase.ar",
    packageName: "@vase/labs",
    databaseService: "vase-db",
    responsibility: "IA SaaS, chatbots, inbox, training y automatizaciones.",
  },
  {
    key: "vase-workplace",
    path: "apps/vase-workplace",
    domain: "workplace.vase.ar",
    packageName: "@vase/workplace",
    databaseService: "postgres-workplace",
    responsibility: "Operacion interna, tickets, QA, desarrollo y worklogs.",
  },
];

export const v3WorkspacePackages: V3WorkspacePackage[] = [
  {
    name: "@vase/contracts",
    path: "packages/contracts",
    responsibility: "Contratos compartidos entre servicios V3.",
  },
  {
    name: "@vase/config",
    path: "packages/config",
    responsibility: "Catalogo de apps, dominios y servicios V3.",
  },
  {
    name: "@vase/auth",
    path: "packages/auth",
    responsibility: "Tipos y helpers base de identidad compartida.",
  },
  {
    name: "@vase/ui",
    path: "packages/ui",
    responsibility: "Primitivos UI compartidos entre apps V3.",
  },
  {
    name: "@vase/internal-api",
    path: "packages/internal-api",
    responsibility: "Helpers service-to-service y rutas internas.",
  },
];
