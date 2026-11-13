import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../lib/db";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { LabsShell } from "./labs-shell";

export default async function LabsOwnerLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error) {
      const authErrors = [
        "LABS_SESSION_REQUIRED",
        "LABS_SESSION_INVALID",
        "LABS_SESSION_EXPIRED",
        "LABS_AUTH_SECRET_MISSING",
      ];
      if (authErrors.includes(error.message)) {
        redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs");
      }
      if (error.message === "LABS_TENANT_FORBIDDEN") {
        redirect("https://app.vase.ar/app?labs=required");
      }
    }
    redirect("https://app.vase.ar/app");
  }

  // Conversaciones que la IA pasó a una persona y siguen abiertas: el número rojo del menú.
  const needCount = await labsPrisma.conversation
    .count({
      where: {
        assistantId: resolved.assistant.id,
        status: { not: "CLOSED" },
        OR: [{ status: "ESCALATED" }, { escalatedToHuman: true }],
      },
    })
    .catch(() => 0);

  return (
    <LabsShell tenantName={resolved.context.tenantName} plan={resolved.context.entitlement.plan} needCount={needCount}>
      {children}
    </LabsShell>
  );
}
