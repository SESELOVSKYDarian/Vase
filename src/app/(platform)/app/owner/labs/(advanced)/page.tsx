import Link from "next/link";
import { BrainCircuit, MessageSquarePlus, Workflow } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import { getLabsOwnerPageData } from "./_lib/labs-owner";
import { LabsModuleDisabledCard } from "./ui";

export default async function LabsDashboardPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();
  const setupCompleted =
    dashboard.setupSteps.hasKnowledge && dashboard.setupSteps.hasChannel && dashboard.setupSteps.hasEscalation;

  return (
    <div className="space-y-8">
      <header className="max-w-5xl pt-2">
        <h2 className="text-5xl leading-tight tracking-[-0.06em] text-[#191c1b]">
          Bienvenido a{" "}
          <span className="font-[family-name:var(--font-newsreader)] italic font-normal text-[#006d43]">Vase Labs</span>
        </h2>
        <p className="mt-4 max-w-3xl text-xl font-light leading-relaxed text-[#3c4a40]">
          Centro de IA y automatizacion para llevar conversaciones, conocimiento y operaciones en un solo lugar.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link
              href="/app/owner/labs/chatbots"
              className="group flex items-center justify-between rounded-[1.5rem] border border-[#bbcabe]/10 bg-white p-6 text-left shadow-[0px_4px_12px_rgba(25,28,27,0.03)] transition-all duration-300 hover:shadow-[0px_12px_24px_rgba(25,28,27,0.08)]"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">Constructor</span>
                <h3 className="font-[family-name:var(--font-newsreader)] text-xl italic">Crear chatbot</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] transition-colors group-hover:bg-[#18c37e] group-hover:text-white">
                <MessageSquarePlus className="size-5" />
              </div>
            </Link>
            <Link
              href="/app/owner/labs/automation"
              className="group flex items-center justify-between rounded-[1.5rem] border border-[#bbcabe]/10 bg-white p-6 text-left shadow-[0px_4px_12px_rgba(25,28,27,0.03)] transition-all duration-300 hover:shadow-[0px_12px_24px_rgba(25,28,27,0.08)]"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">Flujos</span>
                <h3 className="font-[family-name:var(--font-newsreader)] text-xl italic">Nueva automatizacion</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] transition-colors group-hover:bg-[#18c37e] group-hover:text-white">
                <Workflow className="size-5" />
              </div>
            </Link>
            <Link
              href="/app/owner/labs/settings"
              className="group flex items-center justify-between rounded-[1.5rem] border border-[#bbcabe]/10 bg-white p-6 text-left shadow-[0px_4px_12px_rgba(25,28,27,0.03)] transition-all duration-300 hover:shadow-[0px_12px_24px_rgba(25,28,27,0.08)]"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">Inteligencia</span>
                <h3 className="font-[family-name:var(--font-newsreader)] text-xl italic">Configurar IA</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] transition-colors group-hover:bg-[#18c37e] group-hover:text-white">
                <BrainCircuit className="size-5" />
              </div>
            </Link>
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

          <PanelCard
            eyebrow="Plan y capacidad"
            title="Estado actual del workspace"
            description="Resumen rapido de limites y capacidad contratada de Labs."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                <p className="font-semibold text-[var(--foreground)]">{getLabsPlanLabel(dashboard.workspace.plan)}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Limite mensual de conversaciones: {dashboard.limits.monthlyConversationLimit}
                </p>
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Canales: {dashboard.limits.maxChannels}. Items de conocimiento: {dashboard.limits.maxKnowledgeItems}.
              </div>
            </div>
          </PanelCard>
        </>
      )}
    </div>
  );
}
