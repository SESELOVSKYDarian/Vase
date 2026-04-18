import { prisma } from "@/lib/db/prisma";
import {
  createInitialBuilderDocument,
  getBuilderCapabilities,
  normalizeBuilderDocument,
  type BuilderDocument,
} from "@/lib/business/builder";
import { getEffectivePlan } from "@/lib/business/plans";

/**
 * Busca un sitio (StorefrontPage) basado en el hostname de la petición.
 * Soporta búsqueda por dominio personalizado y por subdominio.
 */
export async function getStorefrontByHostname(hostname: string) {
  const baseDomain = process.env.NODE_ENV === "production" ? "vase.ar" : "localhost:3000";
  
  // 1. Intentar buscar por Dominio Personalizado (DomainConnection)
  const connection = await prisma.domainConnection.findUnique({
    where: { hostname },
    include: {
      storefrontPage: {
        include: {
          tenant: true,
          versions: {
            where: { kind: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (connection?.storefrontPage) {
    return decorateStorefrontData(connection.storefrontPage);
  }

  // 2. Intentar buscar por Subdominio (slug.vase.ar)
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.replace(`.${baseDomain}`, "");
    
    // Un pequeño resguardo si el slug es vacío o 'www'
    if (slug && slug !== "www") {
      const page = await prisma.storefrontPage.findUnique({
        where: { tenantId_slug: { tenantId: "", slug } }, // Esto fallará si no tenemos el tenantId
      });
      
      // Corregimos la query: La base de datos tiene una restricción unique en [tenantId, slug].
      // Pero para subdominios globales, necesitamos buscar el slug único en toda la tabla.
      // Re-verificamos el esquema: @@unique([tenantId, slug])
      // Esto significa que dos tenants podrían tener el mismo slug? 
      // El esquema dice: @@unique([tenantId, slug]). 
      // Si queremos subdominios únicos globales, necesitamos buscar por slug sin tenantId o asegurar unicidad global.
      
      const pages = await prisma.storefrontPage.findMany({
        where: { slug, status: { in: ["ACTIVE", "TEMPORARY"] } },
        include: {
          tenant: true,
          versions: {
            where: { kind: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      });

      // Si hay varios tenants con el mismo slug, por ahora tomamos el primero o el más reciente.
      // Lo ideal es que el proceso de creación de slug valide unicidad global si se usarán subdominios globales.
      if (pages.length > 0) {
        return decorateStorefrontData(pages[0]);
      }
    }
  }

  return null;
}

/**
 * Decora los datos del sitio con capacidades y documento normalizado.
 * Similar a getStorefrontBuilderData pero optimizado para lectura pública.
 */
async function decorateStorefrontData(page: any) {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId: page.tenantId },
  });

  const effectivePlan = getEffectivePlan(subscription);
  const capabilities = getBuilderCapabilities({
    isTemporary: page.isTemporary,
    plan: effectivePlan.plan,
  });

  // Usamos la versión publicada si existe, sino el borrador actual (fallback)
  const rawDocument = (page.versions[0]?.snapshot as BuilderDocument | null) ?? 
    (page.builderDocument as BuilderDocument | null) ??
    createInitialBuilderDocument(page.templateKey);
    
  const document = normalizeBuilderDocument(rawDocument, capabilities);

  return {
    page,
    tenant: page.tenant,
    plan: effectivePlan,
    capabilities,
    document,
  };
}
