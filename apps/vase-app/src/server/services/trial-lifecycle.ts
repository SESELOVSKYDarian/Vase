import { prisma } from "@/lib/db/prisma";
import { sendNoticeEmail } from "@/server/services/auth-email";
import { createAuditLog } from "@/server/services/audit-log";

function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export async function runTrialLifecycle() {
  const now = new Date();
  const subscriptions = await prisma.tenantSubscription.findMany({
    where: {
      billingStatus: "TRIAL",
    },
    include: {
      tenant: {
        select: { id: true, accountName: true, billingEmail: true },
      },
    },
  });

  for (const sub of subscriptions) {
    if (!sub.trialEndsAt) continue;
    const daysLeft = daysBetween(now, sub.trialEndsAt);

    if (daysLeft <= 7 && daysLeft > 0) {
      // Aviso solo para esa cuenta (antes salía como novedad para todas las cuentas).
      await prisma.adminNotification.updateMany({
        where: { tenantId: sub.tenantId, category: "trial", isActive: true },
        data: { isActive: false },
      });
      await prisma.adminNotification.create({
        data: {
          title: "Tu prueba de Business está por vencer",
          message: `Faltan ${daysLeft} día(s) para que termine la prueba.`,
          category: "trial",
          tone: daysLeft <= 2 ? "danger" : "warning",
          target: "TENANT",
          tenantId: sub.tenantId,
          isActive: true,
        },
      });
      if (sub.tenant.billingEmail) {
        await sendNoticeEmail({
          email: sub.tenant.billingEmail,
          subject: "Aviso de trial Business",
          message: `Tu trial vence en ${daysLeft} dia(s). Activa tu plan para evitar bloqueo.`,
        });
      }
      await createAuditLog({
        action: "trial.warning_sent",
        targetType: "tenant_subscription",
        tenantId: sub.tenantId,
        targetId: sub.id,
        metadata: { daysLeft },
      });
    }

    if (daysLeft <= 0 && !sub.businessBlockedAt) {
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: {
          temporaryPagesEnabled: false,
          businessBlockedAt: now,
          graceEndsAt: sub.graceEndsAt ?? new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      await createAuditLog({
        action: "trial.business_blocked",
        targetType: "tenant_subscription",
        tenantId: sub.tenantId,
        targetId: sub.id,
      });
    }

    const graceEnded = sub.graceEndsAt && sub.graceEndsAt.getTime() < now.getTime();
    if (graceEnded && !sub.businessDeletedAt) {
      await prisma.$transaction([
        prisma.storefrontPage.deleteMany({ where: { tenantId: sub.tenantId } }),
        prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { businessDeletedAt: now },
        }),
      ]);
      await createAuditLog({
        action: "trial.business_deleted",
        targetType: "tenant_subscription",
        tenantId: sub.tenantId,
        targetId: sub.id,
      });
    }
  }
}
