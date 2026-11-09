import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessWebs, type BusinessWeb } from "@/components/panel/business-webs";
import { canCreateStorefrontPage, getEffectivePlan, getPlanLimits, resolveBusinessWebLimit } from "@/lib/business/plans";
import { formatMeetingTime, formatSlotDay } from "@/lib/business/work-board";
import { describeWebState, webLimitText, webPalette, webRemainingText } from "@/lib/business/web-cards";
import { prisma } from "@/lib/db/prisma";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getBusinessOwnerDashboard, getUnifiedTenantDashboard } from "@/server/queries/dashboard";

export default async function BusinessPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, shellDashboard, subscription, slots, businessSubmoduleAccess] = await Promise.all([
    getBusinessOwnerDashboard(membership.tenantId),
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    prisma.tenantSubscription.findUnique({ where: { tenantId: membership.tenantId } }).catch(() => null),
    prisma.meetingAvailabilitySlot.findMany({
      where: {
        tenantId: membership.tenantId,
        isActive: true,
        endsAt: { gte: new Date() },
        reservedCount: { lt: prisma.meetingAvailabilitySlot.fields.capacity },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
      select: { id: true, startsAt: true },
    }),
    prisma.moduleSubmodule.findMany({
      where: { moduleId: "vase_business", isActive: true },
      select: {
        key: true,
        tenantLinks: {
          where: { tenantId: membership.tenantId },
          select: { isActive: true },
          take: 1,
        },
      },
    }),
  ]);
  if (!dashboard || !shellDashboard) forbidden();
  if (!shellDashboard.modules.some((module) => module.key === "business" && module.isActive)) {
    forbidden();
  }

  const effectivePlan = getEffectivePlan(subscription);
  const hasExplicitBusinessSubmoduleAccess = businessSubmoduleAccess.some((submodule) => submodule.tenantLinks.length > 0);
  const canUseTemplateFlow =
    !hasExplicitBusinessSubmoduleAccess ||
    businessSubmoduleAccess.some((submodule) => submodule.key === "plantilla" && submodule.tenantLinks.some((link) => link.isActive));
  const canUseCustomFlow =
    !hasExplicitBusinessSubmoduleAccess ||
    businessSubmoduleAccess.some((submodule) => submodule.key === "personalizado" && submodule.tenantLinks.some((link) => link.isActive));
  const limit = resolveBusinessWebLimit(effectivePlan);
  const visiblePages = dashboard.storefrontPages.filter((page) => page.status !== "ARCHIVED");
  const canCreatePage = canCreateStorefrontPage(visiblePages, effectivePlan);

  const webs: BusinessWeb[] = visiblePages.map((page, index) => {
    const connected = page.domainConnections.filter((domain) => domain.status === "CONNECTED");
    const domain = connected[0]?.hostname ?? page.domainConnections[0]?.hostname ?? null;
    const { state, tone } = describeWebState(page.status);
    const sub = page.isTemporary
      ? page.lifecycle.label
      : page.description?.trim() || (domain ? "Tu web en Vase" : "Todavía sin dominio propio");
    return {
      id: page.id,
      name: page.name,
      sub,
      address: domain ?? "Sin dominio todavía",
      url: connected[0] ? `https://${connected[0].hostname}` : null,
      hasDomain: page.domainConnections.length > 0,
      state,
      tone,
      ...webPalette(index),
    };
  });

  return (
    <AppShell
      title="Vase Business"
      subtitle="Tus webs"
      tenantLabel={membership.tenant.name}
      currentUserName={session.user.name ?? membership.tenant.name}
      notifications={shellDashboard.notifications}
      modules={shellDashboard.modules}
      projectCreation={shellDashboard.projectCreation}
    >
      <BusinessWebs
        webs={webs}
        slots={slots.map((slot) => ({
          id: slot.id,
          day: formatSlotDay(slot.startsAt),
          time: formatMeetingTime(slot.startsAt),
        }))}
        limitText={webLimitText(webs.length, limit)}
        remainingText={webRemainingText(webs.length, limit)}
        canCreate={canCreatePage}
        canUseTemplate={canUseTemplateFlow}
        canUseCustom={canUseCustomFlow}
        canUseDomain={getPlanLimits(effectivePlan).canUseCustomDomain}
      />
    </AppShell>
  );
}
