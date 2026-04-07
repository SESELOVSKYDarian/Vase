import Link from "next/link";
import { forbidden } from "next/navigation";
import {
  Activity,
  Bot,
  BrainCircuit,
  Cable,
  LayoutDashboard,
  MessageSquarePlus,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { AssistantSettingsForm } from "@/components/labs/assistant-settings-form";
import { KnowledgeFileForm } from "@/components/labs/knowledge-file-form";
import { FaqForm } from "@/components/labs/faq-form";
import { KnowledgeUrlForm } from "@/components/labs/knowledge-url-form";
import { ChannelConnectionForm } from "@/components/labs/channel-connection-form";
import { TrainingJobForm } from "@/components/labs/training-job-form";
import { ClientSupportTicketForm } from "@/components/support/client-support-ticket-form";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import {
  formatWaitingTime,
  getSupportPriorityLabel,
  getSupportPriorityTone,
  getSupportStatusLabel,
  getSupportTicketTone,
} from "@/lib/support/tickets";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import { getLabsOwnerDashboard } from "@/server/queries/labs";
import { getTenantSupportOverview } from "@/server/queries/support";

function trainingTone(status: string) {
  switch (status) {
    case "READY":
      return "success";
    case "FAILED":
      return "danger";
    case "PROCESSING":
    case "QUEUED":
      return "warning";
    default:
      return "neutral";
  }
}

function channelTone(status: string) {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "ERROR":
      return "danger";
    case "PENDING":
      return "warning";
    default:
      return "neutral";
  }
}

function conversationTone(status: string) {
  switch (status) {
    case "ESCALATED":
      return "warning";
    case "CLOSED":
      return "neutral";
    default:
      return "info";
  }
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

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

export default async function LabsOwnerPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, supportOverview] = await Promise.all([
    getLabsOwnerDashboard(membership.tenantId),
    getTenantSupportOverview(membership.tenantId),
  ]);

  if (!dashboard) {
    forbidden();
  }

  const labsEnabled =
    membership.tenant.onboardingProduct === "LABS" ||
    membership.tenant.onboardingProduct === "BOTH";
  type TenantSupportTicket = (typeof supportOverview.tickets)[number];
  const hours = readBusinessHours(dashboard.workspace.businessHours);
  const setupCompleted =
    dashboard.setupSteps.hasKnowledge &&
    dashboard.setupSteps.hasChannel &&
    dashboard.setupSteps.hasEscalation;
  const navItems = [
    { href: "#dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "#automation", label: "Automation", icon: Workflow },
    { href: "#chatbots", label: "Chatbots", icon: Bot },
    { href: "#integrations", label: "Integrations", icon: Cable },
    { href: "#ai-tools", label: "AI Tools", icon: BrainCircuit },
    { href: "#settings", label: "Settings", icon: Settings2 },
    { href: "#activity", label: "Activity", icon: Activity },
  ] as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8faf8] text-[#191c1b]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-[#e6e9e7] bg-[#f8faf8] px-5 py-6 shadow-[0px_24px_48px_rgba(25,28,27,0.06)] lg:flex">
        <div className="mb-10 flex items-center gap-3 px-3">
          <div className="grid h-11 w-11 place-items-center rounded-[1rem] bg-[#006d43] text-white">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-newsreader)] text-xl italic text-[#18c37e]">Vase Labs</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#191c1b]/60">The Organic Atrium</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={[
                  "mx-2 flex items-center gap-3 rounded-full px-4 py-3 text-[#191c1b] transition-all duration-300",
                  index === 0
                    ? "bg-gradient-to-r from-[#006d43] to-[#18c37e] text-white shadow-[0px_18px_36px_rgba(0,109,67,0.18)]"
                    : "hover:bg-[#f2f4f2] hover:translate-x-1",
                ].join(" ")}
              >
                <Icon className="size-4" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#e6e9e7] px-1 pt-6">
          <div className="flex items-center gap-3 rounded-[1.2rem] bg-[#f2f4f2] p-4">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] ring-2 ring-[#18c37e]/10">
              <span className="text-xs font-bold">{membership.tenant.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#191c1b]">{membership.tenant.name}</p>
              <p className="truncate text-[11px] text-[#6c7b70]">{getLabsPlanLabel(dashboard.workspace.plan)}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen px-6 py-8 lg:ml-72 lg:px-10 lg:py-10">
        <div className="mx-auto space-y-8 max-w-[96rem]">
          <header id="dashboard" className="max-w-5xl pt-4">
            <h2 className="text-5xl leading-tight tracking-[-0.06em] text-[#191c1b]">
              Bienvenido a <span className="font-[family-name:var(--font-newsreader)] italic font-normal text-[#006d43]">Vase Labs</span>
            </h2>
            <p className="mt-4 max-w-3xl text-xl font-light leading-relaxed text-[#3c4a40]">
              Su centro neurálgico de IA y automatización. Optimice cada interacción y transforme sus procesos digitales en experiencias orgánicas y eficientes.
            </p>
          </header>
      {!labsEnabled ? (
        <PanelCard
          eyebrow="Modulo no activo"
          title="VaseLabs no esta habilitado en este tenant"
          description="Este tenant fue creado sin Labs. Puedes activarlo desde onboarding comercial o creando una cuenta con Labs."
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <a
              href="#chatbots"
              className="group flex items-center justify-between rounded-[1.5rem] border border-[#bbcabe]/10 bg-white p-6 text-left shadow-[0px_4px_12px_rgba(25,28,27,0.03)] transition-all duration-300 hover:shadow-[0px_12px_24px_rgba(25,28,27,0.08)]"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">Builder</span>
                <h3 className="font-[family-name:var(--font-newsreader)] text-xl italic">Crear chatbot</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] transition-colors group-hover:bg-[#18c37e] group-hover:text-white">
                <MessageSquarePlus className="size-5" />
              </div>
            </a>
            <a
              href="#automation"
              className="group flex items-center justify-between rounded-[1.5rem] border border-[#bbcabe]/10 bg-white p-6 text-left shadow-[0px_4px_12px_rgba(25,28,27,0.03)] transition-all duration-300 hover:shadow-[0px_12px_24px_rgba(25,28,27,0.08)]"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">Workflow</span>
                <h3 className="font-[family-name:var(--font-newsreader)] text-xl italic">Nueva automatización</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] transition-colors group-hover:bg-[#18c37e] group-hover:text-white">
                <Workflow className="size-5" />
              </div>
            </a>
            <a
              href="#settings"
              className="group flex items-center justify-between rounded-[1.5rem] border border-[#bbcabe]/10 bg-white p-6 text-left shadow-[0px_4px_12px_rgba(25,28,27,0.03)] transition-all duration-300 hover:shadow-[0px_12px_24px_rgba(25,28,27,0.08)]"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">Intelligence</span>
                <h3 className="font-[family-name:var(--font-newsreader)] text-xl italic">Configurar IA</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] transition-colors group-hover:bg-[#18c37e] group-hover:text-white">
                <BrainCircuit className="size-5" />
              </div>
            </a>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <PanelCard title="Leads operativos" description="Items activos de conocimiento.">
              <p className="text-4xl font-[family-name:var(--font-newsreader)] tracking-tight text-[var(--foreground)]">
                {dashboard.summary.knowledgeItems}
              </p>
            </PanelCard>
            <PanelCard title="Conversiones" description="Canales conectados o pendientes.">
              <p className="text-4xl font-[family-name:var(--font-newsreader)] tracking-tight text-[var(--foreground)]">
                {dashboard.summary.connectedChannels}
              </p>
            </PanelCard>
            <PanelCard title="Bots activos" description="Conversaciones abiertas recientes.">
              <p className="text-4xl font-[family-name:var(--font-newsreader)] tracking-tight text-[var(--foreground)]">
                {dashboard.summary.openConversations}
              </p>
            </PanelCard>
            <PanelCard title="Ahorro de tiempo" description="Casos derivados a humano.">
              <p className="text-4xl font-[family-name:var(--font-newsreader)] tracking-tight text-[var(--foreground)]">
                {dashboard.summary.escalatedConversations}
              </p>
            </PanelCard>
          </section>
          {!setupCompleted ? (
            <PanelCard
              eyebrow="Onboarding guiado"
              title="Tu asistente todavia necesita configuracion inicial"
              description="Completa conocimiento, canales y escalamiento para pasar de setup a operacion activa."
              actions={
                <Link href="/app/owner/labs/setup" className="text-sm font-semibold text-[var(--accent)]">
                  Abrir setup guiado
                </Link>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Base de conocimiento</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {dashboard.setupSteps.hasKnowledge ? "Lista" : "Pendiente"}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Canales</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {dashboard.setupSteps.hasChannel ? "Listos" : "Pendiente"}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Escalamiento humano</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {dashboard.setupSteps.hasEscalation ? "Configurado" : "Pendiente"}
                  </p>
                </div>
              </div>
            </PanelCard>
          ) : null}

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <PanelCard title="Resumen" description="Items activos de conocimiento.">
              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {dashboard.summary.knowledgeItems}
              </p>
            </PanelCard>
            <PanelCard title="Canales" description="Canales conectados o pendientes.">
              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {dashboard.summary.connectedChannels}
              </p>
            </PanelCard>
            <PanelCard title="Conversaciones" description="Conversaciones abiertas recientes.">
              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {dashboard.summary.openConversations}
              </p>
            </PanelCard>
            <PanelCard title="Escaladas" description="Casos derivados a humano.">
              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {dashboard.summary.escalatedConversations}
              </p>
            </PanelCard>
          </section>

          <section id="settings" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <PanelCard
              eyebrow="Configuracion del asistente"
              title="Personalidad, horarios y escalamiento"
              description="Define tono, disponibilidad, reglas de derivacion y la experiencia base del asistente."
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
            </PanelCard>

            <PanelCard
              eyebrow="Plan y limites"
              title="Capacidad actual de VaseLabs"
              description="Las funciones premium amplian conocimiento, canales, conversaciones y configuracion avanzada."
            >
              <div className="grid gap-3">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">{getLabsPlanLabel(dashboard.workspace.plan)}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Limite mensual de conversaciones: {dashboard.limits.monthlyConversationLimit}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Items de conocimiento: {dashboard.limits.maxKnowledgeItems}
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Archivos: {dashboard.limits.maxFiles}. URLs: {dashboard.limits.maxUrls}
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Canales: {dashboard.limits.maxChannels}. Instagram:{" "}
                  {dashboard.limits.canUseInstagram ? "habilitado" : "premium"}
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Tono premium: {dashboard.limits.canUsePremiumTone ? "si" : "no"}
                </div>
              </div>
            </PanelCard>
          </section>

          <section id="chatbots" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelCard
              eyebrow="Base de conocimiento"
              title="FAQs y contenido estructurado"
              description="Carga respuestas frecuentes y material que ayude al asistente a responder con precision."
            >
              <FaqForm />
              <div className="mt-6 grid gap-3">
                {dashboard.faqs.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Todavia no hay FAQs cargadas.
                  </div>
                ) : (
                  dashboard.faqs.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{item.faqQuestion}</p>
                        <StatusBadge tone={trainingTone(item.status)} label={item.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.faqAnswer}</p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Archivos"
              title="Documentos sobre la empresa"
              description="Sube PDFs o piezas visuales validadas para incorporarlas al entrenamiento."
            >
              <KnowledgeFileForm />
              <div className="mt-6 grid gap-3">
                {dashboard.files.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Aun no hay archivos cargados.
                  </div>
                ) : (
                  dashboard.files.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{item.fileName}</p>
                        <StatusBadge tone={trainingTone(item.status)} label={item.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {item.mimeType} {item.fileSizeBytes ? `• ${item.fileSizeBytes} bytes` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          </section>

          <section id="integrations" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelCard
              eyebrow="URLs"
              title="Scraping controlado"
              description="Registra URLs del sitio y limita rutas permitidas para entrenamiento de contenido publico permitido."
            >
              <KnowledgeUrlForm />
              <div className="mt-6 grid gap-3">
                {dashboard.urls.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Aun no hay URLs registradas.
                  </div>
                ) : (
                  dashboard.urls.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                        <StatusBadge tone={trainingTone(item.status)} label={item.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.sourceUrl}</p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Canales"
              title="WhatsApp, Instagram y webchat"
              description="Conecta canales con estados visibles y limites por plan."
            >
              <ChannelConnectionForm canUseInstagram={dashboard.limits.canUseInstagram} />
              <div className="mt-6 grid gap-3">
                {dashboard.channels.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Todavia no hay canales registrados.
                  </div>
                ) : (
                  dashboard.channels.map((channel) => (
                    <div key={channel.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          {channel.channelType} · {channel.accountLabel}
                        </p>
                        <StatusBadge tone={channelTone(channel.status)} label={channel.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {channel.externalHandle ?? "Sin handle registrado"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          </section>

          <section id="automation" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <PanelCard
              eyebrow="Entrenamiento"
              title="Estado de entrenamiento"
              description="Cada cambio importante puede entrar a una cola de entrenamiento simple para preparar el asistente."
            >
              <TrainingJobForm />
              <div className="mt-6 grid gap-3">
                {dashboard.trainingJobs.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Aun no hay jobs de entrenamiento.
                  </div>
                ) : (
                  dashboard.trainingJobs.map((job) => (
                    <div key={job.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          {job.summary ?? "Entrenamiento general"}
                        </p>
                        <StatusBadge tone={trainingTone(job.status)} label={job.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        Fuentes: {job.sourceCount}. En cola: {formatDate(job.queuedAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Historial de conversaciones"
              title="Actividad reciente del asistente"
              description="Control simple sobre conversaciones abiertas, escaladas y cerradas."
            >
              <div className="grid gap-3">
                {dashboard.conversations.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Aun no hay conversaciones registradas.
                  </div>
                ) : (
                  dashboard.conversations.map((conversation) => (
                    <div key={conversation.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          {conversation.customerName ?? "Cliente sin nombre"} · {conversation.channelType}
                        </p>
                        <StatusBadge
                          tone={conversationTone(conversation.status)}
                          label={conversation.status}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {conversation.summary ?? "Sin resumen disponible"}.
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted-soft)]">
                        Ultimo mensaje: {formatDate(conversation.lastMessageAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          </section>

          <section id="ai-tools" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelCard
              eyebrow="Metricas"
              title="Indicadores del asistente"
              description="Lectura simple para negocio sobre adopcion, derivaciones y capacidad actual."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Conversaciones del plan</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {dashboard.summary.monthlyConversationLimit}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Escaladas a humano</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {dashboard.summary.escalatedConversations}
                  </p>
                </div>
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Escalamiento a humano"
              title="Cobertura operativa"
              description="La IA puede derivar a una persona cuando el caso excede reglas, horario o confianza."
            >
              <div className="grid gap-3">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Habilitado: {dashboard.workspace.humanEscalationEnabled ? "si" : "no"}
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Destino: {dashboard.workspace.escalationDestination}
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Contacto: {dashboard.workspace.escalationContact ?? "No configurado"}
                </div>
              </div>
            </PanelCard>
          </section>

          <section id="activity" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <PanelCard
              eyebrow="Soporte humano"
              title="Derivacion de IA a una persona real"
              description="Si la IA detecta que hace falta intervencion humana, puedes crear o revisar tickets con tiempos de espera visibles."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Tickets totales</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {supportOverview.summary.total}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Activos</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {supportOverview.summary.active}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">En cola</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {supportOverview.summary.queued}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <ClientSupportTicketForm
                  conversationOptions={dashboard.conversations.map((conversation) => ({
                    id: conversation.id,
                    label: `${conversation.customerName ?? "Cliente"} · ${conversation.channelType}`,
                  }))}
                />
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Cola y trazabilidad"
              title="Estado visible de cada ticket"
              description="El negocio puede seguir prioridad, asignacion, tiempo de espera y cambios relevantes sin entrar a detalles tecnicos."
            >
              <div className="grid gap-3">
                {supportOverview.tickets.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Todavia no hay tickets humanos abiertos o historicos para este tenant.
                  </div>
                ) : (
                  supportOverview.tickets.map((ticket: TenantSupportTicket) => (
                    <div key={ticket.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{ticket.subject}</p>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            tone={getSupportPriorityTone(ticket.priority)}
                            label={getSupportPriorityLabel(ticket.priority)}
                          />
                          <StatusBadge
                            tone={getSupportTicketTone(ticket.status)}
                            label={getSupportStatusLabel(ticket.status)}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        Espera visible: {formatWaitingTime(ticket.waitingSince)}. Asignado a:{" "}
                        {ticket.assignedToUser?.name ?? "cola general"}.
                      </p>
                      <div className="mt-3 grid gap-2">
                        {ticket.events.map((event: TenantSupportTicket["events"][number]) => (
                          <div key={event.id} className="rounded-2xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-3 text-sm leading-6 text-[var(--muted)]">
                            <span className="font-medium text-[var(--foreground)]">
                              {event.actorUser?.name ?? "Sistema"}:
                            </span>{" "}
                            {event.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          </section>
        </>
      )}
        </div>
      </main>
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-1/2 w-1/3 rounded-full bg-gradient-to-bl from-[#006d43]/5 to-transparent blur-[120px] opacity-50" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-1/3 w-1/4 rounded-full bg-gradient-to-tr from-[#36684c]/5 to-transparent blur-[100px] opacity-50" />
    </div>
  );
}
