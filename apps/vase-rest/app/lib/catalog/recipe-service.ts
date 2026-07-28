import { z } from "zod";

const recipeSchema = z.object({
  globalTenantId: z.string().min(1),
  productId: z.string().min(1),
  expectedRevision: z.number().int().positive(),
  items: z.array(z.object({
    ingredientId: z.string().min(1),
    quantity: z.string().regex(/^\d+(?:\.\d{1,6})?$/)
      .refine((value) => Number(value) > 0),
    unit: z.enum(["UNIT", "G", "KG", "ML", "L"]),
  }).strict()).min(1),
}).strict();

export function createRecipeService(repository: {
  replace(input: z.infer<typeof recipeSchema>): Promise<unknown>;
}) {
  return {
    async replace(raw: unknown) {
      return repository.replace(recipeSchema.parse(raw));
    },
  };
}
