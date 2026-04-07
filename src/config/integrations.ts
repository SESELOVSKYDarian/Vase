export const integrationScopes = [
  "catalog:read",
  "stock:read",
  "prices:read",
  "categories:read",
  "orders:read",
  "clients:read",
  "webhooks:manage",
] as const;

export type IntegrationScope = (typeof integrationScopes)[number];

export const integrationResources = [
  "products",
  "stock",
  "prices",
  "categories",
  "orders",
  "clients",
] as const;

export type IntegrationResource = (typeof integrationResources)[number];

export const integrationResourceToScope: Record<IntegrationResource, IntegrationScope> = {
  products: "catalog:read",
  stock: "stock:read",
  prices: "prices:read",
  categories: "categories:read",
  orders: "orders:read",
  clients: "clients:read",
};

export const webhookEventCatalog = [
  {
    key: "orders.created",
    description: "Se dispara cuando Vase registra un nuevo pedido sincronizado.",
  },
  {
    key: "orders.updated",
    description: "Notifica cambios de estado comercial o logistico en pedidos.",
  },
  {
    key: "catalog.updated",
    description: "Resume cambios relevantes de catalogo, stock o precios.",
  },
  {
    key: "clients.updated",
    description: "Propaga altas o cambios importantes en datos comerciales de clientes.",
  },
] as const;

export const webhookEventKeys = webhookEventCatalog.map((item) => item.key) as [
  (typeof webhookEventCatalog)[number]["key"],
  ...(typeof webhookEventCatalog)[number]["key"][],
];

export const integrationApiExamples = {
  products: {
    data: [
      {
        externalId: "SKU-1001",
        name: "Set de vajilla Arena",
        sku: "VASE-ARENA-12",
        status: "active",
        categoryCode: "hogar",
        priceListCode: "base-ar",
      },
    ],
  },
  stock: {
    data: [
      {
        externalId: "SKU-1001",
        sku: "VASE-ARENA-12",
        warehouse: "central",
        available: 42,
        reserved: 3,
      },
    ],
  },
  prices: {
    data: [
      {
        externalId: "SKU-1001",
        sku: "VASE-ARENA-12",
        currency: "USD",
        amount: 129.9,
        compareAtAmount: 149.9,
      },
    ],
  },
  categories: {
    data: [
      {
        externalId: "cat-hogar",
        code: "hogar",
        name: "Hogar",
        isActive: true,
      },
    ],
  },
  orders: {
    data: [
      {
        externalId: "ORD-9001",
        number: "9001",
        status: "paid",
        currency: "USD",
        totalAmount: 259.8,
        customerExternalId: "CLI-72",
      },
    ],
  },
  clients: {
    data: [
      {
        externalId: "CLI-72",
        email: "compras@ejemplo.com",
        fullName: "Marta Ruiz",
        segment: "retail",
      },
    ],
  },
} as const;

export const integrationEndpointCatalog = [
  {
    method: "GET",
    path: "/api/v1/integrations/{tenantSlug}/products",
    scope: "catalog:read",
    summary: "Consulta productos publicados por el tenant.",
  },
  {
    method: "GET",
    path: "/api/v1/integrations/{tenantSlug}/stock",
    scope: "stock:read",
    summary: "Consulta disponibilidad por SKU y deposito.",
  },
  {
    method: "GET",
    path: "/api/v1/integrations/{tenantSlug}/prices",
    scope: "prices:read",
    summary: "Expone precios base y comparativos para sincronizacion comercial.",
  },
  {
    method: "GET",
    path: "/api/v1/integrations/{tenantSlug}/categories",
    scope: "categories:read",
    summary: "Lista categorias y su metadata comercial.",
  },
  {
    method: "GET",
    path: "/api/v1/integrations/{tenantSlug}/orders",
    scope: "orders:read",
    summary: "Devuelve pedidos para conciliacion o reporting externo.",
  },
  {
    method: "GET",
    path: "/api/v1/integrations/{tenantSlug}/clients",
    scope: "clients:read",
    summary: "Expone clientes y atributos comerciales basicos.",
  },
] as const;

export const integrationErrorExamples = [
  {
    code: "UNAUTHORIZED",
    status: 401,
    message: "La API key es invalida o fue revocada.",
  },
  {
    code: "FORBIDDEN_SCOPE",
    status: 403,
    message: "La credencial no tiene alcance suficiente para este recurso.",
  },
  {
    code: "RATE_LIMIT_EXCEEDED",
    status: 429,
    message: "Se alcanzo el limite de consumo para la ventana activa.",
  },
] as const;
