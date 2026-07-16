import { assertServiceToken } from "@vase/internal-api";
import { labsCatalogSyncSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { labsCatalogService } from "../../../../../lib/catalog-repository";

export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
    const batch = labsCatalogSyncSchema.parse(await request.json());
    return NextResponse.json(await labsCatalogService.sync(batch));
  } catch (error) {
    const message = error instanceof Error ? error.message : "CATALOG_SYNC_FAILED";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
