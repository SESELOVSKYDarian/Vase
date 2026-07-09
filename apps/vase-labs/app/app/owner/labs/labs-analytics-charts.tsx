"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LabsConversationAnalytics = {
  total: number;
  classified: number;
  hotLeads: number;
  escalated: number;
  byIntent: Array<{ label: string; count: number }>;
  byChannel: Array<{ channel: string; count: number }>;
  trend: Array<{ date: string; conversations: number; escalated: number }>;
};

const intentLabels: Record<string, string> = {
  HOT_LEAD: "Hot lead",
  RESEARCHING: "Investigando",
  LOW_INTENT: "Baja intencion",
  HUMAN_REQUESTED: "Pidio humano",
  UNCLASSIFIED: "Sin etiqueta",
};

const chartColors = ["#0f8f61", "#487aee", "#7d8594", "#e28b45", "#9aa3ad"];

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function LabsIntentDistributionChart({ analytics }: { analytics: LabsConversationAnalytics }) {
  const data = analytics.byIntent.map((item) => ({
    ...item,
    label: intentLabels[item.label] ?? item.label,
  }));

  return (
    <ChartShell title="Intencion por etiqueta">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function LabsConversationTrendChart({ analytics }: { analytics: LabsConversationAnalytics }) {
  return (
    <ChartShell title="Conversaciones y derivaciones">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={analytics.trend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="labsConversations" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#0f8f61" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#0f8f61" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="labsEscalated" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#e28b45" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#e28b45" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="conversations" stroke="#0f8f61" fill="url(#labsConversations)" strokeWidth={2} />
          <Area type="monotone" dataKey="escalated" stroke="#e28b45" fill="url(#labsEscalated)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function LabsChannelBarChart({ analytics }: { analytics: LabsConversationAnalytics }) {
  return (
    <ChartShell title="Canales por volumen">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={analytics.byChannel} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="channel" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#487aee" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function buildLabsConversationAnalytics(
  conversations: Array<{
    channel: string | null;
    intentLabel: string | null;
    escalatedToHuman: boolean;
    lastMessageAt: Date | null;
  }>,
): LabsConversationAnalytics {
  const INTENT_LABELS = ["HOT_LEAD", "RESEARCHING", "LOW_INTENT", "HUMAN_REQUESTED", "UNCLASSIFIED"] as const;

  const total = conversations.length;
  const classified = conversations.filter((c) => Boolean(c.intentLabel)).length;
  const hotLeads = conversations.filter((c) => c.intentLabel === "HOT_LEAD").length;
  const escalated = conversations.filter((c) => c.escalatedToHuman).length;

  const intentCounts = new Map<string, number>(INTENT_LABELS.map((label) => [label, 0]));
  const channelCounts = new Map<string, number>();
  const trendCounts = new Map<
    string,
    { date: string; conversations: number; escalated: number; sortKey: number }
  >();

  const formatDay = (value: Date) =>
    new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(value);

  for (const c of conversations) {
    const label = c.intentLabel ?? "UNCLASSIFIED";
    intentCounts.set(label, (intentCounts.get(label) ?? 0) + 1);

    const ch = c.channel ?? "LABS";
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);

    if (c.lastMessageAt) {
      const dayKey = c.lastMessageAt.toISOString().slice(0, 10);
      const current = trendCounts.get(dayKey) ?? {
        date: formatDay(c.lastMessageAt),
        conversations: 0,
        escalated: 0,
        sortKey: c.lastMessageAt.getTime(),
      };
      current.conversations += 1;
      current.escalated += c.escalatedToHuman ? 1 : 0;
      trendCounts.set(dayKey, current);
    }
  }

  return {
    total,
    classified,
    hotLeads,
    escalated,
    byIntent: Array.from(intentCounts.entries()).map(([label, count]) => ({ label, count })),
    byChannel: Array.from(channelCounts.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    trend: Array.from(trendCounts.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-14)
      .map(({ date, conversations, escalated }) => ({ date, conversations, escalated })),
  };
}
