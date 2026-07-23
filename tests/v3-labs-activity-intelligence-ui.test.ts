import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ActivityWorkspace, {
  type ActivityConversation,
} from "../apps/vase-labs/app/app/owner/labs/activity/activity-workspace";
import {
  buildActivityConversationQuery,
  sanitizeActivitySearchParams,
} from "../apps/vase-labs/app/app/owner/labs/activity/page";

const insight = {
  summary: "Busca equipar un living nuevo durante este mes.",
  currentNeed: "Definir un sofá de tres cuerpos.",
  productInterests: ["Sofá Nido", "Mesa Baja Lenga"],
  preferences: ["Tonos arena", "Entrega por la tarde"],
  objections: ["Consulta por el costo de envío"],
  budgetSignals: ["Acepta un rango de $900.000"],
  urgencySignals: ["Quiere resolverlo esta semana"],
  recommendations: ["Confirmar medidas del ascensor"],
  nextBestAction: "Enviar variantes disponibles y confirmar dirección.",
  scoreReasons: ["Producto definido", "Compartió presupuesto"],
  identitySignals: ["Se presentó como Martina"],
  leadScore: 87,
  intentLabel: "HOT_LEAD" as const,
  analyzedAt: new Date("2026-07-23T16:00:00.000Z"),
};

function conversation(
  overrides: Partial<ActivityConversation> = {},
): ActivityConversation {
  return {
    id: "conversation_1",
    channel: "WHATSAPP",
    status: "OPEN",
    customerName: "Martina López",
    customerContact: "+54 11 5555 0101",
    summary: "Resumen legado",
    intentLabel: "RESEARCHING",
    intentScore: 54,
    escalatedToHuman: false,
    lastMessageAt: new Date("2026-07-23T16:05:00.000Z"),
    metadata: {},
    messages: [{
      id: "message_1",
      role: "assistant",
      direction: "OUTBOUND",
      content: "Te paso las opciones disponibles.",
      createdAt: new Date("2026-07-23T16:05:00.000Z"),
    }],
    insight,
    analysisJob: {
      status: "COMPLETED",
      updatedAt: new Date("2026-07-23T16:00:00.000Z"),
    },
    ...overrides,
  };
}

describe("Labs Activity commercial intelligence", () => {
  it("sanitizes promised search params to known server-owned filters and sorts", () => {
    expect(sanitizeActivitySearchParams({
      intent: "HOT_LEAD",
      sort: "score",
    })).toEqual({ intent: "HOT_LEAD", sort: "score" });
    expect(sanitizeActivitySearchParams({
      intent: ["LOW_INTENT", "HOT_LEAD"],
      sort: ["latest", "score"],
    })).toEqual({ intent: "LOW_INTENT", sort: "latest" });
    expect(sanitizeActivitySearchParams({
      intent: "DROP TABLE Conversation",
      sort: "provider-error",
    })).toEqual({ intent: "all", sort: "latest" });
  });

  it("builds an assistant-scoped Prisma query with insight, job, and latest messages", () => {
    const query = buildActivityConversationQuery("assistant_resolved", {
      intent: "HUMAN_REQUESTED",
      sort: "score",
    });

    expect(query.where).toEqual({
      assistantId: "assistant_resolved",
      OR: [
        { insight: { is: { intentLabel: "HUMAN_REQUESTED" } } },
        {
          insight: { is: null },
          intentLabel: "HUMAN_REQUESTED",
        },
      ],
    });
    expect(query.orderBy).toEqual([
      { insight: { leadScore: "desc" } },
      { intentScore: "desc" },
      { lastMessageAt: "desc" },
    ]);
    expect(query.include).toEqual({
      insight: true,
      analysisJob: {
        select: {
          status: true,
          updatedAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          role: true,
          direction: true,
          content: true,
          createdAt: true,
        },
      },
    });
  });

  it("renders all readable labels, the score anchor, and expandable commercial detail", () => {
    const html = renderToStaticMarkup(React.createElement(ActivityWorkspace, {
      conversations: [conversation()],
      activeIntent: "all",
      activeSort: "latest",
    }));

    for (const label of [
      "Todas",
      "Hot lead",
      "Solicitó humano",
      "Investigando",
      "Baja intención",
      "Sin clasificar",
    ]) {
      expect(html).toContain(label);
    }
    for (const copy of [
      "87",
      insight.summary,
      insight.currentNeed,
      "Producto definido",
      insight.nextBestAction,
      "Tonos arena",
      "Consulta por el costo de envío",
      "Sofá Nido",
      "Confirmar medidas del ascensor",
      "Acepta un rango de $900.000",
      "Quiere resolverlo esta semana",
      "Se presentó como Martina",
    ]) {
      expect(html).toContain(copy);
    }
    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="87"');
    expect(html).toContain("<details");
    expect(html).toContain("IA respondió");
  });

  it("keeps the last valid insight visible while pending or failed", () => {
    const html = renderToStaticMarkup(React.createElement(ActivityWorkspace, {
      conversations: [
        conversation({
          id: "pending",
          analysisJob: {
            status: "PROCESSING",
            updatedAt: new Date("2026-07-23T16:06:00.000Z"),
          },
        }),
        conversation({
          id: "failed",
          analysisJob: {
            status: "FAILED",
            updatedAt: new Date("2026-07-23T16:07:00.000Z"),
          },
        }),
      ],
      activeIntent: "all",
      activeSort: "latest",
    }));

    expect(html).toContain("Analizando conversación");
    expect(html).toContain("No pudimos actualizar el análisis");
    expect(html.match(new RegExp(insight.summary, "g"))).toHaveLength(2);
    expect(html).not.toContain("lastError");
    expect(html).not.toContain("provider");
  });

  it("falls back to the legacy Conversation summary, score, and intent", () => {
    const html = renderToStaticMarkup(React.createElement(ActivityWorkspace, {
      conversations: [conversation({
        insight: null,
        analysisJob: null,
        summary: "Consultó por horarios y medios de pago.",
        intentLabel: "LOW_INTENT",
        intentScore: 31,
      })],
      activeIntent: "all",
      activeSort: "latest",
    }));

    expect(html).toContain("Consultó por horarios y medios de pago.");
    expect(html).toContain('aria-valuenow="31"');
    expect(html).toContain("Baja intención");
    expect(html).toContain("Sin análisis comercial detallado");
  });

  it("uses promised searchParams, server links, assistant scoping, and standalone styles", () => {
    const page = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/activity/page.tsx"),
      "utf8",
    );
    const workspace = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/activity/activity-workspace.tsx"),
      "utf8",
    );
    const styles = fs.readFileSync(
      path.resolve("apps/vase-labs/app/globals.css"),
      "utf8",
    );

    expect(page).toContain("searchParams: Promise<ActivitySearchParams>");
    expect(page).toContain("await searchParams");
    expect(page).toContain("where: { assistantId");
    expect(page).toContain("<ActivityWorkspace");
    expect(workspace).toContain('from "next/link"');
    expect(workspace).not.toContain("useSearchParams");
    expect(workspace).not.toContain("fetch(");
    expect(styles).toContain(".labs-activity-workspace");
    expect(styles).toContain(".labs-lead-score");
    expect(styles).toContain(".labs-activity-detail");
    expect(styles).toContain("@media (max-width: 760px)");
  });

  it("provides accessible qualification settings without a fake recalculation action", () => {
    const settingsPage = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/settings/page.tsx"),
      "utf8",
    );
    const settingsCardPath = path.resolve(
      "apps/vase-labs/app/app/owner/labs/settings/conversation-insight-settings-card.tsx",
    );

    expect(fs.existsSync(settingsCardPath)).toBe(true);
    if (!fs.existsSync(settingsCardPath)) return;
    const settingsCard = fs.readFileSync(settingsCardPath, "utf8");

    expect(settingsPage).toContain("<ConversationInsightSettingsCard");
    expect(settingsCard).toContain('"use client"');
    expect(settingsCard).toContain('fetch("/api/labs/settings/conversation-insights"');
    expect(settingsCard).toContain('method: "PATCH"');
    expect(settingsCard).toContain("router.refresh()");
    expect(settingsCard).toContain('aria-live="polite"');
    expect(settingsCard).toContain("Umbral de hot lead");
    expect(settingsCard).toContain("Intención de compra");
    expect(settingsCard).toContain("Producto definido");
    expect(settingsCard).toContain("Aceptación de presupuesto");
    expect(settingsCard).toContain("Urgencia");
    expect(settingsCard).toContain("Datos de contacto o entrega");
    expect(settingsCard).toContain("Profundidad de interacción");
    expect(settingsCard).toContain("Objeciones o señales negativas");
    expect(settingsCard).toContain("próximos análisis");
    expect(settingsCard).not.toContain("recalcular");
  });
});
