"use client";

import { useState } from "react";
import { AssistantSettingsForm } from "@/components/labs/assistant-settings-form";
import { OpenAiSettingsForm } from "@/components/labs/openai-settings-form";
import { LabsSegmentedControl } from "@/components/labs/labs-overlays";
import { LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import type { AiWorkspacePlan } from "@prisma/client";

type Tab = "ASSISTANT" | "MODEL" | "ESCALATION" | "PLAN";

type SettingsWorkbenchProps = {
  assistantDisplayName: string;
  tone: string;
  timezone: string;
  hoursStart: string;
  hoursEnd: string;
  humanEscalationEnabled: boolean;
  escalationDestination: string;
  escalationContact?: string | null;
  premiumToneEnabled: boolean;
  openAiEnabled: boolean;
  openAiModel?: string | null;
  hasApiKey: boolean;
  temperature: number;
  systemPrompt?: string | null;
  plan: AiWorkspacePlan;
  limits: {
    monthlyConversationLimit: number;
    maxKnowledgeItems: number;
    maxFiles: number;
    maxUrls: number;
    maxChannels: number;
    canUseInstagram: boolean;
    canUsePremiumTone: boolean;
  };
};

export function SettingsWorkbench(props: SettingsWorkbenchProps) {
  const [tab, setTab] = useState<Tab>("ASSISTANT");

  return (
    <div className="space-y-4">
      <LabsSection>
        <LabsSegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "ASSISTANT", label: "Asistente" },
            { value: "MODEL", label: "Modelo IA" },
            { value: "ESCALATION", label: "Escalamiento" },
            { value: "PLAN", label: "Plan" },
          ]}
        />
      </LabsSection>

      {tab === "ASSISTANT" ? (
        <LabsSection title="Personalidad y horario" description="Define como responde el asistente y en que franja opera.">
          <AssistantSettingsForm
            assistantDisplayName={props.assistantDisplayName}
            tone={props.tone}
            timezone={props.timezone}
            hoursStart={props.hoursStart}
            hoursEnd={props.hoursEnd}
            humanEscalationEnabled={props.humanEscalationEnabled}
            escalationDestination={props.escalationDestination}
            escalationContact={props.escalationContact}
            premiumToneEnabled={props.premiumToneEnabled}
          />
        </LabsSection>
      ) : null}

      {tab === "MODEL" ? (
        <LabsSection title="Conexion del modelo" description="Configura OpenAI y el prompt base del agente.">
          <OpenAiSettingsForm
            enabled={props.openAiEnabled}
            model={props.openAiModel}
            hasApiKey={props.hasApiKey}
            temperature={props.temperature}
            systemPrompt={props.systemPrompt}
            plan={props.plan}
          />
        </LabsSection>
      ) : null}

      {tab === "ESCALATION" ? (
        <LabsSection title="Cobertura humana">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="labs-subpanel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Estado</p>
              <div className="mt-3">
                <LabsStatusPill label={props.humanEscalationEnabled ? "Habilitado" : "Inactivo"} tone={props.humanEscalationEnabled ? "success" : "warning"} />
              </div>
            </div>
            <div className="labs-subpanel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Destino</p>
              <p className="mt-3 font-semibold text-[var(--foreground)]">{props.escalationDestination}</p>
            </div>
            <div className="labs-subpanel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Contacto</p>
              <p className="mt-3 font-semibold text-[var(--foreground)]">{props.escalationContact ?? "No configurado"}</p>
            </div>
          </div>
        </LabsSection>
      ) : null}

      {tab === "PLAN" ? (
        <LabsSection title="Capacidad contratada" description={getLabsPlanLabel(props.plan)}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="labs-subpanel p-4">
              <p className="text-xs text-[var(--muted)]">Conversaciones</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{props.limits.monthlyConversationLimit}</p>
            </div>
            <div className="labs-subpanel p-4">
              <p className="text-xs text-[var(--muted)]">Conocimiento</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{props.limits.maxKnowledgeItems}</p>
            </div>
            <div className="labs-subpanel p-4">
              <p className="text-xs text-[var(--muted)]">Archivos / URLs</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{props.limits.maxFiles}/{props.limits.maxUrls}</p>
            </div>
            <div className="labs-subpanel p-4">
              <p className="text-xs text-[var(--muted)]">Canales</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{props.limits.maxChannels}</p>
            </div>
            <div className="labs-subpanel p-4">
              <p className="text-xs text-[var(--muted)]">Premium</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                Instagram {props.limits.canUseInstagram ? "si" : "no"} · Tono {props.limits.canUsePremiumTone ? "si" : "no"}
              </p>
            </div>
          </div>
        </LabsSection>
      ) : null}
    </div>
  );
}
