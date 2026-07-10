import type { ReactNode } from "react";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { LabsOwnerMobileNav, LabsOwnerNav } from "./labs-owner-nav";

function tenantInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function planLabel(plan: string) {
  const labels: Record<string, string> = {
    STARTER: "Starter",
    GROWTH: "Growth",
    PRO: "Pro",
  };

  return labels[plan] ?? plan;
}

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

  const status = resolved.context.entitlement.status;
  const tenantName = resolved.context.tenantName;
  const initials = tenantInitials(tenantName) || "VL";
  const appUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://app.vase.ar";

  return (
    <div className="labs-app-shell overflow-x-hidden">
      <aside className="labs-app-sidebar fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col px-4 py-5 lg:flex" aria-label="Navegacion principal de Vase Labs">
        <div className="mb-7 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-strong)] text-[var(--accent-contrast)]">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">Vase Labs</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Centro IA</p>
          </div>
        </div>

        <LabsOwnerNav />

        <div className="mt-auto space-y-4 border-t border-[var(--border-subtle)] px-1 pt-5">
          <a
            href={`${appUrl}/app`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
          >
            <ArrowLeft className="size-4" />
            Volver al Panel de Vase
          </a>

          <div className="labs-theme-card">
            <div>
              <p>Estado</p>
              <strong>{status === "ACTIVE" || status === "TRIAL" ? "IA activa" : "IA pausada"}</strong>
            </div>
            <span>
              <Sparkles className="size-4" />
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--foreground)]">{tenantName}</p>
              <p className="truncate text-[11px] text-[var(--muted)]">{planLabel(resolved.context.entitlement.plan)}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen px-4 py-5 sm:px-6 lg:ml-72 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[96rem]">
          <div className="mb-6 grid gap-3 lg:hidden">
            <a
              href={`${appUrl}/app`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 text-sm font-semibold text-[var(--foreground)]"
            >
              <ArrowLeft className="size-4" />
              Volver al Panel de Vase
            </a>
          </div>
          <LabsOwnerMobileNav />
          {children}
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 border-b border-[var(--border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-soft)_70%,transparent),transparent)]" />
    </div>
  );
}
