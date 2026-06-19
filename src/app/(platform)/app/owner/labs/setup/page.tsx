import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AssistantSettingsForm } from "@/components/labs/assistant-settings-form";
import { KnowledgeFileForm } from "@/components/labs/knowledge-file-form";
import { FaqForm } from "@/components/labs/faq-form";
import { KnowledgeUrlForm } from "@/components/labs/knowledge-url-form";
import { ChannelConnectionForm } from "@/components/labs/channel-connection-form";
import { TrainingJobForm } from "@/components/labs/training-job-form";
import { LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
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

export default async function LabsSetupPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const dashboard = await getLabsOwnerDashboard(membership.tenantId);

  if (!dashboard) {
    forbidden();
  }

  const hours = readBusinessHours(dashboard.workspace.businessHours);
  const steps = [
    {
      title: "Configurar asistente",
      done: Boolean(dashboard.workspace.assistantDisplayName),
    },
    {
      title: "Cargar conocimiento",
      done: dashboard.setupSteps.hasKnowledge,
    },
    {
      title: "Conectar un canal",
      done: dashboard.setupSteps.hasChannel,
    },
    {
      title: "Definir escalamiento",
      done: dashboard.setupSteps.hasEscalation,
    },
  ];

  return (
    <AppShell
      title="Setup guiado de VaseLabs"
      subtitle="Primeros pasos para dejar listo el chatbot de tu negocio con conocimiento, tono, horarios, canales y derivacion a humano."
      tenantLabel={membership.tenant.name}
    >
      <LabsSection
        eyebrow="Onboarding guiado"
        title="Completa la configuracion inicial"
        description="Este flujo resume lo minimo necesario para pasar de tenant creado a asistente utilizable en negocio real."
        actions={
          <Link href="/app/owner/labs" className="labs-button labs-button-secondary">
            Ir al panel completo
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step) => (
            <div key={step.title} className="labs-subpanel p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--foreground)]">{step.title}</p>
                <LabsStatusPill tone={step.done ? "success" : "warning"} label={step.done ? "Listo" : "Pendiente"} />
              </div>
            </div>
          ))}
        </div>
      </LabsSection>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <LabsSection
          eyebrow="Paso 1"
          title="Identidad del asistente"
          description="Define nombre, tono, horarios y regla de escalamiento desde el inicio."
        >
          <AssistantSettingsForm
            assistantDisplayName={dashboard.workspace.assistantDisplayName}
            tone={dashboard.workspace.tone}
            timezone={dashboard.workspace.timezone}
            hoursStart={hours.hoursStart}
            hoursEnd={hours.hoursEnd}
            humanEscalationEnabled={dashboard.workspace.humanEscalationEnabled}
            escalationDestination={dashboard.workspace.escalationDestination}
            escalationContact={dashboard.workspace.escalationContact}
            premiumToneEnabled={dashboard.limits.canUsePremiumTone}
          />
        </LabsSection>

        <LabsSection
          eyebrow="Paso 2"
          title="Entrenar conocimiento"
          description="Puedes combinar archivos, FAQs y URLs permitidas para construir la base inicial."
        >
          <div className="grid gap-5">
            <KnowledgeFileForm />
            <FaqForm />
            <KnowledgeUrlForm />
          </div>
        </LabsSection>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LabsSection
          eyebrow="Paso 3"
          title="Canales de atencion"
          description="Conecta primero el canal mas importante para tu operacion."
        >
          <ChannelConnectionForm canUseInstagram={dashboard.limits.canUseInstagram} />
        </LabsSection>

        <LabsSection
          eyebrow="Paso 4"
          title="Lanzar entrenamiento"
          description="Cuando la informacion inicial este cargada, envia un entrenamiento para preparar el asistente."
        >
          <TrainingJobForm />
        </LabsSection>
      </section>
    </AppShell>
  );
}
