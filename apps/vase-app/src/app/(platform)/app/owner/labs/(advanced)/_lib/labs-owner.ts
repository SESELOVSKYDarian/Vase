import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  buildLabsRequiredUrl,
  requireLabsOwnerAccess,
} from "@/lib/labs/access";
import { getLabsOwnerDashboard } from "@/server/queries/labs";

type LabsDashboard = NonNullable<Awaited<ReturnType<typeof getLabsOwnerDashboard>>>;

export async function getLabsOwnerPageData() {
  const { membership } = await requireLabsOwnerAccess();
  const dashboard = await getLabsOwnerDashboard(membership.tenantId);

  if (!dashboard) {
    redirect(buildLabsRequiredUrl() as Route);
  }

  return {
    membership,
    dashboard: dashboard as LabsDashboard,
    labsEnabled: true,
  };
}

export async function getLabsOwnerActivityData() {
  const { membership } = await requireLabsOwnerAccess();
  const dashboard = await getLabsOwnerDashboard(membership.tenantId);

  if (!dashboard) {
    redirect(buildLabsRequiredUrl() as Route);
  }

  return {
    membership,
    dashboard: dashboard as LabsDashboard,
    labsEnabled: true,
  };
}

export function readBusinessHours(input: unknown) {
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

export function trainingTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
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

export function channelTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
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

export function conversationTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "ESCALATED":
      return "warning";
    case "CLOSED":
      return "neutral";
    default:
      return "info";
  }
}

export function formatDate(value: Date | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
