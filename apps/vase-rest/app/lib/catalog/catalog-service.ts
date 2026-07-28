import { z } from "zod";

const categorySchema = z.object({
  code: z.string().trim().min(2).max(30).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
}).strict();
const productSchema = z.object({
  categoryId: z.string().min(1),
  sku: z.string().trim().min(2).max(40).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).optional(),
  available: z.boolean().default(true),
  taxRate: z.enum(["0.00", "2.50", "5.00", "10.50", "21.00", "27.00"])
    .default("21.00"),
  taxIncluded: z.boolean().default(true),
}).strict();
const updateSchema = z.object({
  expectedRevision: z.number().int().positive(),
  sku: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  available: z.boolean().optional(),
  taxRate: z.enum(["0.00", "2.50", "5.00", "10.50", "21.00", "27.00"])
    .optional(),
  taxIncluded: z.boolean().optional(),
}).strict();

type ProductIdentity = {
  id: string;
  globalTenantId: string;
  sku: string;
  revision: number;
};
export interface CatalogRepository {
  createCategory(input: { globalTenantId: string } & z.infer<typeof categorySchema>): Promise<unknown>;
  createProduct(input: { globalTenantId: string } & z.infer<typeof productSchema>): Promise<unknown>;
  findProduct(globalTenantId: string, productId: string): Promise<ProductIdentity | null>;
  updateProduct(input: {
    globalTenantId: string;
    productId: string;
    expectedRevision: number;
    categoryId?: string;
    name?: string;
    description?: string | null;
    available?: boolean;
    taxRate?: string;
    taxIncluded?: boolean;
  }): Promise<unknown>;
}

export function createCatalogService(repository: CatalogRepository) {
  return {
    createCategory(globalTenantId: string, raw: unknown) {
      return repository.createCategory({ globalTenantId, ...categorySchema.parse(raw) });
    },
    createProduct(globalTenantId: string, raw: unknown) {
      return repository.createProduct({ globalTenantId, ...productSchema.parse(raw) });
    },
    async updateProduct(globalTenantId: string, productId: string, raw: unknown) {
      const input = updateSchema.parse(raw);
      const product = await repository.findProduct(globalTenantId, productId);
      if (!product || product.globalTenantId !== globalTenantId) {
        throw new Error("REST_PRODUCT_NOT_FOUND");
      }
      if (input.sku && input.sku.toUpperCase() !== product.sku) {
        throw new Error("REST_PRODUCT_SKU_IMMUTABLE");
      }
      if (product.revision !== input.expectedRevision) {
        throw new Error("REST_CATALOG_REVISION_CONFLICT");
      }
      const { sku: _sku, ...changes } = input;
      return repository.updateProduct({ globalTenantId, productId, ...changes });
    },
  };
}
