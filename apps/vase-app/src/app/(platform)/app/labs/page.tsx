import { forbidden } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bot, Brain, Cable, CheckCircle2, Gauge, Play } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { LabsSetupStepperModal } from "@/components/labs/labs-setup-stepper-modal";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { resolveMetaWebhookVerifyToken } from "@/lib/integrations/meta-webhook";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getLabsOwnerDashboard } from "@/server/queries/labs";

function readBusinessHours(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      hoursStart: "09:00",
      hoursEnd: "18:00",
    };
  }

  const candidate = input as {
    hoursStart?: string;
    hoursEnd?: string;
  };

  return {
    hoursStart: candidate.hoursStart ?? "09:00",
    hoursEnd: candidate.hoursEnd ?? "18:00",
  };
}

export default async function LabsPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, labsDashboard] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    getLabsOwnerDashboard(membership.tenantId),
  ]);
  if (!dashboard) forbidden();
  if (!dashboard.modules.some((module) => module.key === "labs" && module.isActive)) {
    forbidden();
  }

  const hours = readBusinessHours(labsDashboard?.workspace.businessHours);
  const hasTraining = Boolean(labsDashboard && labsDashboard.trainingJobs.length > 0);
  const setupItems = labsDashboard
    ? [
        { label: "Asistente", done: Boolean(labsDashboard.workspace.assistantDisplayName) && labsDashboard.workspace.humanEscalationEnabled, icon: Bot },
        { label: "Conocimiento", done: labsDashboard.setupSteps.hasKnowledge, icon: Brain },
        { label: "Canal", done: labsDashboard.setupSteps.hasChannel, icon: Cable },
        { label: "Training", done: hasTraining, icon: Play },
      ]
    : [];
  const completedSteps = setupItems.filter((item) => item.done).length;
  const setupProgress = setupItems.length > 0 ? Math.round((completedSteps / setupItems.length) * 100) : 0;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://vase.ar").trim().replace(/\/$/, "");
  const webhookPreviewUrl = `${appUrl}/api/v1/channels/whatsapp/${membership.tenant.slug}/webhook`;
  const webhookVerifyToken = resolveMetaWebhookVerifyToken(membership.tenant.slug);

  return (
    <AppShell
      title="Vase Labs"
      subtitle="Guia simple para crear tu chatbot y dejarlo activo."
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      projectCreation={dashboard.projectCreation}
    >
      {labsDashboard ? (
        <LabsSetupStepperModal
          tenantId={membership.tenantId}
          assistantDisplayName={labsDashboard.workspace.assistantDisplayName ?? ""}
          tone={labsDashboard.workspace.tone}
          timezone={labsDashboard.workspace.timezone}
          hoursStart={hours.hoursStart}
          hoursEnd={hours.hoursEnd}
          humanEscalationEnabled={labsDashboard.workspace.humanEscalationEnabled}
          escalationDestination={labsDashboard.workspace.escalationDestination ?? "EMAIL"}
          escalationContact={labsDashboard.workspace.escalationContact}
          premiumToneEnabled={labsDashboard.limits.canUsePremiumTone}
          hasKnowledge={labsDashboard.setupSteps.hasKnowledge}
          hasChannel={labsDashboard.setupSteps.hasChannel}
          hasTraining={hasTraining}
          canUseInstagram={labsDashboard.limits.canUseInstagram}
          webhookPreviewUrl={webhookPreviewUrl}
          webhookVerifyToken={webhookVerifyToken}
          connectedChannels={labsDashboard.connectedChannels}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(25,28,27,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="vase-kicker">Activacion rapida</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Deja tu IA lista para atender clientes
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Completa solo lo pendiente: identidad, conocimiento, canal y entrenamiento inicial.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/owner/labs"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                Abrir panel
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {setupItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <Icon className="size-5" />
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="size-5 text-[var(--success)]" />
                    ) : (
                      <span className="rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--warning)]">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-bold text-[var(--foreground)]">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <PanelCard
          eyebrow="Estado"
          title={`${setupProgress}% configurado`}
          description={
            labsDashboard?.setupSteps.hasChannel
              ? "Ya hay un canal conectado. Puedes monitorear conversaciones desde el panel."
              : "Cuando conectes un canal, aparecera como activo en Canales y empezara a recibir conversaciones."
          }
        >
          <div className="mb-5 h-3 overflow-hidden rounded-full bg-[var(--surface)]">
            <div className="h-full rounded-full bg-[var(--accent-strong)]" style={{ width: `${setupProgress}%` }} />
          </div>
          <Link
            href="/app/owner/labs/activity"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]"
          >
            <Gauge className="size-4" />
            Ver analisis
          </Link>
        </PanelCard>
      </section>
    </AppShell>
  );
}
