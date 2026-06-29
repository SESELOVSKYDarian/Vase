"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Flame, MessageSquare, Search, Sparkles, UserRoundCheck } from "lucide-react";
import { LabsChannelBarChart, LabsConversationTrendChart, LabsFunnelChart, LabsIntentDistributionChart } from "@/components/labs/labs-analytics-charts";
import { LabsEmptyState, LabsMetricCard, LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";
import { LabsSegmentedControl } from "@/components/labs/labs-overlays";
import type { LabsConversationAnalytics } from "@/server/services/labs-analytics";
import type { LabsConversationActivityItem } from "@/server/services/labs-activity";

type FilterValue = "ALL" | "HOT_LEAD" | "RESEARCHING" | "LOW_INTENT" | "HUMAN_REQUESTED";
type EscalationFilter = "ALL" | "ESCALATED";

const labelOptions: Array<{ value: FilterValue; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "HOT_LEAD", label: "Hot lead" },
  { value: "RESEARCHING", label: "Info" },
  { value: "LOW_INTENT", label: "Baja" },
  { value: "HUMAN_REQUESTED", label: "Humano" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getChannelLabel(channelType: string) {
  switch (channelType) {
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "WEBCHAT":
      return "Webchat";
    default:
      return channelType;
  }
}

function labelTone(label: string | null): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (label) {
    case "HOT_LEAD":
      return "success";
    case "HUMAN_REQUESTED":
      return "warning";
    case "LOW_INTENT":
      return "neutral";
    default:
      return "info";
  }
}

export function ConversationActivityBoard({
  conversations,
  analytics,
}: {
  conversations: LabsConversationActivityItem[];
  analytics: LabsConversationAnalytics;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState<FilterValue>("ALL");
  const [channel, setChannel] = useState("ALL");
  const [escalation, setEscalation] = useState<EscalationFilter>("ALL");

  const channelOptions = useMemo(() => {
    const unique = Array.from(new Set(conversations.map((conversation) => conversation.channelType)));
    return ["ALL", ...unique];
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (label !== "ALL" && conversation.intentLabel !== label) return false;
      if (channel !== "ALL" && conversation.channelType !== channel) return false;
      if (escalation === "ESCALATED" && !conversation.escalatedToHuman) return false;
      if (!normalizedQuery) return true;

      return [
        conversation.customerName,
        conversation.customerContact,
        conversation.summary,
        conversation.intentReason,
        conversation.nextAction,
        conversation.channelType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [channel, conversations, escalation, label, query]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LabsMetricCard label="Conversaciones" value={analytics.total} detail="Ultimas registradas" icon={MessageSquare} tone="info" />
        <LabsMetricCard label="Hot leads" value={analytics.hotLeads} detail="Con intencion alta" icon={Flame} tone="success" />
        <LabsMetricCard label="Derivadas" value={analytics.escalated} detail="Requieren humano" icon={UserRoundCheck} tone="warning" />
        <LabsMetricCard label="Score promedio" value={`${analytics.averageIntentScore}%`} detail="Intencion comercial" icon={Sparkles} tone="neutral" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LabsIntentDistributionChart analytics={analytics} />
        <LabsConversationTrendChart analytics={analytics} />
        <LabsFunnelChart analytics={analytics} />
        <LabsChannelBarChart analytics={analytics} />
      </section>

      <LabsSection>
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Buscar</span>
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3">
              <Search className="size-4 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cliente, contacto, resumen..."
                className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-soft)]"
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Canal</span>
            <select value={channel} onChange={(event) => setChannel(event.target.value)} className="labs-input min-w-40">
              {channelOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "Todos" : getChannelLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Etiqueta</span>
            <LabsSegmentedControl value={label} onChange={setLabel} options={labelOptions} />
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Humano</span>
            <LabsSegmentedControl
              value={escalation}
              onChange={setEscalation}
              options={[
                { value: "ALL", label: "Todas" },
                { value: "ESCALATED", label: "Derivadas" },
              ]}
            />
          </div>
        </div>
      </LabsSection>

      <LabsSection title="Conversaciones analizadas" description={`${filteredConversations.length} resultados`}>
        {filteredConversations.length === 0 ? (
          <LabsEmptyState title="Sin resultados" description="Ajusta los filtros o busca otro cliente." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
            <div className="hidden grid-cols-[1.1fr_0.8fr_0.6fr_0.7fr_0.7fr_auto] gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)] xl:grid">
              <span>Cliente</span>
              <span>Resumen</span>
              <span>Etiqueta</span>
              <span>Score</span>
              <span>Ultimo mensaje</span>
              <span>Accion</span>
            </div>
            {filteredConversations.map((conversation) => (
              <article
                key={conversation.id}
                className="grid gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-4 last:border-b-0 xl:grid-cols-[1.1fr_0.8fr_0.6fr_0.7fr_0.7fr_auto]"
              >
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {conversation.customerName ?? conversation.customerContact ?? "Cliente sin nombre"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {getChannelLabel(conversation.channelType)} · {conversation.customerContact ?? "Sin contacto"}
                  </p>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                  {conversation.summary ?? "Sin resumen disponible."}
                </p>
                <div className="flex items-start">
                  <LabsStatusPill label={conversation.intentLabel ?? "Sin etiqueta"} tone={labelTone(conversation.intentLabel)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{conversation.intentScore ?? 0}%</p>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)]">
                    <div
                      className="h-1.5 rounded-full bg-[var(--accent-strong)]"
                      style={{ width: `${Math.max(0, Math.min(100, conversation.intentScore ?? 0))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{conversation.intentReason ?? "Sin motivo."}</p>
                </div>
                <div className="text-xs leading-5 text-[var(--muted)]">
                  <p>{formatDate(conversation.lastMessageAt)}</p>
                  <p>{conversation.escalatedToHuman ? "Derivada a humano" : conversation.status}</p>
                </div>
                <Link
                  href={`/app/owner/labs/inbox?conversationId=${encodeURIComponent(conversation.id)}`}
                  className="labs-button labs-button-secondary self-start"
                >
                  Ver chat
                  <ArrowRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </LabsSection>
    </div>
  );
}
