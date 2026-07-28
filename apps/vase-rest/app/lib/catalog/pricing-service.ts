import { z } from "zod";

const priceSchema = z.object({
  amount: z.string().regex(/^(?:0|[1-9]\d*)\.\d{2}$/),
  currency: z.string().length(3).transform((v) => v.toUpperCase()),
  revision: z.number().int().positive(),
}).strict();
type Price = z.infer<typeof priceSchema>;

export function resolveProductPrice(input: {
  tenant: Price;
  groups: Price[];
  branch: Price | null;
}) {
  try {
    const tenant = priceSchema.parse(input.tenant);
    const groups = input.groups.map((price) => priceSchema.parse(price));
    const branch = input.branch ? priceSchema.parse(input.branch) : null;
    const selected = branch ?? [...groups].sort((a, b) => b.revision - a.revision)[0] ?? tenant;
    const source = branch ? "BRANCH" : groups.length ? "BRANCH_GROUP" : "TENANT";
    return { ...selected, source, overridden: source !== "TENANT" };
  } catch {
    throw new Error("REST_PRICE_INVALID");
  }
}
