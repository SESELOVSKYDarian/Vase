import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  auditLog: { findFirst: vi.fn() },
  tenant: { findUnique: vi.fn() },
  membership: { findMany: vi.fn() },
  adminNotification: { create: vi.fn() },
  announcement: { create: vi.fn() },
}));
const auditMock = vi.hoisted(() => ({ createAuditLog: vi.fn() }));
const mailMock = vi.hoisted(() => ({ sendNoticeEmail: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/services/audit-log", () => auditMock);
vi.mock("@/server/services/auth-email", () => mailMock);

import { runMonthlyReminders } from "@/server/services/monthly-reminders";

describe("recordatorio mensual de Teflón", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue({ id: "t1", billingEmail: "pagos@cliente.com" });
    prismaMock.membership.findMany.mockResolvedValue([{ user: { id: "u1", email: "Duenio@Cliente.com" } }]);
    prismaMock.adminNotification.create.mockResolvedValue({ id: "n1" });
  });

  it("antes del 26 (hora de Argentina) no manda nada", async () => {
    await runMonthlyReminders(new Date("2026-11-26T02:00:00Z")); // 25/11 23:00 en Argentina
    expect(prismaMock.auditLog.findFirst).not.toHaveBeenCalled();
    expect(mailMock.sendNoticeEmail).not.toHaveBeenCalled();
  });

  it("el 26 manda notificación, anuncio solo para la cuenta y mail con respuestas a facturación", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue(null);
    await runMonthlyReminders(new Date("2026-11-26T13:00:00Z"));
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ targetId: "teflon-labs-ia:2026-11" }));
    expect(prismaMock.adminNotification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ target: "TENANT", tenantId: "t1" }) });
    expect(prismaMock.announcement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ targetUserIds: ["u1"], notificationId: "n1" }) });
    expect(mailMock.sendNoticeEmail).toHaveBeenCalledTimes(2);
    expect(mailMock.sendNoticeEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "duenio@cliente.com", replyTo: "facturacion@vase.ar" }));
    expect(mailMock.sendNoticeEmail.mock.calls[0][0].message).toContain("$90.000");
  });

  it("no lo repite si ya salió ese mes", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue({ id: "a1" });
    await runMonthlyReminders(new Date("2026-11-27T13:00:00Z"));
    expect(prismaMock.adminNotification.create).not.toHaveBeenCalled();
    expect(mailMock.sendNoticeEmail).not.toHaveBeenCalled();
  });
});
