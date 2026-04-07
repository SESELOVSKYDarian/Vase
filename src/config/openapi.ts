export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Vase API",
    version: "0.2.0",
    description:
      "API REST versionada de Vase Business para conectar catalogos, stock, precios, categorias, pedidos y clientes desde sistemas de gestion externos.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
      },
      vaseApiKey: {
        type: "apiKey",
        in: "header",
        name: "x-vase-api-key",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              requestId: { type: "string" },
            },
          },
        },
      },
      ProjectInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 3, maxLength: 80 },
          description: { type: "string", maxLength: 280 },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string", nullable: true },
        },
      },
      Product: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          name: { type: "string" },
          sku: { type: "string" },
          status: { type: "string" },
          categoryCode: { type: "string" },
          priceListCode: { type: "string" },
        },
      },
      StockItem: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          sku: { type: "string" },
          warehouse: { type: "string" },
          available: { type: "number" },
          reserved: { type: "number" },
        },
      },
      PriceItem: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          sku: { type: "string" },
          currency: { type: "string" },
          amount: { type: "number" },
          compareAtAmount: { type: "number" },
        },
      },
      CategoryItem: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          code: { type: "string" },
          name: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          number: { type: "string" },
          status: { type: "string" },
          currency: { type: "string" },
          totalAmount: { type: "number" },
          customerExternalId: { type: "string" },
        },
      },
      ClientItem: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          email: { type: "string" },
          fullName: { type: "string" },
          segment: { type: "string" },
        },
      },
      IntegrationResponseMeta: {
        type: "object",
        properties: {
          tenantSlug: { type: "string" },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/v1/tenants/{tenantSlug}/projects": {
      get: {
        summary: "List projects for a tenant",
        security: [{ sessionAuth: [] }],
      },
      post: {
        summary: "Create a tenant project",
        security: [{ sessionAuth: [] }],
      },
    },
    "/v1/integrations/{tenantSlug}/products": {
      get: {
        summary: "List products for external integrations",
        security: [{ vaseApiKey: [] }],
      },
    },
    "/v1/integrations/{tenantSlug}/stock": {
      get: {
        summary: "List stock items for external integrations",
        security: [{ vaseApiKey: [] }],
      },
    },
    "/v1/integrations/{tenantSlug}/prices": {
      get: {
        summary: "List prices for external integrations",
        security: [{ vaseApiKey: [] }],
      },
    },
    "/v1/integrations/{tenantSlug}/categories": {
      get: {
        summary: "List categories for external integrations",
        security: [{ vaseApiKey: [] }],
      },
    },
    "/v1/integrations/{tenantSlug}/orders": {
      get: {
        summary: "List orders for external integrations",
        security: [{ vaseApiKey: [] }],
      },
    },
    "/v1/integrations/{tenantSlug}/clients": {
      get: {
        summary: "List clients for external integrations",
        security: [{ vaseApiKey: [] }],
      },
    },
  },
} as const;
