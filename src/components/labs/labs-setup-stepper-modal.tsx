"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  Cable,
  Check,
  ChevronLeft,
  Clock3,
  Play,
  X,
} from "lucide-react";
import { AssistantSettingsForm } from "@/components/labs/assistant-settings-form";
import { ChannelConnectionForm } from "@/components/labs/channel-connection-form";
import { FaqForm } from "@/components/labs/faq-form";
import { KnowledgeFileForm } from "@/components/labs/knowledge-file-form";
import { KnowledgeUrlForm } from "@/components/labs/knowledge-url-form";
import { TrainingJobForm } from "@/components/labs/training-job-form";
import { LabsStatusPill } from "@/components/labs/labs-ui";

type SetupStep = {
  id: "assistant" | "knowledge" | "channel" | "training";
  title: string;
  description: string;
  done: boolean;
  icon: typeof Bot;
  content: ReactNode;
};

type ConnectedChannel = {
  id: string;
  channelType: string;
  accountLabel: string;
  status: string;
};

export function LabsSetupStepperModal({
  tenantId,
  assistantDisplayName,
  tone,
  timezone,
  hoursStart,
  hoursEnd,
  humanEscalationEnabled,
  escalationDestination,
  escalationContact,
  premiumToneEnabled,
  hasKnowledge,
  hasChannel,
  hasTraining,
  canUseInstagram,
  webhookPreviewUrl,
  webhookVerifyToken,
  connectedChannels,
}: {
  tenantId: string;
  assistantDisplayName: string | null;
  tone: string;
  timezone: string;
  hoursStart: string;
  hoursEnd: string;
  humanEscalationEnabled: boolean;
  escalationDestination: string;
  escalationContact: string | null;
  premiumToneEnabled: boolean;
  hasKnowledge: boolean;
  hasChannel: boolean;
  hasTraining: boolean;
  canUseInstagram: boolean;
  webhookPreviewUrl: string;
  webhookVerifyToken: string;
  connectedChannels: ConnectedChannel[];
}) {
  const storageKey = `vase-labs-setup-skipped:${tenantId}`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const steps = useMemo<SetupStep[]>(
    () => [
      {
        id: "assistant",
        title: "Identidad del asistente",
        description: "Nombre, tono, horarios y regla de derivacion humana.",
        done: Boolean(assistantDisplayName) && humanEscalationEnabled,
        icon: Bot,
        content: (
          <AssistantSettingsForm
            assistantDisplayName={assistantDisplayName ?? ""}
            tone={tone}
            timezone={timezone}
            hoursStart={hoursStart}
            hoursEnd={hoursEnd}
            humanEscalationEnabled={humanEscalationEnabled}
            escalationDestination={escalationDestination}
            escalationContact={escalationContact}
            premiumToneEnabled={premiumToneEnabled}
          />
        ),
      },
      {
        id: "knowledge",
        title: "Cargar conocimiento",
        description: "Agrega una FAQ, un archivo o una URL para darle contexto real a la IA.",
        done: hasKnowledge,
        icon: Brain,
        content: (
          <div className="grid gap-4">
            <FaqForm />
            <KnowledgeFileForm />
            <KnowledgeUrlForm />
          </div>
        ),
      },
      {
        id: "channel",
        title: "Conectar un canal",
        description: "Activa WhatsApp, Instagram o webchat. Tambien puedes dejarlo para despues.",
        done: hasChannel,
        icon: Cable,
        content: (
          <div className="grid gap-4">
            {connectedChannels.length > 0 ? (
              <div className="grid gap-2 rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,var(--border-subtle))] bg-[var(--success-soft)] p-4">
                <p className="text-sm font-semibold text-[var(--success)]">Canales activos</p>
                {connectedChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-strong)] px-3 py-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {channel.channelType} · {channel.accountLabel}
                    </span>
                    <LabsStatusPill label={channel.status} tone="success" />
                  </div>
                ))}
              </div>
            ) : null}
            <ChannelConnectionForm
              canUseInstagram={canUseInstagram}
              webhookPreviewUrl={webhookPreviewUrl}
              initialWebhookVerifyToken={webhookVerifyToken}
            />
          </div>
        ),
      },
      {
        id: "training",
        title: "Lanzar entrenamiento",
        description: "Prepara la IA con la informacion cargada para que responda mejor.",
        done: hasTraining,
        icon: Play,
        content: <TrainingJobForm />,
      },
    ],
    [
      assistantDisplayName,
      canUseInstagram,
      connectedChannels,
      escalationContact,
      escalationDestination,
      hasChannel,
      hasKnowledge,
      hasTraining,
      hoursEnd,
      hoursStart,
      humanEscalationEnabled,
      premiumToneEnabled,
      timezone,
      tone,
      webhookPreviewUrl,
      webhookVerifyToken,
    ],
  );

  const pendingSteps = steps.filter((step) => !step.done);
  const activeStep = pendingSteps[activeIndex] ?? pendingSteps[0];

  useEffect(() => {
    if (pendingSteps.length === 0) return;
    if (window.sessionStorage.getItem(storageKey) === "true") return;
    const timeoutId = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pendingSteps.length, storageKey]);

  const closeForSession = () => {
    window.sessionStorage.setItem(storageKey, "true");
    setOpen(false);
  };

  const next = () => {
    if (activeIndex >= pendingSteps.length - 1) {
      closeForSession();
      return;
    }
    setActiveIndex((current) => current + 1);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
      >
        <Clock3 className="size-4" />
        Setup guiado
      </button>

      {open && activeStep ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,18,16,0.48)] px-4 py-6 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] shadow-[0_34px_110px_rgba(10,14,20,0.32)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] p-5">
              <div>
                <p className="vase-kicker">Setup rapido</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  Te falta completar esto para activar tu IA
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Completa solo lo pendiente. Puedes saltarlo ahora y volver cuando quieras desde Vase Labs.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForSession}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                aria-label="Cerrar setup"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-8rem)] overflow-y-auto lg:grid-cols-[18rem_1fr]">
              <aside className="border-b border-[var(--border-subtle)] bg-[var(--surface)] p-4 lg:border-b-0 lg:border-r">
                <div className="grid gap-2">
                  {pendingSteps.map((step, index) => {
                    const Icon = step.icon;
                    const active = index === activeIndex;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={[
                          "flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left transition",
                          active
                            ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                            : "border-transparent text-[var(--muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]",
                        ].join(" ")}
                      >
                        <span className="grid size-9 place-items-center rounded-lg bg-[var(--surface-strong)]">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">{step.title}</span>
                          <span className="block text-xs">{index + 1} de {pendingSteps.length}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="p-5">
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                      Paso pendiente
                    </p>
                    <h4 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{activeStep.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{activeStep.description}</p>
                  </div>
                  <LabsStatusPill label="Pendiente" tone="warning" />
                </div>

                {activeStep.content}

                <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/app/owner/labs"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  >
                    Abrir panel completo
                    <ArrowRight className="size-4" />
                  </Link>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={closeForSession}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    >
                      Saltar por ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                      disabled={activeIndex === 0}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ChevronLeft className="size-4" />
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
                    >
                      {activeIndex >= pendingSteps.length - 1 ? "Cerrar" : "Siguiente"}
                      {activeIndex >= pendingSteps.length - 1 ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
