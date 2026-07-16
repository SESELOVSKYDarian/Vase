import { headers } from "next/headers";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { labsCatalogService } from "../../../lib/catalog-repository";
import { CatalogWorkspace } from "./catalog-workspace";

export const dynamic = "force-dynamic";

export default async function LabsCatalogPage() {
  const requestHeaders = await headers();
  const { context } = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  return <CatalogWorkspace initialProducts={await labsCatalogService.list(context.globalTenantId)} />;
}
