import { ProductStatus, SyncJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  createSyncJob,
  getErpConnectionById,
  listErpConnectionsByTenant,
  updateSyncJob,
  upsertProductSyncRecord,
} from "@/server/queries/business/integrations";
import { buildCatalogListing } from "@/server/services/business/catalog";
import { createOrderNumber, readText, toNumber } from "@/server/services/business/shared";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeSyncItem(rawItem: unknown) {
  const raw = rawItem && typeof rawItem === "object" ? (rawItem as Record<string, unknown>) : {};
  const externalId = readText(raw.external_id ?? raw.externalId ?? raw.id ?? raw.sku);
  const sku = readText(raw.sku ?? raw.codigo ?? raw.codigo_propio) || externalId || createOrderNumber();
  const name =
    readText(raw.name ?? raw.title ?? raw.detalle_ampliado ?? raw.detalleAbreviado) || sku;
  const slug = slugify(name);
  const images = Array.isArray(raw.images ?? raw.imagenes) ? (raw.images ?? raw.imagenes) : [];
  const categoryLabels = Array.isArray(raw.category_labels)
    ? raw.category_labels.map((item) => String(item))
    : typeof raw.category === "string"
      ? [raw.category]
      : [];

  return {
    externalId,
    sku,
    slug,
    name,
    description: readText(raw.description ?? raw.descripcion ?? raw.texto_asociado),
    shortDescription: readText(raw.short_description ?? raw.detalle_abreviado),
    brand: readText(raw.brand ?? raw.marca),
    currency: readText(raw.currency) || "ARS",
    priceRetail: toNumber(raw.price_retail ?? raw.precio, 0),
    priceWholesale: readText(raw.price_wholesale ?? raw.mayorista) ? toNumber(raw.price_wholesale ?? raw.mayorista, 0) : null,
    stock: Math.max(0, Math.trunc(toNumber(raw.stock ?? raw.disponibilidad, 0))),
    images,
    categoryLabels,
    isActive: raw.is_active !== false && raw.activo !== false,
    rawPayload: raw,
  };
}

export async function buildIntegrationManifest(tenantId: string) {
  const connections = await listErpConnectionsByTenant(tenantId);

  return {
    tenantId,
    productSync: {
      supported: true,
      sourceSystems: connections.map((connection) => connection.sourceSystem),
      payload: {
        external_id: "SKU-001",
        sku: "SKU-001",
        name: "Producto ejemplo",
        description: "Descripcion ampliada",
        price_retail: 1000,
        price_wholesale: 850,
        stock: 5,
        images: ["https://cdn.midominio.com/producto.jpg"],
      },
    },
  };
}

export async function syncProductBatch(input: {
  tenantId: string;
  erpConnectionId?: string | null;
  sourceSystem: string;
  items: unknown[];
}) {
  const connection =
    input.erpConnectionId ? await getErpConnectionById(input.tenantId, input.erpConnectionId) : null;

  const job = await createSyncJob({
    tenantId: input.tenantId,
    erpConnectionId: connection?.id,
    sourceSystem: input.sourceSystem,
    operation: "upsert",
    status: SyncJobStatus.PROCESSING,
    startedAt: new Date(),
    rawPayload: {
      count: input.items.length,
    },
  });

  try {
    const normalizedItems = input.items.map(normalizeSyncItem);

    const results = await prisma.$transaction(
      normalizedItems.map((item) =>
        prisma.product.upsert({
          where: {
            tenantId_sku: {
              tenantId: input.tenantId,
              sku: item.sku,
            },
          },
          update: {
            name: item.name,
            slug: item.slug,
            description: item.description,
            shortDescription: item.shortDescription,
            brand: item.brand,
            currency: item.currency,
            priceRetail: item.priceRetail,
            priceWholesale: item.priceWholesale,
            stock: item.stock,
            images: item.images,
            isActiveSource: item.isActive,
            isVisibleWeb: item.isActive,
            status: item.isActive ? ProductStatus.ACTIVE : ProductStatus.ARCHIVED,
            sourceExternalId: item.externalId,
          },
          create: {
            tenantId: input.tenantId,
            sku: item.sku,
            slug: item.slug,
            name: item.name,
            description: item.description,
            shortDescription: item.shortDescription,
            brand: item.brand,
            currency: item.currency,
            priceRetail: item.priceRetail,
            priceWholesale: item.priceWholesale,
            stock: item.stock,
            images: item.images,
            isActiveSource: item.isActive,
            isVisibleWeb: item.isActive,
            status: item.isActive ? ProductStatus.ACTIVE : ProductStatus.ARCHIVED,
            sourceExternalId: item.externalId,
          },
        }),
      ),
    );

    await Promise.all(
      results.map((product, index) =>
        upsertProductSyncRecord({
          tenantId: input.tenantId,
          productId: product.id,
          erpConnectionId: connection?.id ?? null,
          externalId: normalizedItems[index].externalId || normalizedItems[index].sku,
          sourceSystem: input.sourceSystem,
          lastSyncAt: new Date(),
          rawPayload: normalizedItems[index].rawPayload,
        }),
      ),
    );

    await updateSyncJob(job.id, {
      status: SyncJobStatus.COMPLETED,
      completedAt: new Date(),
      summary: `Productos sincronizados: ${results.length}`,
    });

    return {
      jobId: job.id,
      synced: results.length,
    };
  } catch (error) {
    await updateSyncJob(job.id, {
      status: SyncJobStatus.FAILED,
      completedAt: new Date(),
      summary: error instanceof Error ? error.message : "Sync failed",
    });
    throw error;
  }
}

export async function previewIntegrationCatalog(tenantId: string) {
  return buildCatalogListing({
    tenantId,
    publicOnly: false,
    sort: "name-asc",
  });
}
