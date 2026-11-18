import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { MarketingStudio } from "./marketing-studio";

export const dynamic = "force-dynamic";

/** Marketing: imágenes para vender, pedidas como en un chat. El producto del catálogo es opcional. */
export default async function LabsMarketingPage() {
  const requestHeaders = await headers();
  let resolved;
  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fmarketing");
    }
    redirect("https://app.vase.ar/app");
  }

  const products = await labsPrisma.catalogProduct.findMany({
    where: { globalTenantId: resolved.context.globalTenantId, active: true },
    orderBy: { name: "asc" },
    take: 400,
    select: { id: true, name: true, price: true, imageUrl: true },
  });

  return (
    <MarketingStudio
      businessName={resolved.context.tenantName}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price == null ? null : Number(product.price),
        imageUrl: product.imageUrl && /^https:\/\//.test(product.imageUrl) ? product.imageUrl : null,
      }))}
    />
  );
}
