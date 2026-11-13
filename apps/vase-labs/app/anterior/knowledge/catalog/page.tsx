import { headers } from "next/headers";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { labsCatalogService } from "../../../lib/catalog-repository";
import { ensureExternalCatalogBackfill } from "../../../lib/catalog-backfill-runtime";
import { CatalogWorkspace } from "./catalog-workspace";

export const dynamic = "force-dynamic";

export default async function LabsCatalogPage() {
  const requestHeaders = await headers();
  const { context, assistant } = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  try {
    await ensureExternalCatalogBackfill({
      globalTenantId: context.globalTenantId,
      assistantId: assistant.id,
    });
  } catch (error) {
    console.error("external_catalog_backfill_failed", {
      globalTenantId: context.globalTenantId,
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
  }
  return <CatalogWorkspace initialProducts={await labsCatalogService.list(context.globalTenantId)} />;
}
