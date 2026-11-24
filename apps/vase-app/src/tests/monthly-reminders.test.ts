import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  auditLog: { findFirst: vi.fn() },
  tenant: { findUnique: vi.fn() },
  membership: { findMany: vi.fn() },
  clientAccount: { findFirst: vi.fn() },
  clientPayment: { findFirst: vi.fn(), create: vi.fn() },
  adminNotification: { create: vi.fn() },
  announcement: { create: vi.fn() },
}));
const auditMock = vi.hoisted(() => ({ createAuditLog: vi.fn() }));
const mailMock = vi.hoisted(() => ({ sendNoticeEmail: vi.fn() }));
const mpMock = vi.hoisted(() => ({ createCheckoutUrl: vi.fn(), isMercadoPagoConfigured: vi.fn() }));
const debitMock = vi.hoisted(() => ({ syncAutoDebitAmount: vi.fn() }));
const allocMock = vi.hoisted(() => ({ rebuildPaymentAllocations: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/services/audit-log", () => auditMock);
vi.mock("@/server/services/auth-email", () => mailMock);
vi.mock("@/server/services/mercadopago", () => mpMock);
vi.mock("@/server/services/mercadopago-autodebit", () => debitMock);
vi.mock("@/server/services/payment-allocations", () => allocMock);

import { runMonthlyReminders } from "@/server/services/monthly-reminders";

const invoice = { id: "p1", concept: "IA de Vase Labs — noviembre de 2026", totalAmount: 90000, paidAmount: 0, paidAt: null };

describe("recordatorio mensual de Teflón", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue({ id: "t1", billingEmail: "pagos@cliente.com" });
    prismaMock.membership.findMany.mockResolvedValue([{ user: { id: "u1", email: "Duenio@Cliente.com" } }]);
    prismaMock.clientAccount.findFirst.mockResolvedValue({ id: "c1" });
    prismaMock.clientPayment.findFirst.mockResolvedValue(null);
    prismaMock.clientPayment.create.mockResolvedValue(invoice);
    prismaMock.adminNotification.create.mockResolvedValue({ id: "n1" });
    mpMock.isMercadoPagoConfigured.mockReturnValue(true);
    mpMock.createCheckoutUrl.mockResolvedValue("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=abc");
  });

  it("antes del 26 (hora de Argentina) no hace nada", async () => {
    await runMonthlyReminders(new Date("2026-11-26T02:00:00Z")); // 25/11 23:00 en Argentina
    expect(prismaMock.auditLog.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.clientPayment.create).not.toHaveBeenCalled();
  });

  it("el 26 carga la factura en Pagos, saca de ahí el link de Mercado Pago y avisa solo a la cuenta", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue(null);
    await runMonthlyReminders(new Date("2026-11-26T13:00:00Z"));

    expect(prismaMock.clientPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: "t1", clientAccountId: "c1", category: "LABS_MONTHLY", totalAmount: 90000, concept: "IA de Vase Labs — noviembre de 2026" }),
      }),
    );
    expect(allocMock.rebuildPaymentAllocations).toHaveBeenCalledWith("p1");
    expect(mpMock.createCheckoutUrl).toHaveBeenCalledWith(invoice);
    expect(prismaMock.adminNotification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ target: "TENANT", tenantId: "t1" }) });
    expect(prismaMock.announcement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ targetUserIds: ["u1"], ctaUrl: "/app/billing" }) });

    expect(mailMock.sendNoticeEmail).toHaveBeenCalledTimes(2);
    const mail = mailMock.sendNoticeEmail.mock.calls[0][0];
    expect(mail.replyTo).toBe("facturacion@vase.ar");
    expect(mail.button).toEqual({ label: "Pagar con Mercado Pago", url: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=abc" });
    expect(mail.message).toContain("$90.000");
    expect(mail.message).toContain("alias dariansese");
  });

  it("si la factura del mes ya existe, la reusa", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue(null);
    prismaMock.clientPayment.findFirst.mockResolvedValue(invoice);
    await runMonthlyReminders(new Date("2026-11-27T13:00:00Z"));
    expect(prismaMock.clientPayment.create).not.toHaveBeenCalled();
    expect(mpMock.createCheckoutUrl).toHaveBeenCalledWith(invoice);
  });

  it("sin Mercado Pago, el botón lleva a pagar desde Vase", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue(null);
    mpMock.isMercadoPagoConfigured.mockReturnValue(false);
    await runMonthlyReminders(new Date("2026-11-26T13:00:00Z"));
    expect(mailMock.sendNoticeEmail.mock.calls[0][0].button).toEqual({ label: "Pagar desde Vase", url: "https://app.vase.ar/app/billing" });
  });

  it("no lo repite si ya salió ese mes", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue({ id: "a1" });
    await runMonthlyReminders(new Date("2026-11-28T13:00:00Z"));
    expect(prismaMock.clientPayment.create).not.toHaveBeenCalled();
    expect(mailMock.sendNoticeEmail).not.toHaveBeenCalled();
  });
});
