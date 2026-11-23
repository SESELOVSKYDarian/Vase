"use server";

// Cobro de prueba: crea una factura chica en la cuenta que se elija para probar Mercado Pago de punta a punta
// (Pagar ahora o débito automático) con plata real, que después se devuelve desde Mercado Pago.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { syncAutoDebitAmount } from "@/server/services/mercadopago-autodebit";

export type TestChargeState = { ok?: boolean; message?: string };

const MAX_TEST_AMOUNT = 5000;

export async function createTestChargeAction(_: TestChargeState, formData: FormData): Promise<TestChargeState> {
  let session;
  try {
    session = await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    return { ok: false, message: "No tenés permiso de facturación." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const amount = Math.round(Number(String(formData.get("amount") ?? "100").replace(",", ".")) * 100) / 100;
  if (!email || email.length > 191) return { ok: false, message: "Escribí el correo del dueño de la cuenta." };
  if (!(amount >= 1 && amount <= MAX_TEST_AMOUNT)) return { ok: false, message: `El monto de prueba va de $1 a $${MAX_TEST_AMOUNT}.` };

  const owner = await prisma.user.findUnique({
    where: { email },
    select: {
      memberships: {
        where: { role: "OWNER" },
        select: { tenant: { select: { id: true, name: true } } },
        take: 1,
      },
    },
  });
  const tenant = owner?.memberships[0]?.tenant;
  if (!tenant) return { ok: false, message: "No encontramos una cuenta donde esa persona sea dueña." };

  const account =
    (await prisma.clientAccount.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" }, select: { id: true } })) ??
    (await prisma.clientAccount.create({ data: { tenantId: tenant.id, name: tenant.name, email }, select: { id: true } }));

  const created = await prisma.clientPayment.create({
    data: {
      tenantId: tenant.id,
      clientAccountId: account.id,
      createdByUserId: session.user.id,
      concept: "Prueba de pago (Vase)",
      category: "OTHER",
      totalAmount: amount,
      paidAmount: 0,
      dueAt: new Date(),
      notes: "Cobro de prueba para verificar Mercado Pago. Devolver desde Mercado Pago después de probar.",
    },
    select: { id: true },
  });
  await syncAutoDebitAmount(tenant.id);
  await createAuditLog({
    action: "billing.test_charge_created",
    targetType: "client_payment",
    targetId: created.id,
    tenantId: tenant.id,
    actorUserId: session.user.id,
    metadata: { amount },
  });
  revalidatePath("/app/admin/finance");
  return { ok: true, message: `Listo: ${tenant.name} tiene una factura de $${amount}. Entrá con esa cuenta a Plan y pagos.` };
}
