import { describe, expect, it } from "vitest";
import { buildLabsSystemNotifications, buildNotificationReadKey } from "@/server/services/labs-notifications";

describe("labs system notifications", () => {
  it("creates unread notifications for human attention, hot leads, channel issues and failed training", () => {
    const notifications = buildLabsSystemNotifications({
      tenantId: "tenant-1",
      readKeys: new Set(["labs:hot-lead:conversation-hot"]),
      conversations: [
        {
          id: "conversation-human",
          customerName: "Ana",
          customerContact: "549223111111",
          channelType: "WHATSAPP",
          summary: "Quiere hablar con una persona por disponibilidad.",
          intentLabel: "HUMAN_REQUESTED",
          escalatedToHuman: true,
          lastMessageAt: new Date("2026-06-21T12:00:00.000Z"),
        },
        {
          id: "conversation-hot",
          customerName: null,
          customerContact: "lead@empresa.com",
          channelType: "WEBCHAT",
          summary: "Pidio presupuesto para comprar esta semana.",
          intentLabel: "HOT_LEAD",
          escalatedToHuman: false,
          lastMessageAt: new Date("2026-06-21T12:05:00.000Z"),
        },
      ],
      channels: [
        {
          id: "channel-error",
          channelType: "WHATSAPP",
          accountLabel: "WhatsApp ventas",
          status: "ERROR",
          updatedAt: new Date("2026-06-21T11:00:00.000Z"),
        },
        {
          id: "channel-pending",
          channelType: "INSTAGRAM",
          accountLabel: "Instagram",
          status: "PENDING",
          updatedAt: new Date("2026-06-21T10:00:00.000Z"),
        },
      ],
      trainingJobs: [
        {
          id: "training-failed",
          status: "FAILED",
          summary: "Entrenamiento inicial",
          updatedAt: new Date("2026-06-21T09:00:00.000Z"),
        },
      ],
    });

    expect(notifications).toHaveLength(5);
    expect(notifications.map((item) => item.id)).toEqual([
      "labs:hot-lead:conversation-hot",
      "labs:human-attention:conversation-human",
      "labs:channel-error:channel-error",
      "labs:channel-pending:channel-pending",
      "labs:training-failed:training-failed",
    ]);
    expect(notifications[0]).toMatchObject({
      sourceLabel: "Vase Labs",
      category: "labs",
      notificationType: "labs_system",
      isRead: true,
      href: "/app/owner/labs/inbox?conversationId=conversation-hot",
    });
    expect(notifications[1]).toMatchObject({
      title: "Ana pidio atencion humana",
      tone: "warning",
      isRead: false,
    });
  });

  it("builds stable read keys for derived notifications", () => {
    expect(buildNotificationReadKey("labs_system", "labs:hot-lead:conversation-1")).toBe(
      "labs_system:labs:hot-lead:conversation-1",
    );
  });
});
