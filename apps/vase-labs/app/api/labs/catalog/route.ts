import { z } from "zod";
import { NextResponse } from "next/server";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { labsCatalogService } from "../../../lib/catalog-repository";

const editorialSchema = z.object({
  externalProductId: z.string().min(1),
  offeredByChatbot: z.boolean(),
  aiAlias: z.string().trim().max(160).nullable(),
  aiDescription: z.string().trim().max(4000).nullable(),
  aiInstructions: z.string().trim().max(4000).nullable(),
});

export async function GET(request: Request) {
  const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
  return NextResponse.json({ products: await labsCatalogService.list(context.globalTenantId) });
}

export async function PATCH(request: Request) {
  try {
    const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const items = z.array(editorialSchema).min(1).parse(await request.json());
    const products = [];
    for (const item of items) {
      const { externalProductId, ...editorial } = item;
      products.push(await labsCatalogService.updateEditorial(context.globalTenantId, externalProductId, editorial));
    }
    return NextResponse.json({ products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CATALOG_UPDATE_FAILED";
    return NextResponse.json({ error: message }, { status: message.includes("SESSION") ? 401 : 400 });
  }
}
