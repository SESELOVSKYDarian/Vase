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
import type { LabsConversationAnalytics } from "./labs-analytics";

const intentLabels: Record<string, string> = {
  HOT_LEAD: "Quiere comprar",
  RESEARCHING: "Está mirando",
  LOW_INTENT: "Poco interés",
  HUMAN_REQUESTED: "Pidió una persona",
  UNCLASSIFIED: "Sin etiqueta",
};

const chartColors = ["#18c37e", "#2e90fa", "#98a2b3", "#f79009", "#d0d5dd"];
const chartInitialDimension = { width: 320, height: 256 };

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={title} style={{ height: 256 }}>
      {children}
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
      <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
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
      <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
        <AreaChart data={analytics.trend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="labsConversations" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#18c37e" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#18c37e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="labsEscalated" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#f79009" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#f79009" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" name="Conversaciones" dataKey="conversations" stroke="#18c37e" fill="url(#labsConversations)" strokeWidth={2} />
          <Area type="monotone" name="Pasaron a una persona" dataKey="escalated" stroke="#f79009" fill="url(#labsEscalated)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function LabsChannelBarChart({ analytics }: { analytics: LabsConversationAnalytics }) {
  return (
    <ChartShell title="Canales por volumen">
      <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
        <BarChart data={analytics.byChannel} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="channel" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#2e90fa" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}


