import { assertServiceToken } from "@vase/internal-api";
import { managementSyncEventSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shouldApplySyncVersion } from "@/lib/integration/sync-core";

export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
    const event = managementSyncEventSchema.parse(await request.json());
    const company = await prisma.company.findUnique({ where: { globalTenantId: event.globalTenantId } });
    if (!company || company.integrationProvider !== "VASE_MANAGEMENT") return NextResponse.json({ error: "MANAGEMENT_PROVIDER_INACTIVE" }, { status: 409 });
    const duplicate = await prisma.managementSyncReceipt.findUnique({ where: { eventId: event.eventId } });
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true });

    await prisma.$transaction(async (tx) => {
      if (event.entity === "CUSTOMER") {
        const existing = await tx.customer.findUnique({ where: { companyId_globalExternalId: { companyId: company.id, globalExternalId: event.externalId } } });
        if (shouldApplySyncVersion(existing?.sourceVersion, event.version)) await tx.customer.upsert({ where: { companyId_globalExternalId: { companyId: company.id, globalExternalId: event.externalId } }, update: { name: String(event.payload.name ?? "Cliente web"), email: typeof event.payload.email === "string" ? event.payload.email : null, phone: typeof event.payload.phone === "string" ? event.payload.phone : null, sourceVersion: event.version, isActive: event.action === "UPSERT" }, create: { companyId: company.id, globalExternalId: event.externalId, name: String(event.payload.name ?? "Cliente web"), email: typeof event.payload.email === "string" ? event.payload.email : null, phone: typeof event.payload.phone === "string" ? event.payload.phone : null, sourceVersion: event.version, isActive: event.action === "UPSERT" } });
      }
      if (event.entity === "ORDER") {
        const existing = await tx.sale.findUnique({ where: { companyId_globalExternalId: { companyId: company.id, globalExternalId: event.externalId } } });
        if (shouldApplySyncVersion(existing?.sourceVersion, event.version)) {
          const customerData = event.payload.customer && typeof event.payload.customer === "object" ? event.payload.customer as Record<string, unknown> : {};
          const customerEmail = typeof customerData.email === "string" ? customerData.email : null;
          let customer = customerEmail ? await tx.customer.findFirst({ where: { companyId: company.id, email: customerEmail } }) : null;
          if (!customer && (customerEmail || customerData.name)) customer = await tx.customer.create({ data: { companyId: company.id, name: String(customerData.name ?? customerEmail ?? "Cliente web"), email: customerEmail, phone: typeof customerData.phone === "string" ? customerData.phone : null } });
          const saleData = { companyId: company.id, globalExternalId: event.externalId, sourceVersion: event.version, number: String(event.payload.orderNumber ?? event.externalId), customerId: customer?.id ?? null, subtotal: Number(event.payload.subtotalAmount ?? 0), total: Number(event.payload.totalAmount ?? 0), balance: Number(event.payload.totalAmount ?? 0), status: "CONFIRMED" as const };
          const sale = existing ? await tx.sale.update({ where: { id: existing.id }, data: saleData }) : await tx.sale.create({ data: saleData });
          if (!existing && Array.isArray(event.payload.items)) for (const raw of event.payload.items) {
            const item = raw as Record<string, unknown>; const sku = String(item.sku ?? "SIN-SKU");
            let product = await tx.product.findFirst({ where: { companyId: company.id, code: sku } });
            if (!product) product = await tx.product.create({ data: { companyId: company.id, code: sku, name: String(item.name ?? sku), price: Number(item.unitPrice ?? 0), stock: 0 } });
            await tx.saleItem.create({ data: { saleId: sale.id, productId: product.id, description: String(item.name ?? product.name), quantity: Number(item.quantity ?? 1), unitPrice: Number(item.unitPrice ?? 0), subtotal: Number(item.totalAmount ?? 0), ivaAmount: 0, total: Number(item.totalAmount ?? 0) } });
          }
        }
      }
      await tx.managementSyncReceipt.create({ data: { eventId: event.eventId, companyId: company.id, globalTenantId: event.globalTenantId, entity: event.entity, externalId: event.externalId, version: event.version } });
      await tx.company.update({ where: { id: company.id }, data: { lastSyncAt: new Date(), lastSyncError: null, provisioningStatus: "READY" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "SYNC_FAILED" }, { status: 400 }); }
}
